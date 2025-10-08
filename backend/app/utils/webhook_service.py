"""Webhook delivery service"""

import json
import hmac
import hashlib
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models import Webhook, WebhookLog

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for managing and delivering webhooks"""

    SUPPORTED_EVENTS = [
        "message.sent",           # When a message is sent (user or assistant)
        "conversation.started",   # When a new conversation is created
        "conversation.ended",     # When a conversation is marked as ended
        "document.uploaded",      # When a document is uploaded
        "agent.updated",          # When agent configuration is updated
    ]

    @staticmethod
    def generate_signature(payload: str, secret: str) -> str:
        """
        Generate HMAC-SHA256 signature for webhook payload

        Args:
            payload: JSON string of the payload
            secret: Webhook secret key

        Returns:
            Hex digest of the signature
        """
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    @staticmethod
    async def get_active_webhooks(
        db: AsyncSession,
        agent_id: int,
        event_type: str
    ) -> List[Webhook]:
        """
        Get all active webhooks for an agent that listen to a specific event

        Args:
            db: Database session
            agent_id: Agent ID
            event_type: Type of event (e.g., "message.sent")

        Returns:
            List of active webhooks
        """
        result = await db.execute(
            select(Webhook).where(
                Webhook.agent_id == agent_id,
                Webhook.is_active == 1
            )
        )
        webhooks = result.scalars().all()

        # Filter webhooks that listen to this event
        filtered_webhooks = []
        for webhook in webhooks:
            events = webhook.events.split(',') if webhook.events else []
            events = [e.strip() for e in events]
            if event_type in events or "*" in events:
                filtered_webhooks.append(webhook)

        return filtered_webhooks

    @staticmethod
    async def deliver_webhook(
        db: AsyncSession,
        webhook: Webhook,
        event_type: str,
        payload: Dict[str, Any]
    ) -> bool:
        """
        Deliver a webhook with retry logic

        Args:
            db: Database session
            webhook: Webhook instance
            event_type: Type of event
            payload: Event payload

        Returns:
            True if delivery succeeded, False otherwise
        """
        # Prepare payload
        full_payload = {
            "event": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "agent_id": webhook.agent_id,
            "data": payload
        }

        payload_json = json.dumps(full_payload)

        # Prepare headers
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AgentForge-Webhook/1.0"
        }

        # Add signature if secret is provided
        if webhook.secret:
            signature = WebhookService.generate_signature(payload_json, webhook.secret)
            headers["X-Webhook-Signature"] = f"sha256={signature}"

        # Add custom headers
        if webhook.headers:
            try:
                custom_headers = json.loads(webhook.headers)
                headers.update(custom_headers)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in webhook headers for webhook {webhook.id}")

        # Attempt delivery with retries
        retry_count = webhook.retry_count
        success = False
        last_error = None
        last_status_code = None
        last_response_body = None

        for attempt in range(retry_count + 1):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        webhook.url,
                        headers=headers,
                        data=payload_json,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        last_status_code = response.status
                        last_response_body = await response.text()

                        # Consider 2xx status codes as success
                        if 200 <= response.status < 300:
                            success = True
                            break
                        else:
                            last_error = f"HTTP {response.status}: {last_response_body[:200]}"

            except aiohttp.ClientError as e:
                last_error = f"Network error: {str(e)}"
                logger.warning(f"Webhook delivery failed (attempt {attempt + 1}/{retry_count + 1}): {last_error}")

            except asyncio.TimeoutError:
                last_error = "Request timeout"
                logger.warning(f"Webhook delivery timeout (attempt {attempt + 1}/{retry_count + 1})")

            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"
                logger.error(f"Unexpected error during webhook delivery: {e}")

            # Wait before retry (exponential backoff)
            if attempt < retry_count:
                await asyncio.sleep(2 ** attempt)  # 1s, 2s, 4s, 8s...

        # Log the delivery attempt
        webhook_log = WebhookLog(
            webhook_id=webhook.id,
            event_type=event_type,
            payload=payload_json,
            status_code=last_status_code,
            response_body=last_response_body[:1000] if last_response_body else None,  # Limit size
            success=1 if success else 0,
            error_message=last_error if not success else None
        )
        db.add(webhook_log)

        # Update last_triggered_at
        webhook.last_triggered_at = datetime.utcnow()

        await db.commit()

        return success

    @staticmethod
    async def trigger_webhooks(
        db: AsyncSession,
        agent_id: int,
        event_type: str,
        payload: Dict[str, Any]
    ) -> int:
        """
        Trigger all webhooks for an agent for a specific event

        Args:
            db: Database session
            agent_id: Agent ID
            event_type: Type of event
            payload: Event payload

        Returns:
            Number of webhooks triggered
        """
        # Validate event type
        if event_type not in WebhookService.SUPPORTED_EVENTS:
            logger.warning(f"Unsupported event type: {event_type}")
            return 0

        # Get active webhooks
        webhooks = await WebhookService.get_active_webhooks(db, agent_id, event_type)

        if not webhooks:
            logger.debug(f"No active webhooks found for agent {agent_id} and event {event_type}")
            return 0

        logger.info(f"Triggering {len(webhooks)} webhooks for event {event_type}")

        # Deliver webhooks asynchronously
        tasks = [
            WebhookService.deliver_webhook(db, webhook, event_type, payload)
            for webhook in webhooks
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Count successful deliveries
        success_count = sum(1 for result in results if result is True)

        logger.info(f"Webhook delivery complete: {success_count}/{len(webhooks)} successful")

        return len(webhooks)
