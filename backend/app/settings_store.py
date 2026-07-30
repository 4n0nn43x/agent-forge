"""Runtime settings: database-backed, editable from the UI.

Everything that used to require an `.env` entry — provider credentials,
endpoints, model names, upload limits — lives in the `settings` table and is
edited at /settings in the web UI.

Resolution order for each setting: **database value → environment variable →
built-in default**. Keeping the environment as a middle layer means existing
deployments that still set `OPENROUTER_API_KEY` keep working unchanged, and
lets an orchestrator inject values without a UI round-trip.

Only bootstrap values stay environment-only, because they are needed before the
database can be read: DATABASE_URL, REDIS_URL, CHROMA_PERSIST_DIRECTORY,
CORS_ORIGINS, LOG_LEVEL/DEBUG, SECRET_KEY.
"""

import os
import time
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Setting
from .utils import crypto

logger = logging.getLogger(__name__)

# Cache duration. Short enough that a change made in one uvicorn worker is
# picked up by the others quickly, long enough to avoid a query per request.
CACHE_TTL_SECONDS = 5


@dataclass(frozen=True)
class SettingDef:
    key: str
    label: str
    kind: str  # text | password | number | bool
    default: Any
    env: Optional[str] = None
    group: str = "General"
    help: str = ""
    placeholder: str = ""
    warning: str = ""


SETTING_DEFS: List[SettingDef] = [
    SettingDef(
        key="openrouter_api_key",
        label="OpenRouter API key",
        kind="password",
        default="",
        env="OPENROUTER_API_KEY",
        group="OpenRouter",
        help="Required for hosted models. Leave empty to run on local Ollama models only.",
        placeholder="sk-or-v1-…",
    ),
    SettingDef(
        key="openrouter_base_url",
        label="OpenRouter base URL",
        kind="text",
        default="https://openrouter.ai/api/v1",
        env="OPENROUTER_BASE_URL",
        group="OpenRouter",
        help="Change only if you proxy OpenRouter.",
    ),
    SettingDef(
        key="openrouter_app_name",
        label="App name sent to OpenRouter",
        kind="text",
        default="AgentForge",
        env="OPENROUTER_APP_NAME",
        group="OpenRouter",
        help="Shown on OpenRouter's dashboard. Optional.",
    ),
    SettingDef(
        key="openrouter_site_url",
        label="Site URL sent to OpenRouter",
        kind="text",
        default="",
        env="OPENROUTER_SITE_URL",
        group="OpenRouter",
        help="Optional attribution header.",
        placeholder="https://example.com",
    ),
    SettingDef(
        key="ollama_base_url",
        label="Ollama endpoint",
        kind="text",
        default="http://localhost:11434",
        env="OLLAMA_BASE_URL",
        group="Ollama",
        help="From inside Docker, use http://host.docker.internal:11434.",
    ),
    SettingDef(
        key="embedding_model",
        label="Embedding model (Ollama)",
        kind="text",
        default="nomic-embed-text",
        env="EMBEDDING_MODEL",
        group="Ollama",
        help="Pull it first: ollama pull nomic-embed-text",
        warning=(
            "Changing this invalidates every indexed document: vector widths differ "
            "between models, so existing collections become unreadable and documents "
            "must be re-uploaded."
        ),
    ),
    SettingDef(
        key="default_llm_model",
        label="Default model",
        kind="text",
        default="openai/gpt-4o-mini",
        env="DEFAULT_LLM_MODEL",
        group="Models",
        help="Used when an agent is created without an explicit model.",
    ),
    SettingDef(
        key="max_upload_size_mb",
        label="Max upload size (MB)",
        kind="number",
        default=10,
        env="MAX_UPLOAD_SIZE_MB",
        group="Documents",
    ),
    SettingDef(
        key="allowed_extensions",
        label="Allowed file types",
        kind="text",
        default="pdf,txt,md,docx",
        env="ALLOWED_EXTENSIONS",
        group="Documents",
        help="Comma-separated. Only these four are actually parseable.",
    ),
    SettingDef(
        key="allow_private_webhook_urls",
        label="Allow webhooks to private addresses",
        kind="bool",
        default=False,
        env="ALLOW_PRIVATE_WEBHOOK_URLS",
        group="Webhooks",
        help="Off by default: blocks loopback, private and cloud-metadata targets.",
        warning="Enabling this exposes the server to request forgery. Use for local testing only.",
    ),
]

DEFS_BY_KEY: Dict[str, SettingDef] = {d.key: d for d in SETTING_DEFS}
SECRET_KEYS = {d.key for d in SETTING_DEFS if d.kind == "password"}

# Credential values that mean "not configured". Copying `.env.example` to `.env`
# used to leave `OPENROUTER_API_KEY=your_openrouter_api_key_here` in place, which
# the app happily forwarded — producing an opaque 401 from OpenRouter instead of a
# clear "no key configured" message.
#
# Only applied to secrets: a marker like "changeme" is meaningless in a key but
# could legitimately appear in a URL or a model name.
_PLACEHOLDER_MARKERS = ("your_", "_here", "changeme", "change_me", "todo")


def is_placeholder_secret(raw: Any) -> bool:
    if raw is None:
        return True
    text = str(raw).strip()
    if not text:
        return True
    if text.startswith("<") and text.endswith(">"):
        return True
    lowered = text.lower()
    return any(marker in lowered for marker in _PLACEHOLDER_MARKERS)


