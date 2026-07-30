"""Sliding-window rate limiter for public API keys.

The `rate_limit` column on APIKey (requests per hour) was stored and displayed
but never enforced, so any leaked key granted unlimited LLM spend. This closes
that gap.

Two backends:

- **Redis** (when ``REDIS_URL`` is set) — a sorted set per key, trimmed to the
  window. Correct across multiple uvicorn workers and across restarts.
- **In-process** (fallback) — same algorithm in a dict. Fine for the
  single-container deployment AgentForge ships with, but each worker gets its own
  counters, so the effective limit is multiplied by the worker count.
"""

import os
import time
import asyncio
import logging
from collections import defaultdict, deque
from typing import Deque, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

WINDOW_SECONDS = 3600


class InMemoryRateLimiter:
    """Sliding window kept in this process's memory."""

    backend = "memory"

    def __init__(self, window_seconds: int = WINDOW_SECONDS):
        self.window_seconds = window_seconds
        self._hits: Dict[int, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, key_id: int, limit: int) -> Tuple[bool, int, int]:
        if limit <= 0:
            return True, -1, 0

        now = time.monotonic()
        cutoff = now - self.window_seconds

        async with self._lock:
            hits = self._hits[key_id]
            while hits and hits[0] < cutoff:
                hits.popleft()

            if len(hits) >= limit:
                retry_after = max(1, int(hits[0] + self.window_seconds - now))
                return False, 0, retry_after

            hits.append(now)
            return True, limit - len(hits), 0

    async def reset(self, key_id: int) -> None:
        async with self._lock:
            self._hits.pop(key_id, None)


class RedisRateLimiter:
    """Sliding window in a Redis sorted set, shared by every worker."""

    backend = "redis"

    def __init__(self, url: str, window_seconds: int = WINDOW_SECONDS):
        import redis.asyncio as aioredis

        self.window_seconds = window_seconds
        self._redis = aioredis.from_url(url, encoding="utf-8", decode_responses=True)
        self._fallback = InMemoryRateLimiter(window_seconds)

    def _key(self, key_id: int) -> str:
        return f"agentforge:ratelimit:apikey:{key_id}"

    async def check(self, key_id: int, limit: int) -> Tuple[bool, int, int]:
        if limit <= 0:
            return True, -1, 0

        now = time.time()
        cutoff = now - self.window_seconds
        redis_key = self._key(key_id)

        try:
            pipe = self._redis.pipeline()
            pipe.zremrangebyscore(redis_key, 0, cutoff)
            pipe.zcard(redis_key)
            _, used = await pipe.execute()

            if used >= limit:
                oldest = await self._redis.zrange(redis_key, 0, 0, withscores=True)
                retry_after = 1
                if oldest:
                    retry_after = max(1, int(oldest[0][1] + self.window_seconds - now))
                return False, 0, retry_after

            pipe = self._redis.pipeline()
            # Score and member both carry the timestamp; the member needs to be
            # unique so concurrent requests don't collapse into one entry.
            pipe.zadd(redis_key, {f"{now}:{os.urandom(4).hex()}": now})
            pipe.expire(redis_key, self.window_seconds)
            await pipe.execute()

            return True, max(0, limit - used - 1), 0

        except Exception as e:
            # A Redis outage must not take the API down; degrade to local counting.
            logger.warning(f"Redis rate limiter unavailable, falling back in-process: {e}")
            return await self._fallback.check(key_id, limit)

    async def reset(self, key_id: int) -> None:
        try:
            await self._redis.delete(self._key(key_id))
        except Exception as e:
            logger.warning(f"Could not reset Redis rate limit for key {key_id}: {e}")
        await self._fallback.reset(key_id)

    async def close(self) -> None:
        try:
            await self._redis.aclose()
        except Exception:
            pass


_limiter: Optional[object] = None


def get_limiter():
    """Build the limiter once, choosing a backend from REDIS_URL."""
    global _limiter
    if _limiter is None:
        url = os.getenv("REDIS_URL", "").strip()
        if url:
            try:
                _limiter = RedisRateLimiter(url)
                logger.info(f"Rate limiter backend: Redis ({url.split('@')[-1]})")
            except Exception as e:
                logger.error(f"Could not initialise Redis rate limiter ({e}); using in-process")
                _limiter = InMemoryRateLimiter()
        else:
            _limiter = InMemoryRateLimiter()
            logger.info("Rate limiter backend: in-process (set REDIS_URL to share across workers)")
    return _limiter


async def close_limiter() -> None:
    global _limiter
    if _limiter is not None and hasattr(_limiter, "close"):
        await _limiter.close()
    _limiter = None
