"""Public API endpoints for external integrations"""

import logging
from urllib.parse import urlparse
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List

from ..database import get_db
from ..dependencies import get_agent_manager, get_config
from ..settings_store import RuntimeConfig
from ..models import (
    Agent,
    APIKey,
    Conversation,
    Message,
    ChatMessage,
    ChatResponse,
    ConversationResponse,
    MessageResponse,
)
from ..utils.rate_limit import get_limiter
from ..utils.timeutils import utcnow
from .api_keys import hash_api_key
from .chat import queue_chat_webhooks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/public", tags=["Public API"])


def _origin_allowed(allowed_origins: Optional[str], origin: Optional[str]) -> bool:
    """Check a request Origin against the key's allowlist.

    An empty allowlist means "any origin". Entries are compared on scheme+host
    +port; a leading "*." matches subdomains.
    """
    entries = [o.strip() for o in (allowed_origins or "").split(",") if o.strip()]
    if not entries or "*" in entries:
        return True

    # Non-browser clients (curl, servers) send no Origin header. The allowlist is
    # a browser-side control, so we only enforce it when an Origin is present.
    if not origin:
        return True

    request_host = urlparse(origin).netloc.lower() or origin.lower()

    for entry in entries:
        candidate = entry.lower()
        candidate_host = urlparse(candidate).netloc or candidate
        if candidate_host.startswith("*."):
            if request_host == candidate_host[2:] or request_host.endswith(candidate_host[1:]):
                return True
        elif request_host == candidate_host:
            return True

    return False


async def verify_api_key(
    authorization: Optional[str] = Header(None, description="Bearer <api_key>"),
    origin: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> tuple[Agent, APIKey]:
    """Verify API key, enforce its origin allowlist and rate limit."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header. Use: Authorization: Bearer <api_key>",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use: Bearer <api_key>",
        )

    api_key = authorization[len("Bearer "):].strip()

    # Find API key in database
    result = await db.execute(select(APIKey).filter(APIKey.key == hash_api_key(api_key)))
    db_api_key = result.scalar_one_or_none()

    if not db_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    if db_api_key.is_active == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key is disabled",
        )

    if not _origin_allowed(db_api_key.allowed_origins, origin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Origin '{origin}' is not allowed for this API key",
        )

    allowed, remaining, retry_after = await get_limiter().check(
        db_api_key.id, db_api_key.rate_limit
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit of {db_api_key.rate_limit} requests/hour exceeded",
            headers={"Retry-After": str(retry_after)},
        )

    # Update last used timestamp
    db_api_key.last_used_at = utcnow()
    await db.commit()

    # Get agent
    result = await db.execute(select(Agent).filter(Agent.id == db_api_key.agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    return agent, db_api_key


@router.post("/chat", response_model=ChatResponse)
async def public_chat(
    message_data: ChatMessage,
    background_tasks: BackgroundTasks,
    auth_data: tuple[Agent, APIKey] = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
):
    """
    Send a message to the agent (Public API)

    Requires API key authentication via Authorization header:
    Authorization: Bearer af_xxxxxxxxxxxxx
    """
    agent, api_key = auth_data

    try:
        # Use agent_manager.chat() - mark as widget source to separate from platform conversations
        result = await get_agent_manager().chat(
            db=db,
            agent_id=agent.id,
            message=message_data.message,
            conversation_id=message_data.conversation_id,
            source="widget",
            config=config,
        )

        # Webhooks still carry the sources: they go to the operator's own systems.
        queue_chat_webhooks(
            background_tasks, agent.id, message_data.message, result, source="widget"
        )

        # Source citations name internal documents and carry retrieval scores.
        # That is useful on the operator's dashboard and revealing to an anonymous
        # visitor, so the public response omits them unless explicitly enabled.
        # Hiding them only in the widget would be cosmetic — the filenames would
        # still be sitting in the JSON for anyone with a network tab.
        return ChatResponse(
            response=result["response"],
            conversation_id=result["conversation_id"],
            tokens_used=result.get("tokens_used"),
            sources=result.get("sources") if config.public_api_expose_sources else None,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in public chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating response: {str(e)}",
        )


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    auth_data: tuple[Agent, APIKey] = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """List all widget/public API conversations for the authenticated agent"""
    agent, _ = auth_data

    try:
        # Only return widget conversations for public API
        conversations = await get_agent_manager().get_conversations(db, agent.id, source="widget")

        # Build response with message counts
        result = []
        for conv in conversations:
            # Count messages for this conversation
            msg_count_result = await db.execute(
                select(func.count(Message.id)).where(Message.conversation_id == conv.id)
            )
            msg_count = msg_count_result.scalar() or 0

            result.append(
                ConversationResponse(
                    id=conv.id,
                    conversation_id=conv.conversation_id,
                    title=conv.title,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    message_count=msg_count,
                )
            )

        return result

    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail="Error listing conversations")


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    auth_data: tuple[Agent, APIKey] = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages in a conversation"""
    agent, _ = auth_data

    try:
        # Verify the conversation belongs to the authenticated agent *before*
        # reading its messages.
        result = await db.execute(
            select(Conversation).filter(
                Conversation.conversation_id == conversation_id,
                Conversation.agent_id == agent.id,
            )
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        messages = await get_agent_manager().get_conversation_messages(db, conversation_id)

        return [
            MessageResponse(
                role=msg.role,
                content=msg.content,
                timestamp=msg.timestamp,
                tokens_used=msg.tokens_used,
            )
            for msg in messages
        ]

    except HTTPException:
        # A 404 raised above must not be rewritten as a 500 by the handler below.
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Error getting messages")


@router.get("/agent", response_model=dict)
async def get_agent_info(
    auth_data: tuple[Agent, APIKey] = Depends(verify_api_key),
):
    """Get information about the authenticated agent"""
    agent, api_key = auth_data

    return {
        "id": agent.id,
        "name": agent.name,
        "description": agent.description,
        "personality": agent.personality,
        "api_key_name": api_key.name,
        "rate_limit": api_key.rate_limit,
    }