@dataclass(frozen=True)
class RuntimeConfig:
    """Resolved settings, safe to pass around."""

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_app_name: str = "AgentForge"
    openrouter_site_url: str = ""
    ollama_base_url: str = "http://localhost:11434"
    embedding_model: str = "nomic-embed-text"
    default_llm_model: str = "openai/gpt-4o-mini"
    max_upload_size_mb: int = 10
    allowed_extensions: List[str] = field(default_factory=lambda: ["pdf", "txt", "md", "docx"])
    allow_private_webhook_urls: bool = False

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


def _coerce(definition: SettingDef, raw: Any) -> Any:
    if raw is None or raw == "":
        return definition.default if definition.kind != "text" else (raw or definition.default)

    if definition.kind == "number":
        try:
            return int(raw)
        except (TypeError, ValueError):
            logger.warning(f"Setting {definition.key}: {raw!r} is not a number, using default")
            return definition.default
    if definition.kind == "bool":
        if isinstance(raw, bool):
            return raw
        return str(raw).strip().lower() in ("1", "true", "yes", "on")
    return str(raw)


class SettingsStore:
    _cache: Optional[Dict[str, Any]] = None
    _cache_at: float = 0.0

    @classmethod
    def invalidate(cls) -> None:
        cls._cache = None
        cls._cache_at = 0.0

    @classmethod
    async def _raw_values(cls, db: AsyncSession) -> Dict[str, Any]:
        """Resolved raw values (db > env > default), with a short-lived cache."""
        now = time.monotonic()
        if cls._cache is not None and (now - cls._cache_at) < CACHE_TTL_SECONDS:
            return cls._cache

        rows = (await db.execute(select(Setting))).scalars().all()
        stored = {row.key: row for row in rows}

        values: Dict[str, Any] = {}
        for definition in SETTING_DEFS:
            row = stored.get(definition.key)
            is_secret = definition.kind == "password"
            raw = None

            if row is not None and row.value not in (None, ""):
                raw = crypto.decrypt(row.value) if row.is_secret else row.value

            if raw in (None, ""):
                raw = os.getenv(definition.env) if definition.env else None

            if is_secret and is_placeholder_secret(raw):
                raw = None

            values[definition.key] = _coerce(definition, raw)

        cls._cache = values
        cls._cache_at = now
        return values

    @classmethod
    async def resolve(cls, db: AsyncSession) -> RuntimeConfig:
        values = dict(await cls._raw_values(db))
        extensions = [
            e.strip().lstrip(".").lower()
            for e in str(values.get("allowed_extensions") or "").split(",")
            if e.strip()
        ]
        values["allowed_extensions"] = extensions or ["pdf", "txt", "md", "docx"]
        return RuntimeConfig(**values)

    @classmethod
    async def describe(cls, db: AsyncSession) -> List[Dict[str, Any]]:
        """Settings for the UI. Secrets are masked, never returned in clear."""
        values = await cls._raw_values(db)
        rows = (await db.execute(select(Setting))).scalars().all()
        stored_keys = {row.key for row in rows if row.value not in (None, "")}

        described = []
        for definition in SETTING_DEFS:
            value = values.get(definition.key)
            is_secret = definition.key in SECRET_KEYS
            described.append(
                {
                    "key": definition.key,
                    "label": definition.label,
                    "kind": definition.kind,
                    "group": definition.group,
                    "help": definition.help,
                    "placeholder": definition.placeholder,
                    "warning": definition.warning,
                    "value": crypto.mask(value) if is_secret else value,
                    "is_secret": is_secret,
                    "is_set": bool(value),
                    # True when the value comes from the environment rather than
                    # the database, so the UI can say it is managed elsewhere.
                    "from_env": definition.key not in stored_keys and bool(value),
                }
            )
        return described

    @classmethod
    async def save(cls, db: AsyncSession, updates: Dict[str, Any]) -> List[str]:
        """Persist settings. Unknown keys are rejected.

        A secret submitted as an empty string is left untouched (the UI shows a
        mask, so an untouched field must not wipe the stored value). Send the
        literal string "__clear__" to remove one.
        """
        unknown = sorted(set(updates) - set(DEFS_BY_KEY))
        if unknown:
            raise ValueError(f"Unknown setting(s): {', '.join(unknown)}")

        rows = (await db.execute(select(Setting))).scalars().all()
        existing = {row.key: row for row in rows}
        changed: List[str] = []

        for key, raw in updates.items():
            definition = DEFS_BY_KEY[key]
            is_secret = key in SECRET_KEYS

            if is_secret:
                if raw in (None, ""):
                    continue  # untouched masked field
                if raw == "__clear__":
                    stored_value = None
                elif is_placeholder_secret(raw):
                    raise ValueError(
                        f"{definition.label}: '{raw}' looks like a placeholder, "
                        "not a real credential."
                    )
                else:
                    stored_value = crypto.encrypt(str(raw))
            else:
                if definition.kind == "bool":
                    stored_value = "true" if _coerce(definition, raw) else "false"
                else:
                    stored_value = "" if raw is None else str(raw)

            row = existing.get(key)
            if row is None:
                db.add(Setting(key=key, value=stored_value, is_secret=1 if is_secret else 0))
            else:
                row.value = stored_value
                row.is_secret = 1 if is_secret else 0
            changed.append(key)

        await db.commit()
        cls.invalidate()
        return changed
