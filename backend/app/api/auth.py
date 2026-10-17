"""Setup, login and account routes. Everything else under /api requires a session."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .. import auth
from ..database import get_db
from ..models import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
    dependencies=[Depends(auth.require_same_origin)],
)


class Credentials(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=256)


class SetupRequest(Credentials):
    token: str = Field(..., max_length=256)


class PasswordChange(BaseModel):
    current_password: str = Field(..., max_length=256)
    new_password: str = Field(..., min_length=1, max_length=256)


@router.get("/state")
async def auth_state(request: Request, db: AsyncSession = Depends(get_db)):
    """What the app should show: the setup screen, the login screen, or itself."""
    user = await auth.current_user(request, db)
    return {
        "needs_setup": not await auth.admin_exists(db),
        "authenticated": user is not None,
        "username": user.username if user else None,
    }


@router.post("/setup")
async def setup(
    data: SetupRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Create the admin account. Needs the token printed in the server logs."""
    if await auth.admin_exists(db):
        raise HTTPException(status.HTTP_409_CONFLICT, "Setup is already done. Sign in instead.")

    # Not throttled: 256 random bits can't be guessed, and a shared counter would
    # let anyone lock the owner out of setup by sending wrong tokens.
    if not auth.check_setup_token(data.token):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Invalid setup link. Copy the one printed in the server logs "
            "(docker compose logs agentforge); a new one is printed at each restart.",
        )

    auth.validate_password(data.password)

    # The fixed id makes setup atomic: of two concurrent requests, the second
    # insert hits the primary key and fails, instead of creating a second admin.
    user = User(id=1, username=data.username.strip(), password_hash=await auth.hash_password(data.password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Setup is already done. Sign in instead.")

    auth.close_setup()
    logger.info(f"Admin account '{user.username}' created")
    await auth.start_session(db, request, response, user)
    return {"username": user.username}


@router.post("/login")
async def login(
    data: Credentials,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    username = data.username.strip()
    ip = auth.client_ip(request)

    wait = auth.throttle.try_attempt(username.lower(), ip)
    if wait:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Too many failed attempts. Try again in {wait // 60 + 1} min.",
            headers={"Retry-After": str(wait)},
        )

    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not await auth.verify_password(data.password, user.password_hash if user else None):
        logger.warning(f"Failed login for '{username}' from {ip}")
        # Same message whether or not the username exists.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong username or password")

    auth.throttle.succeeded(username.lower(), ip)
    await auth.start_session(db, request, response, user)
    return {"username": user.username}


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    await auth.end_session(db, request, response)
    return {"ok": True}


@router.post("/logout-others")
async def logout_others(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(auth.require_admin),
):
    """End every session except the one making this request."""
    return {"ended": await auth.end_other_sessions(db, request, user)}


@router.put("/password")
async def change_password(
    data: PasswordChange,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(auth.require_admin),
):
    if not await auth.verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The current password is wrong")
    auth.validate_password(data.new_password)

    user.password_hash = await auth.hash_password(data.new_password)
    await db.commit()
    # Whoever knew the old password should not stay signed in.
    ended = await auth.end_other_sessions(db, request, user)
    return {"ok": True, "ended": ended}
