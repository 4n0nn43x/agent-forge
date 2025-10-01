"""API routes for chat and document management"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import logging

from ..database import get_db
from ..models import (
    Agent,
    ChatMessage,
    ChatResponse,
    DocumentUpload,
    ConversationResponse,
    MessageResponse,
)
from ..agents.agent_manager import AgentManager
from ..utils.vector_store import VectorStore
from ..agents.rag_engine import RAGEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["chat"])

# Initialize components
vector_store = VectorStore(
    persist_directory=os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_data")
)
rag_engine = RAGEngine(
    embedding_model=os.getenv("EMBEDDING_MODEL", "sentence-transformers")
)
agent_manager = AgentManager(vector_store=vector_store, rag_engine=rag_engine)


@router.post("/{agent_id}/documents", response_model=DocumentUpload)
async def upload_document(
    agent_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document to agent's knowledge base"""
    try:
        # Validate file size
        max_size = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10")) * 1024 * 1024
        content = await file.read()

        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds {max_size / 1024 / 1024}MB limit",
            )

        # Validate file type
        allowed_extensions = os.getenv("ALLOWED_EXTENSIONS", "pdf,txt,md,docx").split(",")
        file_extension = file.filename.split(".")[-1].lower()

        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type .{file_extension} not allowed. Allowed types: {', '.join(allowed_extensions)}",
            )

        # Process document
        document = await agent_manager.add_document(
            db=db, agent_id=agent_id, filename=file.filename, file_content=content
        )

        logger.info(f"Document {file.filename} uploaded to agent {agent_id}")

        return DocumentUpload(
            id=document.id,
            filename=document.filename,
            file_size=document.file_size,
            file_type=document.file_type,
            chunk_count=document.chunk_count,
            processed_at=document.processed_at,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail="Error processing document")


@router.get("/{agent_id}/documents", response_model=List[DocumentUpload])
async def list_documents(agent_id: int, db: AsyncSession = Depends(get_db)):
    """List all documents for an agent"""
    try:
        documents = await agent_manager.get_agent_documents(db, agent_id)

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


@router.post("/{agent_id}/chat", response_model=ChatResponse)
async def chat_with_agent(
    agent_id: int,
    message: ChatMessage,
    db: AsyncSession = Depends(get_db),
):
    """Send a message to an agent"""
    try:
        result = await agent_manager.chat(
            db=db,
            agent_id=agent_id,
            message=message.message,
            conversation_id=message.conversation_id,
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
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@router.get("/{agent_id}/conversations", response_model=List[ConversationResponse])
async def list_conversations(agent_id: int, db: AsyncSession = Depends(get_db)):
    """List all conversations for an agent"""
    try:
        conversations = await agent_manager.get_conversations(db, agent_id)

        return [
            ConversationResponse(
                id=conv.id,
                conversation_id=conv.conversation_id,
                title=conv.title,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=len(conv.messages) if conv.messages else 0,
            )
            for conv in conversations
        ]

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
        messages = await agent_manager.get_conversation_messages(db, conversation_id)

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
