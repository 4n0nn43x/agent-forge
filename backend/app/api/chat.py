"""API routes for chat and document management"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import logging

from ..database import get_db
from ..dependencies import get_agent_manager, get_config
from ..settings_store import RuntimeConfig
from ..models import (
    Message,
    ChatMessage,
    ChatResponse,
    DocumentUpload,
    ConversationResponse,
    MessageResponse,
)
from ..utils.vector_store import EmbeddingModelMismatch
from ..utils.webhook_service import WebhookService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["chat"])


@router.post("/{agent_id}/documents", response_model=DocumentUpload)
async def upload_document(
    agent_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
):
    """Upload a document to agent's knowledge base"""
    agent_manager = get_agent_manager()
    try:
        # Validate file size (limit configured in Settings). Read one byte past the
        # limit so an oversized upload is detected without loading all of it.
        content = await file.read(config.max_upload_bytes + 1)

        if len(content) > config.max_upload_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds {config.max_upload_size_mb}MB limit",
            )

        # Validate file type
        file_extension = file.filename.split(".")[-1].lower()

        if file_extension not in config.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File type .{file_extension} not allowed. "
                    f"Allowed types: {', '.join(config.allowed_extensions)}"
                ),
            )

        # Process document
        document = await agent_manager.add_document(
            db=db,
            agent_id=agent_id,
            filename=file.filename,
            file_content=content,
            config=config,
        )

        logger.info(f"Document {file.filename} uploaded to agent {agent_id}")

        background_tasks.add_task(
            WebhookService.trigger_webhooks_detached,
            agent_id,
            "document.uploaded",
            {
                "document_id": document.id,
                "filename": document.filename,
                "file_type": document.file_type,
                "file_size": document.file_size,
                "chunk_count": document.chunk_count,
            },
        )

        return DocumentUpload(
            id=document.id,
            filename=document.filename,
            file_size=document.file_size,
            file_type=document.file_type,
            chunk_count=document.chunk_count,
            processed_at=document.processed_at,
        )

    except HTTPException:
        # Raised deliberately above (size / type checks) — don't let the generic
        # handler below turn a 400 into a 500.
        raise
    except EmbeddingModelMismatch as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail="Error processing document")


@router.get("/{agent_id}/documents", response_model=List[DocumentUpload])
async def list_documents(agent_id: int, db: AsyncSession = Depends(get_db)):
    """List all documents for an agent"""
    try:
        documents = await get_agent_manager().get_agent_documents(db, agent_id)

        return [
            DocumentUpload(
                id=doc.id,
                filename=doc.filename,
                file_size=doc.file_size,
                file_type=doc.file_type,
                chunk_count=doc.chunk_count,
                processed_at=doc.processed_at,
            )
            for doc in documents
        ]

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Error listing documents")


@router.delete("/{agent_id}/documents")
async def clear_documents(agent_id: int, db: AsyncSession = Depends(get_db)):
    """Remove every document from an agent's knowledge base, vectors included"""
    deleted = await get_agent_manager().delete_agent_documents(db, agent_id)
    return {"deleted": deleted}


@router.post("/{agent_id}/chat", response_model=ChatResponse)
async def chat_with_agent(
    agent_id: int,
    message: ChatMessage,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
):
    """Send a message to an agent"""
    try:
        result = await get_agent_manager().chat(
            db=db,
            agent_id=agent_id,
            message=message.message,
            conversation_id=message.conversation_id,
            config=config,
        )

        queue_chat_webhooks(background_tasks, agent_id, message.message, result, source="platform")

        return ChatResponse(
            response=result["response"],
            conversation_id=result["conversation_id"],
            tokens_used=result.get("tokens_used"),
            sources=result.get("sources"),
        )

    except HTTPException:
        raise
    except EmbeddingModelMismatch as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


def queue_chat_webhooks(
    background_tasks: BackgroundTasks,
    agent_id: int,
    user_message: str,
    result: dict,
    source: str,
) -> None:
    """Schedule the webhooks a chat turn should emit, after the response is sent."""
    if result.get("conversation_created"):
        background_tasks.add_task(
            WebhookService.trigger_webhooks_detached,
            agent_id,
            "conversation.started",
            {"conversation_id": result["conversation_id"], "source": source},
        )

    background_tasks.add_task(
        WebhookService.trigger_webhooks_detached,
        agent_id,
        "message.sent",
        {
            "conversation_id": result["conversation_id"],
            "user_message": user_message,
            "assistant_response": result["response"],
            "tokens_used": result.get("tokens_used"),
            "sources": result.get("sources"),
            "source": source,
        },
    )


@router.get("/{agent_id}/conversations", response_model=List[ConversationResponse])
async def list_conversations(agent_id: int, db: AsyncSession = Depends(get_db)):
    """List all conversations for an agent"""
    try:
        conversations = await get_agent_manager().get_conversations(db, agent_id)

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
    db: AsyncSession = Depends(get_db),
):
    """Get all messages in a conversation"""
    try:
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
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Error getting messages")
