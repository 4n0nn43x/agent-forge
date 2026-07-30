"""API routes for webhook management"""

import json
import secrets
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from ..database import get_db
from ..dependencies import get_config
from ..settings_store import RuntimeConfig
from ..models import (
    Webhook,
    WebhookLog,
    Agent,
    WebhookCreate,
    WebhookUpdate,
    WebhookHealth,
    WebhookResponse,
    WebhookLogResponse,
)
from ..utils.webhook_service import WebhookService, WebhookUrlError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents/{agent_id}/webhooks", tags=["webhooks"])


# How many recent deliveries the health summary looks at.
HEALTH_WINDOW = 10


async def delivery_health(db: AsyncSession, webhook_id: int) -> WebhookHealth:
    """Summarise the last few deliveries so the UI can flag a broken endpoint.

    Without this, a webhook that has been failing for days looks identical to one
    that works — you only find out by opening its log.
    """
    result = await db.execute(
        select(WebhookLog)
        .where(WebhookLog.webhook_id == webhook_id)
        .order_by(desc(WebhookLog.created_at))
        .limit(HEALTH_WINDOW)
    )
    logs = result.scalars().all()

    if not logs:
        return WebhookHealth()

    consecutive = 0
    for log in logs:  # newest first
        if log.success:
            break
        consecutive += 1

    return WebhookHealth(
        total=len(logs),
        failures=sum(1 for log in logs if not log.success),
        consecutive_failures=consecutive,
        last_status_code=logs[0].status_code,
        last_delivery_at=logs[0].created_at,
        # Two in a row is a pattern, not a blip.
        failing=consecutive >= 2,
    )


async def webhook_response(db: AsyncSession, webhook: Webhook) -> WebhookResponse:
    """Build the API representation of a webhook, health included."""
    return WebhookResponse(
        id=webhook.id,
        agent_id=webhook.agent_id,
        name=webhook.name,
        url=webhook.url,
        events=webhook.events.split(",") if webhook.events else [],
        is_active=bool(webhook.is_active),
        retry_count=webhook.retry_count,
        # The secret itself is never returned; the UI only needs to know it exists.
        has_secret=bool(webhook.secret),
        created_at=webhook.created_at,
        last_triggered_at=webhook.last_triggered_at,
        health=await delivery_health(db, webhook.id),
    )


@router.post("/", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    agent_id: int,
    webhook_data: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
):
    """Create a new webhook for an agent"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    invalid_events = [
        e for e in webhook_data.events
        if e not in WebhookService.SUPPORTED_EVENTS and e != "*"
    ]
    if invalid_events:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid events: {', '.join(invalid_events)}. "
                f"Supported events: {', '.join(WebhookService.SUPPORTED_EVENTS)}"
            ),
        )

    # Validate the target URL (blocks loopback / private / metadata addresses)
    try:
        url = WebhookService.validate_url(webhook_data.url, config.allow_private_webhook_urls)
    except WebhookUrlError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Always sign: a webhook with no secret cannot be verified by the receiver.
    secret = webhook_data.secret or f"whsec_{secrets.token_urlsafe(32)}"

    webhook = Webhook(
        agent_id=agent_id,
        name=webhook_data.name,
        url=url,
        events=",".join(webhook_data.events),
        secret=secret,
        headers=json.dumps(webhook_data.headers) if webhook_data.headers else None,
        retry_count=webhook_data.retry_count,
    )

    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)

    return await webhook_response(db, webhook)


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

    return [await webhook_response(db, webhook) for webhook in webhooks]


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

    return await webhook_response(db, webhook)


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    agent_id: int,
    webhook_id: int,
    webhook_data: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
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
        try:
            webhook.url = WebhookService.validate_url(
                webhook_data.url, config.allow_private_webhook_urls
            )
        except WebhookUrlError as e:
            raise HTTPException(status_code=400, detail=str(e))
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

    return await webhook_response(db, webhook)


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

    return await webhook_response(db, webhook)


@router.post("/{webhook_id}/test", status_code=status.HTTP_200_OK)
async def test_webhook(
    agent_id: int,
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
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
        db,
        webhook,
        WebhookService.TEST_EVENT,
        test_payload,
        config.allow_private_webhook_urls,
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
            # The request we sent and the answer we got: the reason a delivery log
            # exists at all. Both were stored and neither was ever returned.
            payload=log.payload,
            response_body=log.response_body,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.post("/{webhook_id}/logs/{log_id}/replay")
async def replay_webhook_log(
    agent_id: int,
    webhook_id: int,
    log_id: int,
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
):
    """Re-send a past delivery, using the payload exactly as it was first sent.

    Retries happen inside a single delivery and then stop for good, so before
    this a delivery lost to a broken endpoint stayed lost even after the endpoint
    was fixed. The replay is recorded as its own log entry.
    """
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.agent_id == agent_id)
    )
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    result = await db.execute(
        select(WebhookLog).where(
            WebhookLog.id == log_id, WebhookLog.webhook_id == webhook_id
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Delivery not found")

    try:
        stored = json.loads(log.payload)
    except (TypeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=422,
            detail="This delivery's payload is not readable, so it cannot be replayed.",
        )

    # The stored payload is the full envelope; deliver_webhook builds a fresh one,
    # so hand it back the inner data and let the timestamp be the replay's own.
    success = await WebhookService.deliver_webhook(
        db,
        webhook,
        log.event_type,
        stored.get("data", stored),
        config.allow_private_webhook_urls,
    )

    return {
        "success": success,
        "event": log.event_type,
        "replayed_from": log_id,
        "detail": (
            "Delivered." if success else "Delivery failed again — see the newest log entry."
        ),
    }


@router.get("/events/supported")
async def get_supported_events():
    """The subscribable events, each with the exact envelope it is delivered in."""
    return {
        "events": WebhookService.event_catalogue(),
        "signature": {
            "header": "X-Webhook-Signature",
            "format": "sha256=<hex hmac>",
            "signed_value": "the raw request body, verbatim",
            "algorithm": "HMAC-SHA256",
        },
    }
