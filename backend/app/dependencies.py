"""Shared, process-wide singletons and request dependencies.

The vector store and RAG engine used to be instantiated at module import time in
both `api/chat.py` and `api/public.py`, which opened two ChromaDB clients on the
same directory. They now live here and are created once, lazily.
"""

import os
import logging
from functools import lru_cache

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .settings_store import SettingsStore, RuntimeConfig
from .utils.vector_store import VectorStore
from .agents.rag_engine import RAGEngine
from .agents.agent_manager import AgentManager

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    return VectorStore(
        persist_directory=os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_data")
    )


@lru_cache(maxsize=1)
def get_rag_engine() -> RAGEngine:
    return RAGEngine()


@lru_cache(maxsize=1)
def get_agent_manager() -> AgentManager:
    return AgentManager(vector_store=get_vector_store(), rag_engine=get_rag_engine())


async def get_config(db: AsyncSession = Depends(get_db)) -> RuntimeConfig:
    """Resolve the runtime settings for this request (cached for a few seconds)."""
    return await SettingsStore.resolve(db)
