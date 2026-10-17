"""Admin authentication.

There is one admin account. On a fresh install nobody can create it except
whoever can read the container logs: a one-time setup token is printed there at
startup (the Jupyter approach). "First visitor becomes admin" would let a scanner
claim an exposed instance before its owner does.

Sessions are a random token in an HttpOnly cookie, stored hashed in the database
so a logout really ends them. Requests that change state must come from the
app's own origin (Sec-Fetch-Site, falling back to Origin), which is the CSRF
defence: the admin API sends no CORS headers, so no other site can read it either.
"""

import os
import time
import asyncio
import hmac
import hashlib
import secrets
import logging
from collections import defaultdict, deque
from datetime import timedelta
from typing import Deque, Dict, Optional
from urllib.parse import urlparse

from fastapi import Depends, HTTPException, Request, Response, status
from pwdlib import PasswordHash
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import User, UserSession
from .utils.timeutils import utcnow

logger = logging.getLogger(__name__)

COOKIE_NAME = "agentforge_session"
# A session ends after a week without use, and after 30 days in any case.
IDLE_TIMEOUT = timedelta(days=7)
ABSOLUTE_TIMEOUT = timedelta(days=30)

MIN_PASSWORD_LENGTH = 8

_hasher = PasswordHash.recommended()  # Argon2id
# Verified when the username is unknown, so the response time doesn't reveal
# which usernames exist.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


# Argon2 is deliberately slow (~75 ms): run it in a thread, or a handful of
# login attempts per second would stall every other request, widget included.
async def hash_password(password: str) -> str:
    return await asyncio.to_thread(_hasher.hash, password)


async def verify_password(password: str, password_hash: Optional[str]) -> bool:
    if password_hash is None:
        await asyncio.to_thread(_hasher.verify, password, _DUMMY_HASH)
        return False
    return await asyncio.to_thread(_hasher.verify, password, password_hash)


def validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Use at least {MIN_PASSWORD_LENGTH} characters.")


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# --------------------------------------------------------------------- setup

# ponytail: held in this process, fine for the single uvicorn worker the image
# runs; with several workers each would print its own token. Move it to the
# database if that ever changes.
_setup_token: Optional[str] = None


async def admin_exists(db: AsyncSession) -> bool:
    return bool((await db.execute(select(func.count(User.id)))).scalar())


async def bootstrap(db: AsyncSession) -> None:
    """At startup: seed the admin from the environment, or print a setup link."""
    global _setup_token
    _setup_token = None

    if await admin_exists(db):
        return

    username = os.getenv("ADMIN_USERNAME", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "")
    if username and password:
        if len(password) < MIN_PASSWORD_LENGTH:
            logger.error(
                f"ADMIN_PASSWORD is shorter than {MIN_PASSWORD_LENGTH} characters; "
                "ignoring it and falling back to the setup link."
            )
        else:
            db.add(User(id=1, username=username, password_hash=await hash_password(password)))
            await db.commit()
            logger.info(f"Admin account '{username}' created from ADMIN_USERNAME/ADMIN_PASSWORD")
            return

    # A new token on every start while the instance is unclaimed.
    _setup_token = secrets.token_urlsafe(32)
    logger.warning(
        "\n" + "=" * 72 + "\n"
        "  No admin account yet. To create it, open:\n\n"
        f"    http://<this host>:3000/setup?token={_setup_token}\n\n"
        "  (e.g. http://localhost:3000/setup?token=...). The link works once,\n"
        "  and a new one is printed at each restart until setup is done.\n"
        + "=" * 72
    )


def check_setup_token(token: str) -> bool:
    return _setup_token is not None and hmac.compare_digest(token or "", _setup_token)


def close_setup() -> None:
    global _setup_token
    _setup_token = None


# ------------------------------------------------------------ login throttle

