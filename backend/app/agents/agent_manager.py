"""Agent management and orchestration"""

import logging
from typing import List, Dict, Any, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from ..models import Agent, Document, Conversation, Message
from ..utils.vector_store import VectorStore
from ..utils.document_processor import DocumentProcessor, chunk_text
from ..utils.timeutils import utcnow
from .rag_engine import RAGEngine
from .providers import build_chat_model

logger = logging.getLogger(__name__)


def _extract_total_tokens(response) -> Optional[int]:
    """Read the token count off an LLM response, tolerating providers that omit it.

    Ollama and OpenRouter both report usage, but not always, and
    `usage_metadata` can be present-but-None on some LangChain versions.
    """
    usage = getattr(response, "usage_metadata", None)
    if isinstance(usage, dict):
        total = usage.get("total_tokens")
        if isinstance(total, int):
            return total

    metadata = getattr(response, "response_metadata", None) or {}
    token_usage = metadata.get("token_usage") or metadata.get("usage") or {}
    total = token_usage.get("total_tokens")
    return total if isinstance(total, int) else None


class AgentManager:
    """Manages agent lifecycle, document processing, and chat interactions"""

    def __init__(self, vector_store: VectorStore, rag_engine: RAGEngine):
        """
        Initialize AgentManager

        Args:
            vector_store: VectorStore instance
            rag_engine: RAGEngine instance
        """
        self.vector_store = vector_store
        self.rag_engine = rag_engine
        self.document_processor = DocumentProcessor()

    def _get_llm(self, agent: Agent, config):
        """
        Get LangChain LLM instance based on agent configuration

        Supports:
        - OpenRouter (namespaced ids, e.g. "openai/gpt-4o")
        - Ollama (plain tags, e.g. "llama3.2")

        Args:
            agent: Agent database model
            config: Resolved RuntimeConfig (credentials, endpoints)

        Returns:
            LangChain LLM instance
        """
        return build_chat_model(
            model=agent.llm_model,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
            config=config,
        )

    async def add_document(
        self,
        db: AsyncSession,
        agent_id: int,
        filename: str,
        file_content: bytes,
        config=None,
    ) -> Document:
        """
        Process and add a document to agent's knowledge base

        Args:
            db: Database session
            agent_id: Agent ID
            filename: Document filename
            file_content: Binary file content
            config: Resolved RuntimeConfig (embedding endpoint)

        Returns:
            Document database model
        """
        # Check if agent exists
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalar_one_or_none()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        # Process document
        logger.info(f"Processing document {filename} for agent {agent_id}")
        doc_data = self.document_processor.process_document(filename, file_content)

        # Check if document already exists (by hash)
        result = await db.execute(
            select(Document).where(
                Document.agent_id == agent_id,
                Document.content_hash == doc_data["content_hash"],
            )
        )
        existing_doc = result.scalar_one_or_none()
        if existing_doc:
            logger.info(f"Document {filename} already exists for agent {agent_id}")
            return existing_doc

        # Chunk the text
        chunks = chunk_text(doc_data["text"], chunk_size=1000, overlap=200)
        logger.info(f"Created {len(chunks)} chunks from {filename}")

        # Prepare metadata for each chunk
        metadatas = []
        ids = []
        doc_uuid = str(uuid.uuid4())

        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_uuid}_chunk_{i}"
            metadata = {
                "agent_id": agent_id,
                "filename": filename,
                "file_type": doc_data["file_type"],
                "chunk_index": i,
                "total_chunks": len(chunks),
                "doc_uuid": doc_uuid,
            }
            metadatas.append(metadata)
            ids.append(chunk_id)

        # Add to vector store
        logger.info(f"Adding {len(chunks)} chunks to vector store for agent {agent_id}")
        self.vector_store.add_documents(
            agent_id=agent_id,
            documents=chunks,
            metadatas=metadatas,
            ids=ids,
            embedding_function=self.rag_engine.get_embedding_function(config),
        )

        # Save document record to database
        doc_record = Document(
            agent_id=agent_id,
            filename=filename,
            content_hash=doc_data["content_hash"],
            file_size=doc_data["file_size"],
            file_type=doc_data["file_type"],
            chunk_count=len(chunks),
        )
        db.add(doc_record)
        await db.commit()
        await db.refresh(doc_record)

        logger.info(f"Document {filename} successfully added to agent {agent_id}")
        return doc_record

    async def get_agent_documents(self, db: AsyncSession, agent_id: int) -> List[Document]:
        """Get all documents for an agent"""
        result = await db.execute(
            select(Document).where(Document.agent_id == agent_id).order_by(Document.processed_at.desc())
        )
        return result.scalars().all()

    async def delete_agent_documents(self, db: AsyncSession, agent_id: int) -> int:
        """Delete all documents for an agent. Returns the number of rows removed."""
        # Delete from vector store first; a missing collection is not an error here.
        self.vector_store.delete_agent_collection(agent_id, missing_ok=True)

        # Delete from database
        result = await db.execute(delete(Document).where(Document.agent_id == agent_id))
        await db.commit()

        deleted = result.rowcount or 0
        logger.info(f"Deleted {deleted} documents for agent {agent_id}")
        return deleted

    async def chat(
        self,
        db: AsyncSession,
        agent_id: int,
        message: str,
        conversation_id: Optional[str] = None,
        source: str = "platform",
        config=None,
    ) -> Dict[str, Any]:
        """
        Handle chat interaction with agent

        Args:
            db: Database session
            agent_id: Agent ID
            message: User message
            conversation_id: Optional existing conversation ID
            source: Source of the conversation (platform, public_api, widget)
            config: Resolved RuntimeConfig (credentials, endpoints)

        Returns:
            Dictionary with response and metadata
        """
        # Get agent
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalar_one_or_none()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        # Get or create conversation
        conversation_created = False
        if conversation_id:
            result = await db.execute(
                select(Conversation).where(
                    Conversation.conversation_id == conversation_id,
                    Conversation.agent_id == agent_id,
                )
            )
            conversation = result.scalar_one_or_none()
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
        else:
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                agent_id=agent_id,
                conversation_id=conversation_id,
                title=message[:100] if len(message) > 100 else message,
                source=source,
            )
            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)
            conversation_created = True

        # Check if agent has documents
        result = await db.execute(
            select(func.count(Document.id)).where(Document.agent_id == agent_id)
        )
        doc_count = result.scalar()
        has_documents = doc_count > 0

        # Build context
        context = ""
        sources = []

        if has_documents and self.rag_engine.should_use_rag(message, has_documents):
            # Query vector store
            logger.info(f"Querying vector store for agent {agent_id}")
            query_results = self.vector_store.query(
                agent_id=agent_id,
                query_text=message,
                n_results=5,
                embedding_function=self.rag_engine.get_embedding_function(config),
            )

            # Build RAG context
            context, sources = self.rag_engine.build_rag_context(query_results, max_chunks=5)
            logger.info(f"Retrieved {len(sources)} relevant chunks")

        # Get conversation history
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.timestamp.asc())
        )
        history = result.scalars().all()

        # Get LLM
        llm = self._get_llm(agent, config)

        # Build the message list: system prompt (with any RAG context), then the
        # recent history, then the current question.
        system_message = self.rag_engine.build_system_prompt(
            system_prompt=agent.system_prompt,
            personality=agent.personality,
            guardrails=agent.guardrails,
            context=context or None,
        )

        messages_for_llm = [("system", system_message)]

        # Add conversation history (limit to last 10 messages)
        for msg in history[-10:]:
            if msg.role == "user":
                messages_for_llm.append(("human", msg.content))
            elif msg.role == "assistant":
                messages_for_llm.append(("ai", msg.content))

        messages_for_llm.append(("human", message))

        # Get response from LLM
        logger.info(f"Generating response for agent {agent_id}")
        response = await llm.ainvoke(messages_for_llm)
        response_text = response.content

        # Save messages to database
        user_msg = Message(
            conversation_id=conversation.id,
            role="user",
            content=message,
        )
        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=response_text,
            tokens_used=_extract_total_tokens(response),
        )

        db.add(user_msg)
        db.add(assistant_msg)
        # Bump the conversation so that ordering by updated_at reflects activity.
        conversation.updated_at = utcnow()
        await db.commit()

        logger.info(f"Chat response generated for agent {agent_id}")

        return {
            "response": response_text,
            "conversation_id": conversation_id,
            "conversation_created": conversation_created,
            "sources": sources if sources else None,
            "tokens_used": assistant_msg.tokens_used,
        }

    async def get_conversations(
        self,
        db: AsyncSession,
        agent_id: int,
        source: Optional[str] = "platform"
    ) -> List[Conversation]:
        """
        Get all conversations for an agent

        Args:
            db: Database session
            agent_id: Agent ID
            source: Filter by source (platform, widget, public_api).
                    Use None to get all conversations.
        """
        query = select(Conversation).where(Conversation.agent_id == agent_id)

        # Filter by source if specified
        if source is not None:
            query = query.where(Conversation.source == source)

        query = query.order_by(Conversation.updated_at.desc())

        result = await db.execute(query)
        return result.scalars().all()

    async def get_conversation_messages(
        self, db: AsyncSession, conversation_id: str
    ) -> List[Message]:
        """Get all messages in a conversation"""
        # First get the conversation
        result = await db.execute(
            select(Conversation).where(Conversation.conversation_id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")

        # Get messages
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.timestamp.asc())
        )
        return result.scalars().all()
