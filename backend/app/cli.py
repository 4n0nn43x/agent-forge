"""Recovery commands, for when the web UI can't help.

    docker exec -it agentforge python -m app.cli reset-password
"""

import sys
import asyncio
import getpass

from sqlalchemy import delete, select

from . import auth
from .database import AsyncSessionLocal, init_db
from .models import User, UserSession


async def reset_password() -> int:
    await init_db()
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).order_by(User.id))).scalars().first()
        if user is None:
            print("No admin account yet: use the setup link printed in the server logs.")
            return 1

        password = getpass.getpass(f"New password for '{user.username}': ")
        if len(password) < auth.MIN_PASSWORD_LENGTH:
            print(f"Use at least {auth.MIN_PASSWORD_LENGTH} characters.")
            return 1
        if getpass.getpass("Repeat it: ") != password:
            print("The passwords don't match.")
            return 1

        user.password_hash = await auth.hash_password(password)
        # Sign out everywhere: whoever was locked out may not be the only one with access.
        await db.execute(delete(UserSession).where(UserSession.user_id == user.id))
        await db.commit()
        print(f"Password for '{user.username}' changed; every session was signed out.")
        return 0


COMMANDS = {"reset-password": reset_password}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(f"usage: python -m app.cli {{{','.join(COMMANDS)}}}")
        sys.exit(2)
    sys.exit(asyncio.run(COMMANDS[sys.argv[1]]()))