class LoginThrottle:
    """Sliding-window count of login attempts, per (username, IP) and per IP.

    Keyed on the pair rather than the username alone: with one admin account and
    a known username, a per-username lock would let anyone keep the owner out
    forever with five bad passwords every quarter hour. Temporary for the same
    reason.

    Attempts are counted when they start, not when they fail: counting failures
    after the password check let a burst of parallel requests all slip past.
    """

    WINDOW_SECONDS = 15 * 60
    MAX_PER_USERNAME = 5   # per username, from one IP
    MAX_PER_IP = 20

    def __init__(self):
        self._attempts: Dict[str, Deque[float]] = defaultdict(deque)

    def _keys(self, username: str, ip: str):
        return ((f"u:{username}@{ip}", self.MAX_PER_USERNAME), (f"ip:{ip}", self.MAX_PER_IP))

    def _recent(self, key: str, now: float) -> Deque[float]:
        hits = self._attempts[key]
        while hits and hits[0] < now - self.WINDOW_SECONDS:
            hits.popleft()
        return hits

    def try_attempt(self, username: str, ip: str) -> int:
        """Count an attempt. Returns 0 if allowed, else the seconds to wait.

        Synchronous on purpose: no await between the check and the count.
        """
        now = time.monotonic()
        wait = 0
        for key, limit in self._keys(username, ip):
            hits = self._recent(key, now)
            if len(hits) >= limit:
                wait = max(wait, int(hits[0] + self.WINDOW_SECONDS - now) + 1)
        if wait:
            return wait
        for key, _ in self._keys(username, ip):
            self._attempts[key].append(now)
        # Forget keys that have gone quiet, so new usernames don't pile up.
        for key in [k for k, hits in self._attempts.items() if not self._recent(k, now)]:
            del self._attempts[key]
        return 0

    def succeeded(self, username: str, ip: str) -> None:
        """A good password clears that account's count from this IP."""
        self._attempts.pop(f"u:{username}@{ip}", None)


throttle = LoginThrottle()


def client_ip(request: Request) -> str:
    # uvicorn has already applied X-Forwarded-For from the trusted local nginx.
    return request.client.host if request.client else "unknown"


# ------------------------------------------------------------------ sessions

async def start_session(db: AsyncSession, request: Request, response: Response, user: User) -> None:
    """Issue a fresh session token (never reuse one: that would allow fixation)."""
    token = secrets.token_urlsafe(32)
    # Expired sessions are otherwise only removed when their cookie comes back.
    now = utcnow()
    await db.execute(
        delete(UserSession).where(
            (UserSession.last_seen_at < now - IDLE_TIMEOUT)
            | (UserSession.created_at < now - ABSOLUTE_TIMEOUT)
        )
    )
    db.add(UserSession(token_hash=_digest(token), user_id=user.id))
    await db.commit()
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=int(ABSOLUTE_TIMEOUT.total_seconds()),
        httponly=True,
        samesite="lax",
        # Secure whenever the browser reached us over HTTPS, including through a
        # reverse proxy (nginx forwards the scheme). Plain HTTP on a LAN would
        # otherwise drop the cookie and make login impossible.
        secure=request.url.scheme == "https",
        path="/",
    )


async def end_session(db: AsyncSession, request: Request, response: Response) -> None:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        await db.execute(delete(UserSession).where(UserSession.token_hash == _digest(token)))
        await db.commit()
    response.delete_cookie(COOKIE_NAME, path="/")


async def end_other_sessions(db: AsyncSession, request: Request, user: User) -> int:
    current = _digest(request.cookies.get(COOKIE_NAME, ""))
    result = await db.execute(
        delete(UserSession).where(UserSession.user_id == user.id, UserSession.token_hash != current)
    )
    await db.commit()
    return result.rowcount or 0


async def current_user(request: Request, db: AsyncSession) -> Optional[User]:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None

    session = (
        await db.execute(select(UserSession).where(UserSession.token_hash == _digest(token)))
    ).scalar_one_or_none()
    if session is None:
        return None

    now = utcnow()
    if now - session.last_seen_at > IDLE_TIMEOUT or now - session.created_at > ABSOLUTE_TIMEOUT:
        await db.delete(session)
        await db.commit()
        return None

    # One write a minute at most, not one per request.
    if now - session.last_seen_at > timedelta(minutes=1):
        session.last_seen_at = now
        await db.commit()

    return await db.get(User, session.user_id)


# ---------------------------------------------------------------------- CSRF

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def require_same_origin(request: Request) -> None:
    """Reject state-changing requests sent by another site."""
    if request.method not in UNSAFE_METHODS:
        return

    site = request.headers.get("sec-fetch-site")
    if site is not None:
        if site in ("same-origin", "none"):
            return
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-site request refused")

    # Browsers without Fetch Metadata still send Origin on these requests.
    origin = request.headers.get("origin")
    if origin is not None:
        if origin != "null" and urlparse(origin).netloc == request.headers.get("host"):
            return
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-site request refused")

    # Neither header: not a browser (curl, scripts), so not a CSRF vector.


async def require_admin(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """Dependency guarding every admin route."""
    require_same_origin(request)
    user = await current_user(request, db)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user
