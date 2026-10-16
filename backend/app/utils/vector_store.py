"""Vector store management using ChromaDB"""

import os
import logging
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings

logger = logging.getLogger(__name__)


class EmbeddingModelMismatch(RuntimeError):
    """The collection was indexed with a different embedding model than the configured one.

    Chroma only notices when the vector widths differ, and then with an opaque
    error; with equal widths it silently returns unrelated chunks.
    """


class VectorStore:
    """Wrapper for ChromaDB vector store operations"""

    def __init__(self, persist_directory: str = "./chroma_data"):
        """
        Initialize ChromaDB client

        Args:
            persist_directory: Directory to persist vector data
        """
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)

        # Initialize ChromaDB client with persistence
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True,
            ),
        )

        logger.info(f"ChromaDB initialized with persist directory: {persist_directory}")

    def get_or_create_collection(self, agent_id: int, embedding_function=None):
        """
        Get or create a collection for an agent

        Args:
            agent_id: ID of the agent
            embedding_function: Optional custom embedding function

        Returns:
            ChromaDB collection
        """
        collection_name = f"agent_{agent_id}"

        try:
            if embedding_function:
                collection = self.client.get_or_create_collection(
                    name=collection_name,
                    embedding_function=embedding_function,
                    # Only applied when the collection is created: records which
                    # model its vectors came from.
                    metadata={"embedding_function": embedding_function.name()},
                )
            else:
                collection = self.client.get_or_create_collection(
                    name=collection_name,
                )

        except Exception as e:
            logger.error(f"Error creating collection for agent {agent_id}: {e}")
            raise

        # Collections created before this check carry no record and are trusted.
        indexed_with = (collection.metadata or {}).get("embedding_function")
        if embedding_function and indexed_with and indexed_with != embedding_function.name():
            raise EmbeddingModelMismatch(
                f"This agent's documents were indexed with '{indexed_with}', but the "
                f"embedding model is now '{embedding_function.name()}'. Clear the "
                "agent's documents and upload them again, or switch the model back "
                "in Settings."
            )

        logger.debug(f"Collection '{collection_name}' ready")
        return collection

    def add_documents(
        self,
        agent_id: int,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
        embedding_function=None,
    ) -> int:
        """
        Add documents to agent's vector store

        Args:
            agent_id: ID of the agent
            documents: List of text chunks
            metadatas: List of metadata dicts for each chunk
            ids: List of unique IDs for each chunk
            embedding_function: Optional custom embedding function

        Returns:
            Number of documents added
        """
        try:
            collection = self.get_or_create_collection(agent_id, embedding_function)

            # Add documents in batches (ChromaDB recommends batches of 5000)
            batch_size = 1000
            total_added = 0

            for i in range(0, len(documents), batch_size):
                batch_docs = documents[i : i + batch_size]
                batch_metas = metadatas[i : i + batch_size]
                batch_ids = ids[i : i + batch_size]

                collection.add(
                    documents=batch_docs,
                    metadatas=batch_metas,
                    ids=batch_ids,
                )

                total_added += len(batch_docs)
                logger.info(f"Added batch of {len(batch_docs)} documents to agent {agent_id}")

            logger.info(f"Total {total_added} documents added to agent {agent_id}")
            return total_added

        except Exception as e:
            logger.error(f"Error adding documents to agent {agent_id}: {e}")
            raise

    def query(
        self,
        agent_id: int,
        query_text: str,
        n_results: int = 5,
        embedding_function=None,
    ) -> Dict[str, Any]:
        """
        Query the vector store for relevant documents

        Args:
            agent_id: ID of the agent
            query_text: Query text
            n_results: Number of results to return
            embedding_function: Optional custom embedding function

        Returns:
            Query results with documents and metadata
        """
        try:
            collection = self.get_or_create_collection(agent_id, embedding_function)

            results = collection.query(
                query_texts=[query_text],
                n_results=n_results,
            )

            logger.info(f"Query for agent {agent_id} returned {len(results['documents'][0])} results")
            return results

        except Exception as e:
            logger.error(f"Error querying agent {agent_id}: {e}")
            raise

    def delete_agent_collection(self, agent_id: int, missing_ok: bool = False):
        """
        Delete all documents for an agent

        Args:
            agent_id: ID of the agent
            missing_ok: Don't raise if the agent never had a collection
        """
        collection_name = f"agent_{agent_id}"
        try:
            self.client.delete_collection(name=collection_name)
            logger.info(f"Deleted collection for agent {agent_id}")

        except Exception as e:
            if missing_ok:
                logger.info(f"No collection to delete for agent {agent_id} ({e})")
                return
            logger.error(f"Error deleting collection for agent {agent_id}: {e}")
            raise

    def get_collection_count(self, agent_id: int, embedding_function=None) -> int:
        """
        Get the number of documents in an agent's collection

        Args:
            agent_id: ID of the agent
            embedding_function: Embedding function the collection was created with

        Returns:
            Number of documents
        """
        try:
            collection = self.get_or_create_collection(agent_id, embedding_function)
            return collection.count()

        except Exception as e:
            logger.error(f"Error getting count for agent {agent_id}: {e}")
            return 0

    def reset(self):
        """Reset the entire vector store (use with caution!)"""
        try:
            self.client.reset()
            logger.warning("Vector store has been reset!")
        except Exception as e:
            logger.error(f"Error resetting vector store: {e}")
            raise
