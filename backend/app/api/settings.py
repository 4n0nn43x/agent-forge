"""Runtime settings, editable from the UI.

Replaces most of `.env`: provider credentials, endpoints, model names and upload
limits are stored in the database instead of the environment.
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_config
from ..settings_store import SettingsStore, RuntimeConfig
from ..agents.providers import check_ollama, check_openrouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    """Partial update. Only the keys present are written."""

    values: Dict[str, Any] = Field(..., description="setting key -> value")


@router.get("/")
async def get_settings(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """List settings, grouped for display. Secret values are masked."""
    described = await SettingsStore.describe(db)

    groups: Dict[str, List[Dict[str, Any]]] = {}
    for item in described:
        groups.setdefault(item["group"], []).append(item)

    return {"groups": [{"name": name, "settings": items} for name, items in groups.items()]}


@router.put("/")
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Update settings. Secrets left blank keep their stored value."""
    try:
        changed = await SettingsStore.save(db, payload.values)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info(f"Settings updated: {', '.join(changed) or 'none'}")
    described = await SettingsStore.describe(db)

    groups: Dict[str, List[Dict[str, Any]]] = {}
    for item in described:
        groups.setdefault(item["group"], []).append(item)

    return {
        "changed": changed,
        "groups": [{"name": name, "settings": items} for name, items in groups.items()],
    }


@router.get("/onboarding")
async def onboarding_state(
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
) -> Dict[str, Any]:
    """Everything the first-run flow needs, in one round trip.

    The flow has to decide what to show before the user has done anything, so it
    needs provider reachability, the model catalogue and whether any agent exists —
    fetching those separately would make the first screen flicker through states.
    """
    from sqlalchemy import func, select as sql_select

    from ..models import Agent
    from ..agents.providers import list_available_models

    agent_count = (await db.execute(sql_select(func.count(Agent.id)))).scalar() or 0

    openrouter = await check_openrouter(config)
    ollama = await check_ollama(config)
    catalogue = await list_available_models(config)

    return {
        # Explicitly dismissed, or there is already an agent — either way the user
        # is past first run and should not be sent back through it.
        "completed": bool(config.onboarding_completed) or agent_count > 0,
        "agent_count": agent_count,
        "embedding_model": config.embedding_model,
        "ollama_base_url": config.ollama_base_url,
        "openrouter": {**openrouter, "configured": bool(config.openrouter_api_key)},
        "ollama": ollama,
        # Document search runs on Ollama embeddings whatever the chat provider is,
        # which is the one thing about this setup that surprises people.
        "rag_ready": bool(ollama.get("ok") and ollama.get("embedding_model_ready")),
        "providers": catalogue["providers"],
    }


@router.post("/onboarding/complete")
async def complete_onboarding(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Mark first-run setup as done so the flow stops appearing."""
    await SettingsStore.save(db, {"onboarding_completed": True})
    return {"completed": True}


@router.post("/test")
async def test_settings(config: RuntimeConfig = Depends(get_config)) -> Dict[str, Any]:
    """Check that the configured providers actually answer.

    Runs against the *saved* settings, so save before testing.
    """
    openrouter = await check_openrouter(config)
    ollama = await check_ollama(config)

    return {
        "openrouter": openrouter,
        "ollama": ollama,
        # Document search is unusable without Ollama embeddings, whatever the
        # chat provider is.
        "rag_ready": bool(ollama.get("ok") and ollama.get("embedding_model_ready")),
    }
