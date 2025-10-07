"""AgentForge FastAPI Application"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import init_db
from .api import agents, chat, api_keys, public

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

    # Verify at least one LLM API key is set
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))

    if not has_openai and not has_anthropic:
        logger.warning(
            "⚠️  No LLM API keys found! Please set OPENAI_API_KEY or ANTHROPIC_API_KEY"
        )
    else:
        if has_openai:
            logger.info("✓ OpenAI API key configured")
        if has_anthropic:
            logger.info("✓ Anthropic API key configured")

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
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router)
app.include_router(chat.router)
app.include_router(api_keys.router)
app.include_router(public.router)


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
