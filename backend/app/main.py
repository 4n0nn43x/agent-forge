"""AgentForge FastAPI Application"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import init_db
from .api import agents, chat, api_keys, public, webhooks

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
    logger.info("Database initialized")

    # Verify at least one LLM provider is configured
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))
    has_ollama = bool(os.getenv("OLLAMA_BASE_URL"))
    has_lmstudio = bool(os.getenv("LMSTUDIO_BASE_URL"))
    has_localai = bool(os.getenv("LOCALAI_BASE_URL"))

    llm_providers = []
    if has_openai:
        llm_providers.append("OpenAI")
    if has_anthropic:
        llm_providers.append("Anthropic")
    if has_ollama:
        llm_providers.append("Ollama")
    if has_lmstudio:
        llm_providers.append("LM Studio")
    if has_localai:
        llm_providers.append("LocalAI")

    if not llm_providers:
        logger.warning(
            "⚠️  No LLM providers configured! Please set at least one:\n"
            "   - OPENAI_API_KEY for OpenAI models\n"
            "   - ANTHROPIC_API_KEY for Anthropic models\n"
            "   - OLLAMA_BASE_URL for Ollama (local/free models)\n"
            "   - LMSTUDIO_BASE_URL for LM Studio\n"
            "   - LOCALAI_BASE_URL for LocalAI"
        )
    else:
        logger.info(f"✓ LLM Providers configured: {', '.join(llm_providers)}")

    logger.info("AgentForge is ready! 🚀")

    yield

    # Shutdown
    logger.info("Shutting down AgentForge...")


# Create FastAPI app
app = FastAPI(
    title="AgentForge API",
    description="No-Code AI Agent Builder - Create conversational AI agents in minutes",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
# In development, allow common localhost origins. In production, use CORS_ORIGINS env var
env = os.getenv("ENV", "development")
if env == "development":
    # Allow all common localhost ports for development
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
    ]
else:
    cors_origins = os.getenv("CORS_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
    max_age=3600,
)

# Include routers
app.include_router(agents.router)
app.include_router(chat.router)
app.include_router(api_keys.router)
app.include_router(public.router)
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
