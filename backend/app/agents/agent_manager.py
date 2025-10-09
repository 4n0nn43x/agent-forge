"""Agent management and orchestration"""

import os
import logging
from typing import List, Dict, Any, Optional, AsyncIterator
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_ollama import ChatOllama

from ..models import Agent, Document, Conversation, Message
from ..utils.vector_store import VectorStore
from ..utils.document_processor import DocumentProcessor, chunk_text
from .rag_engine import RAGEngine

logger = logging.getLogger(__name__)


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

    def _get_llm(self, agent: Agent):
        """
        Get LangChain LLM instance based on agent configuration

        Supports:
        - OpenAI models (GPT, O1)
        - Anthropic models (Claude)
        - Ollama local models (Llama, Mistral, etc.)
        - OpenAI-compatible endpoints (LM Studio, LocalAI)

        Args:
            agent: Agent database model

        Returns:
            LangChain LLM instance
        """
        model_name = agent.llm_model.lower()

        # Ollama models (local/free)
        # Common Ollama models: llama2, llama3, mistral, codellama, phi, gemma, etc.
        ollama_keywords = ["llama", "mistral", "codellama", "phi", "gemma", "vicuna", "orca", "neural-chat"]
        if any(keyword in model_name for keyword in ollama_keywords):
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            logger.info(f"Using Ollama model: {agent.llm_model} at {base_url}")

            return ChatOllama(
                model=agent.llm_model,
                base_url=base_url,
                temperature=agent.temperature,
                # Note: Ollama handles max_tokens differently
                num_predict=agent.max_tokens if agent.max_tokens else None,
            )

        # OpenAI models
        elif "gpt" in model_name or model_name.startswith("o1"):
            # Check for custom OpenAI-compatible endpoints (LM Studio, LocalAI)
            lmstudio_base = os.getenv("LMSTUDIO_BASE_URL")
            localai_base = os.getenv("LOCALAI_BASE_URL")

            # LM Studio (OpenAI-compatible)
            if lmstudio_base and "lmstudio" in model_name:
                logger.info(f"Using LM Studio at {lmstudio_base}")
                return ChatOpenAI(
                    model=agent.llm_model,
                    temperature=agent.temperature,
                    max_tokens=agent.max_tokens,
                    base_url=lmstudio_base,
                    api_key="lm-studio",  # LM Studio doesn't require real API key
                )

            # LocalAI (OpenAI-compatible)
            elif localai_base and "localai" in model_name:
                logger.info(f"Using LocalAI at {localai_base}")
                return ChatOpenAI(
                    model=agent.llm_model,
                    temperature=agent.temperature,
                    max_tokens=agent.max_tokens,
                    base_url=localai_base,
                    api_key="not-needed",  # LocalAI doesn't require API key
                )

            # Standard OpenAI
            else:
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not set")

                return ChatOpenAI(
                    model=agent.llm_model,
                    temperature=agent.temperature,
                    max_tokens=agent.max_tokens,
                    api_key=api_key,
                )

        # Anthropic models
        elif "claude" in model_name or "sonnet" in model_name or "opus" in model_name:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")

            return ChatAnthropic(
                model=agent.llm_model,
                temperature=agent.temperature,
                max_tokens=agent.max_tokens,
                api_key=api_key,
            )

        else:
            # Try Ollama as fallback for unknown models
            ollama_base = os.getenv("OLLAMA_BASE_URL")
            if ollama_base:
                logger.warning(f"Unknown model '{agent.llm_model}', attempting to use with Ollama")
                return ChatOllama(
                    model=agent.llm_model,
                    base_url=ollama_base,
                    temperature=agent.temperature,
                    num_predict=agent.max_tokens if agent.max_tokens else None,
                )

            raise ValueError(
                f"Unsupported model: {agent.llm_model}. "
                f"Supported providers: OpenAI, Anthropic, Ollama, LM Studio, LocalAI"
            )

    async def add_document(
        self,
        db: AsyncSession,
        agent_id: int,
        filename: str,
        file_content: bytes,
    ) -> Document:
        """
        Process and add a document to agent's knowledge base

        Args:
            db: Database session
            agent_id: Agent ID
            filename: Document filename
            file_content: Binary file content

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
            embedding_function=self.rag_engine.get_embedding_function(),
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

    async def delete_agent_documents(self, db: AsyncSession, agent_id: int):
        """Delete all documents for an agent"""
        # Delete from vector store
        self.vector_store.delete_agent_collection(agent_id)

        # Delete from database
        await db.execute(select(Document).where(Document.agent_id == agent_id))
        await db.commit()

        logger.info(f"Deleted all documents for agent {agent_id}")

    async def chat(
        self,
        db: AsyncSession,
        agent_id: int,
        message: str,
        conversation_id: Optional[str] = None,
        source: str = "platform",
    ) -> Dict[str, Any]:
        """
        Handle chat interaction with agent

        Args:
            db: Database session
            agent_id: Agent ID
            message: User message
            conversation_id: Optional existing conversation ID
            source: Source of the conversation (platform, public_api, widget)

        Returns:
            Dictionary with response and metadata
        """
        # Get agent
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalar_one_or_none()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        # Get or create conversation
        if conversation_id:
            result = await db.execute(
                select(Conversation).where(Conversation.conversation_id == conversation_id)
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
                embedding_function=self.rag_engine.get_embedding_function(),
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
        llm = self._get_llm(agent)

        # Build prompt
        prompt_template = self.rag_engine.create_rag_prompt(
            system_prompt=agent.system_prompt,
            personality=agent.personality,
            guardrails=agent.guardrails,
        )

        # Format with history if available
        messages_for_llm = []

        # Add system message with context
        if context:
            formatted_prompt = prompt_template.format_messages(
                context=context,
                question=message,
            )
            messages_for_llm.extend(formatted_prompt)
        else:
            # No RAG context
            messages_for_llm.append(("system", agent.system_prompt))
            messages_for_llm.append(("human", message))

        # Add conversation history (limit to last 10 messages)
        history_messages = []
        for msg in history[-10:]:
            if msg.role == "user":
                history_messages.append(("human", msg.content))
            elif msg.role == "assistant":
                history_messages.append(("ai", msg.content))

        # Insert history before the current question
        if history_messages:
            messages_for_llm = [messages_for_llm[0]] + history_messages + messages_for_llm[1:]

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
            tokens_used=response.usage_metadata.get("total_tokens") if hasattr(response, "usage_metadata") else None,
        )

        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()

        logger.info(f"Chat response generated for agent {agent_id}")

        return {
            "response": response_text,
            "conversation_id": conversation_id,
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
