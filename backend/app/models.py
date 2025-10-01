"""Database models for AgentForge"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from .database import Base


# SQLAlchemy Models

class Agent(Base):
    """Agent configuration table"""
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    llm_model = Column(String(100), nullable=False)  # e.g., "gpt-4", "claude-sonnet"
    system_prompt = Column(Text, nullable=False)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=1000)
    personality = Column(String(100), default="professional")  # professional, friendly, technical
    guardrails = Column(Text, nullable=True)  # Additional instructions/limitations
    template_name = Column(String(100), nullable=True)  # Which template was used
    config = Column(JSON, nullable=True)  # Additional config as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="agent", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="agent", cascade="all, delete-orphan")


class Document(Base):
    """Document storage for RAG"""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    content_hash = Column(String(64), nullable=False)  # SHA256 hash
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_type = Column(String(50), nullable=False)  # pdf, txt, md, docx
    chunk_count = Column(Integer, default=0)  # Number of chunks created
    processed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    agent = relationship("Agent", back_populates="documents")


class Conversation(Base):
    """Conversation history"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    conversation_id = Column(String(100), unique=True, index=True)  # UUID
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    agent = relationship("Agent", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """Individual messages in conversations"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


# Pydantic Schemas (for API requests/responses)

class AgentCreate(BaseModel):
    """Schema for creating a new agent"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    llm_model: str = Field(..., description="e.g., gpt-4, claude-sonnet-3-5")
    system_prompt: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1000, ge=100, le=4000)
    personality: str = Field(default="professional")
    guardrails: Optional[str] = None
    template_name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class AgentUpdate(BaseModel):
    """Schema for updating an agent"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    llm_model: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=100, le=4000)
    personality: Optional[str] = None
    guardrails: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class AgentResponse(BaseModel):
    """Schema for agent response"""
    id: int
    name: str
    description: Optional[str]
    llm_model: str
    system_prompt: str
    temperature: float
    max_tokens: int
    personality: str
    guardrails: Optional[str]
    template_name: Optional[str]
    config: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    conversation_count: int = 0

    class Config:
        from_attributes = True


class DocumentUpload(BaseModel):
    """Schema for document upload response"""
    id: int
    filename: str
    file_size: int
    file_type: str
    chunk_count: int
    processed_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    """Schema for chat messages"""
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Schema for chat response"""
    response: str
    conversation_id: str
    tokens_used: Optional[int] = None
    sources: Optional[list] = None  # Document chunks used for RAG


class ConversationResponse(BaseModel):
    """Schema for conversation history"""
    id: int
    conversation_id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """Schema for individual messages"""
    role: str
    content: str
    timestamp: datetime
    tokens_used: Optional[int] = None

    class Config:
        from_attributes = True
