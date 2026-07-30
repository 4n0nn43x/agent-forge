"""API routes for agent management"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import noload
from typing import List, Optional
import logging

from ..database import get_db
from ..dependencies import get_agent_manager, get_config
from ..settings_store import RuntimeConfig
from ..models import (
    Agent,
    APIKey,
    Conversation,
    Document,
    Message,
    Webhook,
    WebhookLog,
    AgentCreate,
    AgentUpdate,
    AgentResponse,
)
from ..agents.templates import list_templates, apply_template
from ..agents.providers import list_available_models, resolve_provider
from ..utils.webhook_service import WebhookService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/templates")
async def get_templates():
    """Get all available agent templates"""
    return {"templates": list_templates()}


@router.get("/models")
async def get_models(config: RuntimeConfig = Depends(get_config)):
    """Get the model catalogue (OpenRouter recommendations + installed Ollama tags)"""
    return await list_available_models(config)


@router.post("/from-template")
async def create_agent_from_template(
    template_name: str,
    agent_name: str,
    llm_model: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    config: RuntimeConfig = Depends(get_config),
):
    """Create an agent from a template"""
    try:
        agent_config = apply_template(
            template_name, agent_name, llm_model or config.default_llm_model
        )

        agent = Agent(**agent_config)
        db.add(agent)
        await db.commit()
        await db.refresh(agent)

        return await get_agent_response(agent, db)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating agent from template: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=AgentResponse)
async def create_agent(agent_data: AgentCreate, db: AsyncSession = Depends(get_db)):
    """Create a new agent"""
    # Validated outside the try below, whose broad handler would turn a 400 into a 500.
    try:
        resolve_provider(agent_data.llm_model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        # If template is specified, apply it first then override with provided values
        if agent_data.template_name:
            try:
                agent_config = apply_template(
                    agent_data.template_name, agent_data.name, agent_data.llm_model
                )
                # Override template values with provided values
                for key, value in agent_data.model_dump(exclude_unset=True).items():
                    if value is not None:
                        agent_config[key] = value
                agent = Agent(**agent_config)
            except ValueError:
                # Template not found, create from scratch
                agent = Agent(**agent_data.model_dump())
        else:
            # Create from scratch
            agent_dict = agent_data.model_dump()
            # Ensure system_prompt has a default if not provided
            if not agent_dict.get("system_prompt"):
                agent_dict["system_prompt"] = (
                    "You are a helpful AI assistant. Answer questions clearly and concisely."
                )
            agent = Agent(**agent_dict)

        db.add(agent)
        await db.commit()
        await db.refresh(agent)

        logger.info(f"Created agent: {agent.name} (ID: {agent.id})")
        return await get_agent_response(agent, db)

    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[AgentResponse])
async def list_agents(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    """List all agents"""
    result = await db.execute(
        select(Agent)
        .options(noload(Agent.documents), noload(Agent.conversations))
        .offset(skip)
        .limit(limit)
        .order_by(Agent.created_at.desc())
    )
    agents = result.scalars().all()

    return [await get_agent_response(agent, db) for agent in agents]


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific agent"""
    result = await db.execute(
        select(Agent)
        .options(noload(Agent.documents), noload(Agent.conversations))
        .where(Agent.id == agent_id)
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    return await get_agent_response(agent, db)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    agent_data: AgentUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Update an agent"""
    result = await db.execute(
        select(Agent)
        .options(noload(Agent.documents), noload(Agent.conversations))
        .where(Agent.id == agent_id)
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    # Update fields
    update_data = agent_data.model_dump(exclude_unset=True)

    if update_data.get("llm_model"):
        # Fail fast on a model id that maps to no provider.
        try:
            resolve_provider(update_data["llm_model"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    for field, value in update_data.items():
        setattr(agent, field, value)

    await db.commit()
    await db.refresh(agent)

    logger.info(f"Updated agent: {agent.name} (ID: {agent.id})")

    background_tasks.add_task(
        WebhookService.trigger_webhooks_detached,
        agent_id,
        "agent.updated",
        {"agent_id": agent_id, "name": agent.name, "updated_fields": sorted(update_data)},
    )

    return await get_agent_response(agent, db)


@router.delete("/{agent_id}")
async def delete_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an agent"""
    result = await db.execute(
        select(Agent)
        .options(noload(Agent.documents), noload(Agent.conversations))
        .where(Agent.id == agent_id)
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    agent_name = agent.name

    # Delete the children explicitly, leaves first.
    #
    # The ORM cascades cannot fire here: the query above uses noload(), so the
    # collections are never loaded, and an async session will not lazy-load them
    # during flush either. The result was a bare DELETE FROM agents, which used to
    # "succeed" only because SQLite ignored foreign keys — leaving orphan rows
    # behind — and started failing outright once the pragma was enabled.
    #
    # Doing it in statements also keeps the cost flat: an agent with 50k messages
    # is seven queries, not 50k objects loaded into memory.
    conversation_ids = select(Conversation.id).where(Conversation.agent_id == agent_id)
    webhook_ids = select(Webhook.id).where(Webhook.agent_id == agent_id)

    await db.execute(delete(WebhookLog).where(WebhookLog.webhook_id.in_(webhook_ids)))
    await db.execute(delete(Webhook).where(Webhook.agent_id == agent_id))
    await db.execute(delete(APIKey).where(APIKey.agent_id == agent_id))
    await db.execute(delete(Message).where(Message.conversation_id.in_(conversation_ids)))
    await db.execute(delete(Conversation).where(Conversation.agent_id == agent_id))
    await db.execute(delete(Document).where(Document.agent_id == agent_id))
    await db.execute(delete(Agent).where(Agent.id == agent_id))
    await db.commit()

    # The SQL cascade doesn't reach ChromaDB; drop the collection too, otherwise
    # its vectors outlive the agent and are inherited by the next agent that
    # happens to reuse the id.
    try:
        get_agent_manager().vector_store.delete_agent_collection(agent_id, missing_ok=True)
    except Exception as e:
        logger.error(f"Agent {agent_id} deleted but its vector collection remains: {e}")

    logger.info(f"Deleted agent: {agent_name} (ID: {agent_id})")
    return {"message": f"Agent {agent_id} deleted successfully"}


@router.post("/{agent_id}/duplicate", response_model=AgentResponse)
async def duplicate_agent(agent_id: int, new_name: str, db: AsyncSession = Depends(get_db)):
    """Duplicate an existing agent"""
    result = await db.execute(
        select(Agent)
        .options(noload(Agent.documents), noload(Agent.conversations))
        .where(Agent.id == agent_id)
    )
    original = result.scalar_one_or_none()

    if not original:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    # Create new agent with same config
    new_agent = Agent(
        name=new_name,
        description=original.description,
        llm_model=original.llm_model,
        system_prompt=original.system_prompt,
        temperature=original.temperature,
        max_tokens=original.max_tokens,
        personality=original.personality,
        guardrails=original.guardrails,
        template_name=original.template_name,
        config=original.config,
    )

    db.add(new_agent)
    await db.commit()
    await db.refresh(new_agent)

    logger.info(f"Duplicated agent {agent_id} as {new_agent.id}")
    return await get_agent_response(new_agent, db)


# Helper function
async def get_agent_response(agent: Agent, db: AsyncSession) -> AgentResponse:
    """Build AgentResponse with counts"""
    # Get document count
    doc_count_result = await db.execute(
        select(func.count(Document.id)).where(Document.agent_id == agent.id)
    )
    doc_count = doc_count_result.scalar() or 0

    # Get conversation count
    conv_count_result = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.agent_id == agent.id)
    )
    conv_count = conv_count_result.scalar() or 0

    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        llm_model=agent.llm_model,
        system_prompt=agent.system_prompt,
        temperature=agent.temperature,
        max_tokens=agent.max_tokens,
        personality=agent.personality,
        guardrails=agent.guardrails,
        template_name=agent.template_name,
        config=agent.config,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        document_count=doc_count,
        conversation_count=conv_count,
    )
