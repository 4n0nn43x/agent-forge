"""LLM provider resolution.

AgentForge supports exactly two providers:

- **OpenRouter** — hosted models, reached through its OpenAI-compatible endpoint.
  Model ids are namespaced: ``vendor/model`` (e.g. ``meta-llama/llama-3.3-70b-instruct``).
- **Ollama** — models running locally. Model ids are plain tags (e.g. ``llama3.2:8b``).

The provider is inferred from the model id. Prefix a model with ``openrouter:`` or
``ollama:`` to force a provider when the heuristic would guess wrong (Ollama models
pulled from a custom registry can contain a slash).

Credentials and endpoints arrive as a `RuntimeConfig` (see `settings_store`), not
from the environment: they are configured in the UI.
"""

import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

OPENROUTER = "openrouter"
OLLAMA = "ollama"

_PREFIXES = {f"{OPENROUTER}:": OPENROUTER, f"{OLLAMA}:": OLLAMA}

# Curated picks, in the order we would suggest trying them. `note` says why it is
# on the list, so the choice in the agent builder is informed rather than a
# wall of identical-looking ids.
RECOMMENDED_OPENROUTER_MODELS = [
    {
        "value": "openai/gpt-4o-mini",
        "label": "GPT-4o mini",
        "note": "Cheapest sensible default. Start here.",
    },
    {
        "value": "anthropic/claude-sonnet-4.5",
        "label": "Claude Sonnet 4.5",
        "note": "Best at following a long system prompt and staying in the documents.",
    },
    {
        "value": "openai/gpt-4o",
        "label": "GPT-4o",
        "note": "Strong all-rounder when mini is not enough.",
    },
    {
        "value": "google/gemini-2.0-flash-001",
        "label": "Gemini 2.0 Flash",
        "note": "Fast and cheap on long contexts.",
    },
    {
        "value": "meta-llama/llama-3.3-70b-instruct",
        "label": "Llama 3.3 70B Instruct",
        "note": "Open weights, hosted — no local GPU needed.",
    },
    {
        "value": "deepseek/deepseek-chat",
        "label": "DeepSeek Chat",
        "note": "Very low cost per token.",
    },
    {
        "value": "mistralai/mistral-large",
        "label": "Mistral Large",
        "note": "European hosting if that matters to you.",
    },
]

RECOMMENDED_OLLAMA_MODELS = [
    {"value": "llama3.2", "label": "Llama 3.2"},
    {"value": "qwen2.5", "label": "Qwen 2.5"},
    {"value": "mistral", "label": "Mistral 7B"},
    {"value": "phi4", "label": "Phi-4"},
]


def resolve_provider(model: str) -> Tuple[str, str]:
    """Split a model id into ``(provider, bare_model_name)``."""
    name = (model or "").strip()
    if not name:
        raise ValueError("Model name is empty")

    for prefix, provider in _PREFIXES.items():
        if name.lower().startswith(prefix):
            bare = name[len(prefix):].strip()
            if not bare:
                raise ValueError(f"Model name is empty after the '{prefix}' prefix")
            return provider, bare

    # OpenRouter ids are always namespaced; bare tags belong to Ollama.
    return (OPENROUTER, name) if "/" in name else (OLLAMA, name)


def build_chat_model(model: str, temperature: float, max_tokens: int, config):
    """Build a LangChain chat model for the given agent model id."""
    provider, model_name = resolve_provider(model)

    if provider == OPENROUTER:
        from langchain_openai import ChatOpenAI

        if not config.openrouter_api_key:
            raise ValueError(
                "No OpenRouter API key configured. Add one under Settings, "
                "or pick an Ollama model instead."
            )

        # Optional attribution headers used by OpenRouter's dashboard.
        default_headers = {}
        if config.openrouter_site_url:
            default_headers["HTTP-Referer"] = config.openrouter_site_url
        if config.openrouter_app_name:
            default_headers["X-Title"] = config.openrouter_app_name

        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=config.openrouter_api_key,
            base_url=config.openrouter_base_url,
            default_headers=default_headers or None,
        )

    from langchain_ollama import ChatOllama

    return ChatOllama(
        model=model_name,
        temperature=temperature,
        num_predict=max_tokens,
        base_url=config.ollama_base_url,
    )


def build_embeddings(config):
    """Build the embedding model.

    OpenRouter has no embeddings endpoint, so embeddings always run on Ollama.
    """
    from langchain_ollama import OllamaEmbeddings

    model_name = (config.embedding_model or "nomic-embed-text").strip()
    # Tolerate an explicit "ollama:" prefix; anything else is used verbatim so
    # that tags like "nomic-embed-text:v1.5" keep working.
    if model_name.lower().startswith(f"{OLLAMA}:"):
        model_name = model_name[len(OLLAMA) + 1:].strip()

    logger.info(f"Using Ollama embeddings: {model_name} ({config.ollama_base_url})")
    return OllamaEmbeddings(model=model_name, base_url=config.ollama_base_url)


