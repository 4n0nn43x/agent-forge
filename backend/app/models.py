"""Database models for AgentForge"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional, Dict, Any, List
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
    source = Column(String(20), default="platform")  # platform, public_api, widget
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


class APIKey(Base):
    """API Keys for public API access"""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    key = Column(String(64), unique=True, index=True, nullable=False)  # API key
    name = Column(String(255), nullable=False)  # Human-readable name
    is_active = Column(Integer, default=1)  # 1 for active, 0 for disabled
    rate_limit = Column(Integer, default=100)  # Requests per hour
    allowed_origins = Column(Text, nullable=True)  # Comma-separated domains
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    # Relationships
    agent = relationship("Agent")


class Webhook(Base):
    """Webhooks for agent events"""
    __tablename__ = "webhooks"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    name = Column(String(255), nullable=False)  # Human-readable name
    url = Column(String(512), nullable=False)  # Webhook URL
    events = Column(Text, nullable=False)  # Comma-separated events (message.sent, conversation.started, etc.)
    secret = Column(String(64), nullable=True)  # Secret for signature validation
    is_active = Column(Integer, default=1)  # 1 for active, 0 for disabled
    headers = Column(Text, nullable=True)  # JSON string of custom headers
    retry_count = Column(Integer, default=3)  # Number of retries on failure
    created_at = Column(DateTime, default=datetime.utcnow)
    last_triggered_at = Column(DateTime, nullable=True)

    # Relationships
    agent = relationship("Agent")


class WebhookLog(Base):
    """Log of webhook deliveries"""
    __tablename__ = "webhook_logs"

    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(Integer, ForeignKey("webhooks.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # message.sent, conversation.started, etc.
    payload = Column(Text, nullable=False)  # JSON payload sent
    status_code = Column(Integer, nullable=True)  # HTTP response code
    response_body = Column(Text, nullable=True)  # Response from webhook
    success = Column(Integer, default=0)  # 1 for success, 0 for failure
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    webhook = relationship("Webhook")


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


class APIKeyCreate(BaseModel):
    """Schema for creating an API key"""
    name: str = Field(..., min_length=1, max_length=255)
    rate_limit: int = Field(default=100, ge=1, le=10000)
    allowed_origins: Optional[str] = None


class APIKeyResponse(BaseModel):
    """Schema for API key response"""
    id: int
    agent_id: int
    key: str
    name: str
    is_active: bool
    rate_limit: int
    allowed_origins: Optional[str]
    created_at: datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True


class WebhookCreate(BaseModel):
    """Schema for creating a webhook"""
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=512)
    events: List[str] = Field(..., description="List of events to trigger on")
    secret: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    retry_count: int = Field(default=3, ge=0, le=10)


class WebhookUpdate(BaseModel):
    """Schema for updating a webhook"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[str] = Field(None, min_length=1, max_length=512)
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    retry_count: Optional[int] = Field(None, ge=0, le=10)
    is_active: Optional[bool] = None


class WebhookResponse(BaseModel):
    """Schema for webhook response"""
    id: int
    agent_id: int
    name: str
    url: str
    events: List[str]
    is_active: bool
    retry_count: int
    created_at: datetime
    last_triggered_at: Optional[datetime]

    class Config:
        from_attributes = True


class WebhookLogResponse(BaseModel):
    """Schema for webhook log response"""
    id: int
    webhook_id: int
    event_type: str
    status_code: Optional[int]
    success: bool
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
