"""
Migration: Add webhooks and webhook_logs tables

Run this migration to add the webhooks and webhook_logs tables for webhook integrations.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import engine


async def migrate():
    """Add webhooks and webhook_logs tables"""

    async with engine.begin() as conn:
        print("Creating webhooks table...")

        # Create webhooks table
        await conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS webhooks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id INTEGER NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    url VARCHAR(512) NOT NULL,
                    events TEXT NOT NULL,
                    secret VARCHAR(64),
                    is_active INTEGER DEFAULT 1,
                    headers TEXT,
                    retry_count INTEGER DEFAULT 3,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_triggered_at TIMESTAMP,
                    FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
                )
            """)
        )

        print("✓ webhooks table created")

        print("Creating webhook_logs table...")

        # Create webhook_logs table
        await conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS webhook_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    webhook_id INTEGER NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    payload TEXT NOT NULL,
                    status_code INTEGER,
                    response_body TEXT,
                    success INTEGER DEFAULT 0,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (webhook_id) REFERENCES webhooks (id) ON DELETE CASCADE
                )
            """)
        )

        print("✓ webhook_logs table created")

        # Create indexes
        print("Creating indexes...")

        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_webhooks_agent_id ON webhooks(agent_id)")
        )

        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active)")
        )

        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id)")
        )

        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC)")
        )

        print("✓ Indexes created")

        print("\n✓ Migration completed successfully")
        print("  - Added 'webhooks' table")
        print("  - Added 'webhook_logs' table")
        print("  - Created indexes for performance")


if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add webhooks and webhook_logs tables")
    print("=" * 60)
    asyncio.run(migrate())
    print("=" * 60)
