"""AgentForge FastAPI Application"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import init_db, AsyncSessionLocal, DATABASE_URL
from .api import agents, chat, api_keys, public, settings, webhooks
from .settings_store import SettingsStore
from .utils.rate_limit import close_limiter, get_limiter

# Load environment variables
load_dotenv()

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting AgentForge...")
    logger.info(f"Environment: {os.getenv('ENV', 'development')}")

    # Initialize database
    await init_db()
    logger.info(f"Database ready ({DATABASE_URL.split('@')[-1]})")

    # Rate limiter backend (Redis when REDIS_URL is set)
    get_limiter()

    # Report provider configuration. These now live in the database and are
    # edited at /settings, so this is a snapshot, not a requirement check.
    async with AsyncSessionLocal() as db:
        config = await SettingsStore.resolve(db)

    if config.openrouter_api_key:
        logger.info(f"✓ OpenRouter configured ({config.openrouter_base_url})")
    else:
        logger.warning(
            "⚠️  No OpenRouter API key — hosted models unavailable. Add one under "
            "Settings, or use local Ollama models."
        )

    logger.info(f"✓ Ollama endpoint: {config.ollama_base_url}")
    logger.info(
        "✓ Embeddings: %s (via Ollama — OpenRouter has no embeddings endpoint; "
        "run `ollama pull %s`)",
        config.embedding_model,
        config.embedding_model,
    )

    logger.info("AgentForge is ready! 🚀")

    yield

    # Shutdown
    logger.info("Shutting down AgentForge...")
    await close_limiter()


# Create FastAPI app
app = FastAPI(
    title="AgentForge API",
    description="No-Code AI Agent Builder - Create conversational AI agents in minutes",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS.
# CORS_ORIGINS was previously declared everywhere but never read. When it is set
# we honour it; when it is not we fall back to "*" so that the embeddable widget
# keeps working from arbitrary third-party sites.
_cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
] or ["*"]

if _cors_origins == ["*"]:
    logger.warning(
        "CORS_ORIGINS is not set — accepting requests from any origin. "
        "Set it to a comma-separated allowlist before exposing this instance."
    )
else:
    logger.info(f"CORS restricted to: {', '.join(_cors_origins)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Include routers
app.include_router(agents.router)
app.include_router(chat.router)
app.include_router(api_keys.router)
app.include_router(public.router)
app.include_router(settings.router)
app.include_router(webhooks.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "AgentForge API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "agentforge",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("API_PORT", "8000"))
    host = os.getenv("API_HOST", "0.0.0.0")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=os.getenv("DEBUG", "False").lower() == "true",
    )
