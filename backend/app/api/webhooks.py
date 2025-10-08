"""API routes for webhook management"""

import json
import secrets
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from ..database import get_db
from ..models import (
    Webhook,
    WebhookLog,
    Agent,
    WebhookCreate,
    WebhookUpdate,
    WebhookResponse,
    WebhookLogResponse,
)
from ..utils.webhook_service import WebhookService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents/{agent_id}/webhooks", tags=["webhooks"])


@router.post("/", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    agent_id: int,
    webhook_data: WebhookCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new webhook for an agent"""
    # Verify agent exists
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Validate events
    invalid_events = [e for e in webhook_data.events if e not in WebhookService.SUPPORTED_EVENTS and e != "*"]
    if invalid_events:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid events: {', '.join(invalid_events)}. Supported events: {', '.join(WebhookService.SUPPORTED_EVENTS)}"
        )

    # Generate secret if not provided
    secret = webhook_data.secret
    if not secret:
        secret = f"whsec_{secrets.token_urlsafe(32)}"

    # Prepare headers
    headers_json = None
    if webhook_data.headers:
        headers_json = json.dumps(webhook_data.headers)

    # Create webhook
    webhook = Webhook(
        agent_id=agent_id,
        name=webhook_data.name,
        url=webhook_data.url,
        events=",".join(webhook_data.events),
        secret=secret,
        headers=headers_json,
        retry_count=webhook_data.retry_count,
    )

    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)

    # Return response
    return WebhookResponse(
        id=webhook.id,
        agent_id=webhook.agent_id,
        name=webhook.name,
        url=webhook.url,
        events=webhook.events.split(",") if webhook.events else [],
        is_active=bool(webhook.is_active),
        retry_count=webhook.retry_count,
        created_at=webhook.created_at,
        last_triggered_at=webhook.last_triggered_at,
    )


@router.get("/", response_model=List[WebhookResponse])
async def list_webhooks(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
):
    """List all webhooks for an agent"""
    # Verify agent exists
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Get webhooks
    result = await db.execute(
        select(Webhook).where(Webhook.agent_id == agent_id).order_by(desc(Webhook.created_at))
    )
    webhooks = result.scalars().all()

    return [
        WebhookResponse(
            id=webhook.id,
            agent_id=webhook.agent_id,
            name=webhook.name,
            url=webhook.url,
            events=webhook.events.split(",") if webhook.events else [],
            is_active=bool(webhook.is_active),
            retry_count=webhook.retry_count,
            created_at=webhook.created_at,
            last_triggered_at=webhook.last_triggered_at,
        )
        for webhook in webhooks
    ]


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    agent_id: int,
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific webhook"""
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.agent_id == agent_id)
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    return WebhookResponse(
        id=webhook.id,
        agent_id=webhook.agent_id,
        name=webhook.name,
        url=webhook.url,
        events=webhook.events.split(",") if webhook.events else [],
        is_active=bool(webhook.is_active),
        retry_count=webhook.retry_count,
        created_at=webhook.created_at,
        last_triggered_at=webhook.last_triggered_at,
    )


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    agent_id: int,
    webhook_id: int,
    webhook_data: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a webhook"""
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.agent_id == agent_id)
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    # Update fields
    if webhook_data.name is not None:
        webhook.name = webhook_data.name
    if webhook_data.url is not None:
        webhook.url = webhook_data.url
    if webhook_data.events is not None:
        # Validate events
        invalid_events = [e for e in webhook_data.events if e not in WebhookService.SUPPORTED_EVENTS and e != "*"]
        if invalid_events:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid events: {', '.join(invalid_events)}"
            )
        webhook.events = ",".join(webhook_data.events)
    if webhook_data.secret is not None:
        webhook.secret = webhook_data.secret
    if webhook_data.headers is not None:
        webhook.headers = json.dumps(webhook_data.headers)
    if webhook_data.retry_count is not None:
        webhook.retry_count = webhook_data.retry_count
    if webhook_data.is_active is not None:
        webhook.is_active = 1 if webhook_data.is_active else 0

    await db.commit()
    await db.refresh(webhook)

    return WebhookResponse(
        id=webhook.id,
        agent_id=webhook.agent_id,
        name=webhook.name,
        url=webhook.url,
        events=webhook.events.split(",") if webhook.events else [],
        is_active=bool(webhook.is_active),
        retry_count=webhook.retry_count,
        created_at=webhook.created_at,
        last_triggered_at=webhook.last_triggered_at,
    )


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    agent_id: int,
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook"""
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.agent_id == agent_id)
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    await db.delete(webhook)
    await db.commit()

    return None


@router.patch("/{webhook_id}/toggle", response_model=WebhookResponse)
async def toggle_webhook(
    agent_id: int,
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Toggle webhook active status"""
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.agent_id == agent_id)
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    webhook.is_active = 0 if webhook.is_active else 1
    await db.commit()
    await db.refresh(webhook)

    return WebhookResponse(
        id=webhook.id,
        agent_id=webhook.agent_id,
        name=webhook.name,
        url=webhook.url,
        events=webhook.events.split(",") if webhook.events else [],
        is_active=bool(webhook.is_active),
        retry_count=webhook.retry_count,
        created_at=webhook.created_at,
        last_triggered_at=webhook.last_triggered_at,
    )


@router.post("/{webhook_id}/test", status_code=status.HTTP_200_OK)
async def test_webhook(
    agent_id: int,
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Test a webhook by sending a test payload"""
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.agent_id == agent_id)
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    # Send test webhook
    test_payload = {
        "test": True,
        "message": "This is a test webhook from AgentForge",
        "webhook_id": webhook.id,
        "webhook_name": webhook.name,
    }

    success = await WebhookService.deliver_webhook(
        db, webhook, "test.webhook", test_payload
    )

    if success:
        return {"success": True, "message": "Test webhook delivered successfully"}
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to deliver test webhook. Check webhook logs for details."
        )


@router.get("/{webhook_id}/logs", response_model=List[WebhookLogResponse])
async def get_webhook_logs(
    agent_id: int,
    webhook_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get webhook delivery logs"""
    # Verify webhook belongs to agent
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.agent_id == agent_id)
    )
    webhook = result.scalar_one_or_none()

    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    # Get logs
    result = await db.execute(
        select(WebhookLog)
        .where(WebhookLog.webhook_id == webhook_id)
        .order_by(desc(WebhookLog.created_at))
        .limit(limit)
    )
    logs = result.scalars().all()

    return [
        WebhookLogResponse(
            id=log.id,
            webhook_id=log.webhook_id,
            event_type=log.event_type,
            status_code=log.status_code,
            success=bool(log.success),
            error_message=log.error_message,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.get("/events/supported", response_model=List[str])
async def get_supported_events():
    """Get list of supported webhook events"""
    return WebhookService.SUPPORTED_EVENTS
