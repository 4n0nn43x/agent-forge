"""Checks for the security and robustness fixes.

    cd backend && python -m tests.test_hardening      (or: pytest tests/)

Needs no network, no Ollama and no LLM: everything runs against an in-memory
SQLite database, a temporary Chroma directory and a local HTTP server.
"""

import os
import asyncio
import tempfile
import ipaddress

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
_tmp = tempfile.mkdtemp()
os.environ["CHROMA_PERSIST_DIRECTORY"] = os.path.join(_tmp, "chroma")
os.environ["SECRET_KEY_FILE"] = os.path.join(_tmp, "secret.key")

from aiohttp import web  # noqa: E402
from chromadb.api.types import EmbeddingFunction  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.database import AsyncSessionLocal, init_db  # noqa: E402
from app.models import Agent, APIKey, Webhook, WebhookLog  # noqa: E402
from app.api.api_keys import hash_api_key, hash_legacy_keys  # noqa: E402
from app.api.public import verify_api_key  # noqa: E402
from app.utils.vector_store import VectorStore, EmbeddingModelMismatch  # noqa: E402
from app.utils.webhook_service import (  # noqa: E402
    WebhookService,
    _non_public,
    _PublicOnlyResolver,
)


class FakeEF(EmbeddingFunction):
    def __init__(self, model, dim=4):
        self.model, self.dim = model, dim

    def __call__(self, input):
        return [[float(len(t))] * self.dim for t in input]

    def name(self):
        return f"langchain-{self.model}"


def test_non_public_addresses():
    for addr in ["127.0.0.1", "10.1.2.3", "169.254.169.254", "100.64.0.1", "::1", "::ffff:127.0.0.1", "0.0.0.0"]:
        assert _non_public(ipaddress.ip_address(addr)), addr
    assert not _non_public(ipaddress.ip_address("8.8.8.8"))


def test_resolver_rejects_loopback():
    async def run():
        try:
            await _PublicOnlyResolver().resolve("localhost", 80)
        except OSError:
            return
        raise AssertionError("localhost was resolved")

    asyncio.run(run())


def test_embedding_model_mismatch():
    store = VectorStore(os.environ["CHROMA_PERSIST_DIRECTORY"])
    store.add_documents(1, ["alpha"], [{"i": 0}], ["a"], embedding_function=FakeEF("m1"))

    # Same width, different model: Chroma alone would answer with unrelated chunks.
    try:
        store.query(1, "alpha", 1, embedding_function=FakeEF("m2"))
    except EmbeddingModelMismatch:
        pass
    else:
        raise AssertionError("model change went unnoticed")

    assert store.query(1, "alpha", 1, embedding_function=FakeEF("m1"))["documents"] == [["alpha"]]


async def _api_keys_and_webhooks():
    await init_db()
    async with AsyncSessionLocal() as db:
        agent = Agent(name="t", llm_model="llama3.2", system_prompt="s")
        db.add(agent)
        await db.commit()

        # A key stored in plaintext before hashing existed is upgraded at startup.
        db.add(APIKey(agent_id=agent.id, key="af_legacy", name="old"))
        await db.commit()
        assert await hash_legacy_keys(db) == 1
        assert await hash_legacy_keys(db) == 0
        stored = (await db.execute(select(APIKey))).scalar_one()
        assert stored.key == hash_api_key("af_legacy")

        got_agent, _ = await verify_api_key("Bearer af_legacy", None, db)
        assert got_agent.id == agent.id
        try:
            await verify_api_key(f"Bearer {stored.key}", None, db)
        except HTTPException as e:
            assert e.status_code == 401  # the digest itself is not a key
        else:
            raise AssertionError("the stored digest authenticated")

        # A redirect must not be followed: its target was never validated.
        hits = []

        async def redirect(_):
            raise web.HTTPFound("/secret")

        async def secret(_):
            hits.append(1)
            return web.Response(text="metadata")

        app = web.Application()
        app.router.add_post("/hook", redirect)
        app.router.add_route("*", "/secret", secret)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "127.0.0.1", 0)
        await site.start()
        port = site._server.sockets[0].getsockname()[1]

        hook = Webhook(agent_id=agent.id, name="h", url=f"http://127.0.0.1:{port}/hook",
                       events="message.sent", retry_count=0)
        db.add(hook)
        await db.commit()
        # allow_private only so the test can reach its own local server.
        assert not await WebhookService.deliver_webhook(db, hook, "message.sent", {}, allow_private=True)
        await runner.cleanup()

        assert hits == [], "redirect was followed"
        log = (await db.execute(select(WebhookLog))).scalar_one()
        assert log.status_code == 302


def test_api_keys_and_webhooks():
    asyncio.run(_api_keys_and_webhooks())


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
