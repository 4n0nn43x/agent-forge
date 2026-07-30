"""Webhook delivery service"""

import os
import json
import hmac
import socket
import hashlib
import logging
import asyncio
import ipaddress
from typing import Dict, Any, List
from urllib.parse import urlparse
import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models import Webhook, WebhookLog
from .timeutils import utcnow

logger = logging.getLogger(__name__)


class WebhookUrlError(ValueError):
    """Raised when a webhook URL is not allowed."""


class WebhookService:
    """Service for managing and delivering webhooks"""

    SUPPORTED_EVENTS = [
        "message.sent",           # When a message is sent (user or assistant)
        "conversation.started",   # When a new conversation is created
        "conversation.ended",     # When a conversation is marked as ended
        "document.uploaded",      # When a document is uploaded
        "agent.updated",          # When agent configuration is updated
    ]

    # Delivered on demand from the "test" endpoint; not subscribable.
    TEST_EVENT = "test.webhook"

    @staticmethod
    def validate_url(url: str, allow_private: bool = None) -> str:
        """Validate a webhook target URL.

        Webhook URLs are attacker-controlled input that the server then fetches,
        so an unvalidated URL is a server-side request forgery primitive: it can
        reach the loopback interface, private networks, or a cloud metadata
        endpoint, and the response body is stored in the delivery log where it
        can be read back.

        Private targets can be allowed from Settings ("Allow webhooks to private
        addresses"), which is useful when testing against a service on the same
        Docker network. `allow_private=None` falls back to the environment so
        that callers without a settings session still behave sanely.
        """
        parsed = urlparse((url or "").strip())

        if parsed.scheme not in ("http", "https"):
            raise WebhookUrlError("Webhook URL must use http:// or https://")

        if not parsed.hostname:
            raise WebhookUrlError("Webhook URL has no host")

        if allow_private is None:
            allow_private = os.getenv("ALLOW_PRIVATE_WEBHOOK_URLS", "false").lower() == "true"

        if allow_private:
            return url.strip()

        hostname = parsed.hostname

        try:
            infos = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
        except socket.gaierror as e:
            raise WebhookUrlError(f"Could not resolve webhook host '{hostname}': {e}")

        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local          # 169.254.0.0/16 — cloud metadata
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            ):
                raise WebhookUrlError(
                    f"Webhook URL resolves to a non-public address ({ip}). "
                    "Enable 'Allow webhooks to private addresses' in Settings "
                    "if this is intentional."
                )

        return url.strip()

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
        payload: Dict[str, Any],
        allow_private: bool = None,
    ) -> bool:
        """
        Deliver a webhook with retry logic

        Args:
            db: Database session
            webhook: Webhook instance
            event_type: Type of event
            payload: Event payload
            allow_private: Permit non-public target addresses

        Returns:
            True if delivery succeeded, False otherwise
        """
        # Prepare payload
        full_payload = {
            "event": event_type,
            "timestamp": utcnow().isoformat(),
            "agent_id": webhook.agent_id,
            "data": payload
        }

        payload_json = json.dumps(full_payload)

        # Re-check the target just before the request: the URL may have been
        # stored before validation existed, and DNS answers can change.
        try:
            target_url = WebhookService.validate_url(webhook.url, allow_private)
        except WebhookUrlError as e:
            logger.warning(f"Refusing to deliver webhook {webhook.id}: {e}")
            db.add(
                WebhookLog(
                    webhook_id=webhook.id,
                    event_type=event_type,
                    payload=payload_json,
                    success=0,
                    error_message=str(e),
                )
            )
            await db.commit()
            return False

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
                        target_url,
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
        webhook.last_triggered_at = utcnow()

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
        if event_type not in WebhookService.SUPPORTED_EVENTS and event_type != WebhookService.TEST_EVENT:
            logger.warning(f"Unsupported event type: {event_type}")
            return 0

        # Get active webhooks
        webhooks = await WebhookService.get_active_webhooks(db, agent_id, event_type)

        if not webhooks:
            logger.debug(f"No active webhooks found for agent {agent_id} and event {event_type}")
            return 0

        logger.info(f"Triggering {len(webhooks)} webhooks for event {event_type}")

        # Resolve the SSRF policy once for the whole batch.
        from ..settings_store import SettingsStore

        allow_private = (await SettingsStore.resolve(db)).allow_private_webhook_urls

        # Deliver webhooks asynchronously
        tasks = [
            WebhookService.deliver_webhook(db, webhook, event_type, payload, allow_private)
            for webhook in webhooks
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Count successful deliveries
        success_count = sum(1 for result in results if result is True)

        logger.info(f"Webhook delivery complete: {success_count}/{len(webhooks)} successful")

        return len(webhooks)

    @staticmethod
    async def trigger_webhooks_detached(
        agent_id: int,
        event_type: str,
        payload: Dict[str, Any],
    ) -> None:
        """Trigger webhooks from a background task.

        Delivery used to run inline in the request handler: with the default 3
        retries, exponential backoff and a 30s timeout each, an unreachable
        endpoint could stall a chat response for over 90 seconds. Background
        tasks run after the response is sent, so they need their own session —
        the request-scoped one is already closed by then.
        """
        from ..database import AsyncSessionLocal

        try:
            async with AsyncSessionLocal() as db:
                await WebhookService.trigger_webhooks(db, agent_id, event_type, payload)
        except Exception as e:
            logger.error(f"Background webhook delivery failed for agent {agent_id}: {e}")
