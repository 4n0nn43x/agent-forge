"""API Key management endpoints"""

import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from ..database import get_db
from ..models import (
    Agent,
    APIKey,
    APIKeyCreate,
    APIKeyResponse,
)

router = APIRouter(prefix="/api/agents/{agent_id}/api-keys", tags=["API Keys"])


def generate_api_key() -> str:
    """Generate a secure API key"""
    return f"af_{secrets.token_urlsafe(32)}"


def hash_api_key(key: str) -> str:
    """Only this digest is stored, so a database dump does not leak usable keys.

    A plain SHA-256 is enough: the keys carry 256 random bits, nothing to brute-force.
    """
    return hashlib.sha256(key.encode()).hexdigest()


def key_response(api_key: APIKey, plaintext: str = None) -> APIKeyResponse:
    """The stored digest is never returned; the key itself only once, at creation."""
    return APIKeyResponse.model_validate(api_key).model_copy(update={"key": plaintext})


async def hash_legacy_keys(db: AsyncSession) -> int:
    """Replace keys stored in plaintext (before hashing existed) by their digest.

    Runs at startup and is idempotent: a digest is hex and never starts with "af_".
    """
    result = await db.execute(select(APIKey).filter(APIKey.key.startswith("af_")))
    legacy = result.scalars().all()
    for api_key in legacy:
        api_key.key = hash_api_key(api_key.key)
    await db.commit()
    return len(legacy)


@router.post("/", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    agent_id: int,
    api_key_data: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key for an agent"""
    # Verify agent exists
    result = await db.execute(select(Agent).filter(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with id {agent_id} not found",
        )

    # Generate unique API key
    key = generate_api_key()

    # Create API key
    db_api_key = APIKey(
        agent_id=agent_id,
        key=hash_api_key(key),
        name=api_key_data.name,
        rate_limit=api_key_data.rate_limit,
        allowed_origins=api_key_data.allowed_origins,
    )

    db.add(db_api_key)
    await db.commit()
    await db.refresh(db_api_key)

    return key_response(db_api_key, plaintext=key)


@router.get("/", response_model=List[APIKeyResponse])
async def list_api_keys(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
):
    """List all API keys for an agent"""
    # Verify agent exists
    result = await db.execute(select(Agent).filter(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with id {agent_id} not found",
        )

    result = await db.execute(select(APIKey).filter(APIKey.agent_id == agent_id))
    return [key_response(api_key) for api_key in result.scalars().all()]


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    agent_id: int,
    api_key_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete an API key"""
    result = await db.execute(
        select(APIKey).filter(APIKey.id == api_key_id, APIKey.agent_id == agent_id)
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    await db.delete(api_key)
    await db.commit()

    return None


@router.patch("/{api_key_id}/toggle", response_model=APIKeyResponse)
async def toggle_api_key(
    agent_id: int,
    api_key_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable an API key"""
    result = await db.execute(
        select(APIKey).filter(APIKey.id == api_key_id, APIKey.agent_id == agent_id)
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    api_key.is_active = 1 if api_key.is_active == 0 else 0
    await db.commit()
    await db.refresh(api_key)

    return key_response(api_key)
