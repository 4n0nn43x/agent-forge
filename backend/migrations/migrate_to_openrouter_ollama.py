"""Migration: OpenAI/Anthropic -> OpenRouter/Ollama.

Two things change in a way existing data can't survive:

1. **Model ids.** Agents stored bare ids like "gpt-4" or "claude-3-opus-20240229".
   Those now resolve to Ollama tags (no slash) and would fail at chat time. They
   are rewritten to their OpenRouter equivalents.

2. **Embeddings.** Vectors were produced by OpenAI text-embedding-ada-002 (1536
   dimensions); they are now produced by an Ollama model (nomic-embed-text is
   768). ChromaDB rejects a query whose vector width doesn't match the
   collection, so old collections are unusable and are dropped. The source text
   only ever lived in ChromaDB, so **documents must be re-uploaded** — the
   matching `documents` rows are removed to keep the UI honest about that.

Usage (from the backend/ directory):

    python -m migrations.migrate_to_openrouter_ollama          # apply
    python -m migrations.migrate_to_openrouter_ollama --dry-run
"""

import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, delete  # noqa: E402

from app.database import AsyncSessionLocal, init_db  # noqa: E402
from app.models import Agent, Document  # noqa: E402
from app.utils.vector_store import VectorStore  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("migrate")

# Legacy bare model id -> OpenRouter id
MODEL_MAP = {
    "gpt-4": "openai/gpt-4",
    "gpt-4-turbo": "openai/gpt-4-turbo",
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
    "claude-3-5-sonnet-20241022": "anthropic/claude-3.5-sonnet",
    "claude-3-opus-20240229": "anthropic/claude-3-opus",
    "claude-3-sonnet-20240229": "anthropic/claude-3-sonnet",
    "claude-3-haiku-20240307": "anthropic/claude-3-haiku",
}

FALLBACK_MODEL = os.getenv("DEFAULT_LLM_MODEL", "openai/gpt-4o-mini")


async def migrate(dry_run: bool = False) -> None:
    await init_db()

    async with AsyncSessionLocal() as db:
        agents = (await db.execute(select(Agent))).scalars().all()

        for agent in agents:
            current = (agent.llm_model or "").strip()
            if "/" in current:
                continue  # already an OpenRouter id

            new_model = MODEL_MAP.get(current)
            if not new_model:
                logger.warning(
                    f"Agent {agent.id} ('{agent.name}') uses unknown model "
                    f"'{current}' -> falling back to {FALLBACK_MODEL}"
                )
                new_model = FALLBACK_MODEL

            logger.info(f"Agent {agent.id} ('{agent.name}'): {current} -> {new_model}")
            if not dry_run:
                agent.llm_model = new_model

        documents = (await db.execute(select(Document))).scalars().all()
        agent_ids = sorted({doc.agent_id for doc in documents})

        if documents:
            logger.warning(
                f"Dropping {len(documents)} document record(s) across "
                f"{len(agent_ids)} agent(s): their embeddings were produced by a "
                "different model and cannot be reused. Re-upload the files."
            )

        if not dry_run:
            store = VectorStore(
                persist_directory=os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_data")
            )
            for agent_id in agent_ids:
                store.delete_agent_collection(agent_id, missing_ok=True)

            await db.execute(delete(Document))
            await db.commit()
            logger.info("Migration applied.")
        else:
            logger.info("Dry run — nothing was written.")


if __name__ == "__main__":
    asyncio.run(migrate(dry_run="--dry-run" in sys.argv))
