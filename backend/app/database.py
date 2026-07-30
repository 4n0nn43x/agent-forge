"""Database configuration and session management"""

from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool, NullPool
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./agentforge.db")

_IS_SQLITE = DATABASE_URL.startswith("sqlite")
_IS_MEMORY = _IS_SQLITE and (":memory:" in DATABASE_URL or "mode=memory" in DATABASE_URL)

engine_kwargs = {
    "echo": os.getenv("DEBUG", "False").lower() == "true",
}

if _IS_SQLITE:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    # StaticPool hands the *same* connection to every session, so concurrent
    # requests interleave their transactions. It is only appropriate for
    # in-memory databases, where a fresh connection would mean a fresh (empty)
    # database. File-backed SQLite gets a connection per checkout instead.
    engine_kwargs["poolclass"] = StaticPool if _IS_MEMORY else NullPool

# Create async engine
engine = create_async_engine(DATABASE_URL, **engine_kwargs)

if _IS_SQLITE and not _IS_MEMORY:

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record):
        """WAL lets readers run alongside a writer; busy_timeout avoids
        immediate 'database is locked' errors under concurrency."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def get_db():
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
