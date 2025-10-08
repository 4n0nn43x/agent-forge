"""
Migration: Add source column to conversations table

Run this migration to add the 'source' column to existing conversations.
This column tracks whether a conversation came from:
- 'platform': Internal platform chat interface
- 'public_api': Public API
- 'widget': Embedded widget
"""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import engine


async def migrate():
    """Add source column to conversations table"""

    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(
            text("PRAGMA table_info(conversations)")
        )
        columns = [row[1] for row in result.fetchall()]

        if 'source' in columns:
            print("✓ Column 'source' already exists in conversations table")
            return

        print("Adding 'source' column to conversations table...")

        # Add the column with default value
        await conn.execute(
            text("""
                ALTER TABLE conversations
                ADD COLUMN source VARCHAR(20) DEFAULT 'platform'
            """)
        )

        print("✓ Migration completed successfully")
        print("  - Added 'source' column to conversations table")
        print("  - Default value: 'platform' for existing conversations")


if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add source column to conversations")
    print("=" * 60)
    asyncio.run(migrate())
    print("=" * 60)