async def list_ollama_models(config) -> List[Dict[str, Any]]:
    """Query the Ollama daemon for pulled models. Returns [] if unreachable."""
    import aiohttp

    url = f"{config.ollama_base_url.rstrip('/')}/api/tags"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=3)) as resp:
                if resp.status != 200:
                    logger.debug(f"Ollama /api/tags returned HTTP {resp.status}")
                    return []
                data = await resp.json()
    except Exception as e:  # network error, daemon down, bad JSON...
        logger.debug(f"Could not reach Ollama at {url}: {e}")
        return []

    models = []
    for entry in data.get("models", []):
        name = entry.get("name") or entry.get("model")
        if name:
            models.append({"value": name, "label": name, "installed": True})
    return models


async def list_openrouter_models(config) -> List[Dict[str, Any]]:
    """Fetch OpenRouter's live catalogue. Returns [] without a key or on failure."""
    if not config.openrouter_api_key:
        return []

    import aiohttp

    url = f"{config.openrouter_base_url.rstrip('/')}/models"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                headers={"Authorization": f"Bearer {config.openrouter_api_key}"},
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                if resp.status != 200:
                    logger.debug(f"OpenRouter /models returned HTTP {resp.status}")
                    return []
                data = await resp.json()
    except Exception as e:
        logger.debug(f"Could not fetch the OpenRouter catalogue: {e}")
        return []

    models = []
    for entry in data.get("data", []):
        model_id = entry.get("id")
        if not model_id:
            continue
        pricing = entry.get("pricing") or {}
        models.append(
            {
                "value": model_id,
                "label": entry.get("name") or model_id,
                # Per-million-token prompt price, which is how people compare them.
                "prompt_price": _per_million(pricing.get("prompt")),
                "context": entry.get("context_length"),
            }
        )
    return models


def _per_million(price: Any) -> Any:
    """OpenRouter quotes per-token prices as strings; per million is readable."""
    try:
        return round(float(price) * 1_000_000, 3)
    except (TypeError, ValueError):
        return None


async def check_openrouter(config) -> Dict[str, Any]:
    """Validate the OpenRouter credentials without spending tokens."""
    if not config.openrouter_api_key:
        return {"ok": False, "detail": "No API key configured"}

    import aiohttp

    url = f"{config.openrouter_base_url.rstrip('/')}/key"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                headers={"Authorization": f"Bearer {config.openrouter_api_key}"},
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                body = await resp.text()
                if resp.status == 200:
                    return {"ok": True, "detail": "Key accepted"}
                if resp.status in (401, 403):
                    return {"ok": False, "detail": "Key rejected by OpenRouter"}
                return {"ok": False, "detail": f"HTTP {resp.status}: {body[:120]}"}
    except Exception as e:
        return {"ok": False, "detail": f"Could not reach OpenRouter: {e}"}


async def check_ollama(config) -> Dict[str, Any]:
    """Check that Ollama answers and that the embedding model is pulled."""
    models = await list_ollama_models(config)
    if not models:
        return {
            "ok": False,
            "detail": f"No response from {config.ollama_base_url}",
        }

    names = {m["value"] for m in models}
    wanted = config.embedding_model
    has_embedding = wanted in names or f"{wanted}:latest" in names

    return {
        "ok": True,
        "detail": f"{len(models)} model(s) available",
        "models": sorted(names),
        "embedding_model_ready": has_embedding,
        "embedding_warning": (
            None
            if has_embedding
            else f"'{wanted}' is not pulled — run: ollama pull {wanted}"
        ),
    }


async def list_available_models(config) -> Dict[str, Any]:
    """Model catalogue for the agent builder.

    Recommended models come first and carry a `note` saying why; the rest of
    OpenRouter's live catalogue follows so a specific model can still be picked.
    """
    ollama_installed = await list_ollama_models(config)
    installed_names = {m["value"] for m in ollama_installed}

    # Installed tags first — they are the ones that can actually run — then the
    # suggestions to pull.
    ollama_models = ollama_installed + [
        {**m, "installed": False}
        for m in RECOMMENDED_OLLAMA_MODELS
        if m["value"] not in installed_names
        and f"{m['value']}:latest" not in installed_names
    ]

    live = await list_openrouter_models(config)
    live_by_id = {m["value"]: m for m in live}
    recommended_ids = {m["value"] for m in RECOMMENDED_OPENROUTER_MODELS}

    openrouter_models = [
        # Keep the curated label and note, take price and context from the live entry.
        {**live_by_id.get(pick["value"], {}), **pick, "recommended": True}
        for pick in RECOMMENDED_OPENROUTER_MODELS
    ]
    openrouter_models += [
        {**model, "recommended": False}
        for model in sorted(live, key=lambda m: m["value"])
        if model["value"] not in recommended_ids
    ]

    return {
        "providers": {
            OPENROUTER: {
                "label": "OpenRouter",
                "configured": bool(config.openrouter_api_key),
                # True when the live catalogue answered, so the UI can say whether
                # it is showing everything or only the curated picks.
                "live": bool(live),
                "models": openrouter_models,
            },
            OLLAMA: {
                "label": "Ollama (local)",
                "configured": bool(ollama_installed),
                "models": ollama_models,
            },
        }
    }
