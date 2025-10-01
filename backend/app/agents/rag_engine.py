"""RAG (Retrieval-Augmented Generation) Engine using LangChain"""

import os
import logging
from typing import List, Dict, Any, Optional
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_openai import OpenAIEmbeddings

logger = logging.getLogger(__name__)


class RAGEngine:
    """RAG engine for retrieval-augmented generation"""

    def __init__(self, embedding_model: str = "sentence-transformers"):
        """
        Initialize RAG engine

        Args:
            embedding_model: Type of embedding model ('sentence-transformers' or 'openai')
        """
        self.embedding_model_type = embedding_model
        self.embedding_function = self._initialize_embeddings()

    def _initialize_embeddings(self):
        """Initialize embedding function based on configuration"""
        if self.embedding_model_type == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not set but OpenAI embeddings requested")

            logger.info("Using OpenAI embeddings")
            return OpenAIEmbeddings(api_key=api_key)

        else:  # sentence-transformers (default)
            model_name = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
            logger.info(f"Using HuggingFace embeddings: {model_name}")

            return HuggingFaceEmbeddings(
                model_name=model_name,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )

    def get_embedding_function(self):
        """Get the embedding function for use with vector store"""
        return self.embedding_function

    @staticmethod
    def create_rag_prompt(
        system_prompt: str,
        personality: str = "professional",
        guardrails: Optional[str] = None,
    ) -> ChatPromptTemplate:
        """
        Create a RAG-aware prompt template

        Args:
            system_prompt: Base system prompt
            personality: Agent personality
            guardrails: Additional guardrails/limitations

        Returns:
            ChatPromptTemplate for RAG
        """
        # Build the full system message
        full_system = f"""{system_prompt}

IMPORTANT: You have access to a knowledge base of documents. When answering questions:
1. ALWAYS prioritize information from the provided context
2. If the context contains relevant information, use it in your answer
3. If the context doesn't contain relevant information, say so clearly
4. Cite information from the context when applicable
5. Do not make up information not present in the context

Personality: {personality}
"""

        if guardrails:
            full_system += f"\n\nAdditional Guidelines:\n{guardrails}"

        # Create the prompt template
        template = ChatPromptTemplate.from_messages(
            [
                ("system", full_system),
                (
                    "system",
                    "Here is relevant context from the knowledge base:\n\n{context}\n\n"
                    "Use this context to answer the user's question. If the context doesn't contain "
                    "relevant information, mention that and provide general guidance if appropriate.",
                ),
                ("human", "{question}"),
            ]
        )

        return template

    @staticmethod
    def format_context(retrieved_docs: List[Dict[str, Any]], max_tokens: int = 2000) -> str:
        """
        Format retrieved documents into context string

        Args:
            retrieved_docs: List of retrieved documents with scores
            max_tokens: Maximum tokens for context (rough estimate: 4 chars = 1 token)

        Returns:
            Formatted context string
        """
        if not retrieved_docs:
            return "No relevant information found in the knowledge base."

        context_parts = []
        current_length = 0
        max_chars = max_tokens * 4  # Rough estimate

        for i, doc in enumerate(retrieved_docs, 1):
            # Format: [Source N] content
            doc_text = doc.get("document", "")
            metadata = doc.get("metadata", {})

            source_info = f"[Source {i}"
            if metadata.get("filename"):
                source_info += f" - {metadata['filename']}"
            if metadata.get("chunk_index") is not None:
                source_info += f" (Part {metadata['chunk_index'] + 1})"
            source_info += "]\n"

            formatted = f"{source_info}{doc_text}\n\n"

            # Check if adding this would exceed max length
            if current_length + len(formatted) > max_chars:
                # Add truncation notice
                context_parts.append("... (additional context truncated due to length)")
                break

            context_parts.append(formatted)
            current_length += len(formatted)

        return "".join(context_parts)

    @staticmethod
    def build_rag_context(
        query_results: Dict[str, Any], max_chunks: int = 5
    ) -> tuple[str, List[Dict[str, Any]]]:
        """
        Build RAG context from ChromaDB query results

        Args:
            query_results: Results from ChromaDB query
            max_chunks: Maximum number of chunks to include

        Returns:
            Tuple of (formatted_context, source_documents)
        """
        documents = query_results.get("documents", [[]])[0]
        metadatas = query_results.get("metadatas", [[]])[0]
        distances = query_results.get("distances", [[]])[0]

        # Combine results
        retrieved = []
        for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
            if i >= max_chunks:
                break

            retrieved.append(
                {
                    "document": doc,
                    "metadata": meta,
                    "distance": dist,
                    "relevance_score": 1 - dist,  # Convert distance to similarity
                }
            )

        # Format context
        context = RAGEngine.format_context(retrieved)

        # Prepare source info for response
        sources = [
            {
                "filename": doc["metadata"].get("filename", "Unknown"),
                "chunk_index": doc["metadata"].get("chunk_index", 0),
                "relevance_score": round(doc["relevance_score"], 3),
            }
            for doc in retrieved
        ]

        return context, sources

    @staticmethod
    def should_use_rag(query: str, has_documents: bool) -> bool:
        """
        Determine if RAG should be used for this query

        Args:
            query: User query
            has_documents: Whether agent has documents in knowledge base

        Returns:
            Boolean indicating if RAG should be used
        """
        # Always use RAG if documents are available
        # Could add more sophisticated logic here (e.g., query classification)
        return has_documents

    @staticmethod
    def get_conversation_context(messages: List[Dict[str, str]], max_messages: int = 5) -> str:
        """
        Format recent conversation history for context

        Args:
            messages: List of message dicts with 'role' and 'content'
            max_messages: Maximum number of recent messages to include

        Returns:
            Formatted conversation history
        """
        if not messages:
            return ""

        # Get recent messages
        recent = messages[-max_messages:] if len(messages) > max_messages else messages

        # Format
        formatted = []
        for msg in recent:
            role = msg["role"].capitalize()
            content = msg["content"]
            formatted.append(f"{role}: {content}")

        return "\n".join(formatted)
