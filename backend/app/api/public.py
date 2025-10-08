"""Public API endpoints for external integrations"""

import os
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from ..database import get_db
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
from ..agents.agent_manager import AgentManager
from ..utils.vector_store import VectorStore
from ..agents.rag_engine import RAGEngine

logger = logging.getLogger(__name__)

# Initialize components (same as in chat.py)
vector_store = VectorStore(
    persist_directory=os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_data")
)
rag_engine = RAGEngine(
    embedding_model=os.getenv("EMBEDDING_MODEL", "sentence-transformers")
)
agent_manager = AgentManager(vector_store=vector_store, rag_engine=rag_engine)

router = APIRouter(prefix="/api/v1/public", tags=["Public API"])


async def verify_api_key(
    authorization: Optional[str] = Header(None, description="Bearer <api_key>"),
    db: AsyncSession = Depends(get_db),
) -> tuple[Agent, APIKey]:
    """Verify API key and return associated agent"""
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

    api_key = authorization.replace("Bearer ", "")

    # Find API key in database
    from sqlalchemy import select
    result = await db.execute(select(APIKey).filter(APIKey.key == api_key))
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

    # Update last used timestamp
    db_api_key.last_used_at = datetime.utcnow()
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
    auth_data: tuple[Agent, APIKey] = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the agent (Public API)

    Requires API key authentication via Authorization header:
    Authorization: Bearer af_xxxxxxxxxxxxx
    """
    agent, api_key = auth_data

    try:
        # Use agent_manager.chat() - mark as widget source to separate from platform conversations
        result = await agent_manager.chat(
            db=db,
            agent_id=agent.id,
            message=message_data.message,
            conversation_id=message_data.conversation_id,
            source="widget",
        )

        return ChatResponse(
            response=result["response"],
            conversation_id=result["conversation_id"],
            tokens_used=result.get("tokens_used"),
            sources=result.get("sources"),
        )

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
        conversations = await agent_manager.get_conversations(db, agent.id, source="widget")

        # Build response with message counts
        from sqlalchemy import select, func
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
        messages = await agent_manager.get_conversation_messages(db, conversation_id)

        # Verify conversation belongs to the authenticated agent
        from sqlalchemy import select
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

        return [
            MessageResponse(
                role=msg.role,
                content=msg.content,
                timestamp=msg.timestamp,
                tokens_used=msg.tokens_used,
            )
            for msg in messages
        ]

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
