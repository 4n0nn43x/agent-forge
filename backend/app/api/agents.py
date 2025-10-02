"""API routes for agent management"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import os
import logging

from ..database import get_db
from ..models import (
    Agent,
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    DocumentUpload,
)
from ..agents.templates import list_templates, apply_template

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/templates")
async def get_templates():
    """Get all available agent templates"""
    return {"templates": list_templates()}


@router.post("/from-template")
async def create_agent_from_template(
    template_name: str,
    agent_name: str,
    llm_model: str = "gpt-4",
    db: AsyncSession = Depends(get_db),
):
    """Create an agent from a template"""
    try:
        config = apply_template(template_name, agent_name, llm_model)

        agent = Agent(**config)
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
    try:
        # If template is specified, apply it first then override with provided values
        if agent_data.template_name:
            try:
                config = apply_template(
                    agent_data.template_name, agent_data.name, agent_data.llm_model
                )
                # Override template values with provided values
                for key, value in agent_data.model_dump(exclude_unset=True).items():
                    if value is not None:
                        config[key] = value
                agent = Agent(**config)
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
        select(Agent).offset(skip).limit(limit).order_by(Agent.created_at.desc())
    )
    agents = result.scalars().all()

    return [await get_agent_response(agent, db) for agent in agents]


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific agent"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    return await get_agent_response(agent, db)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int, agent_data: AgentUpdate, db: AsyncSession = Depends(get_db)
):
    """Update an agent"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    # Update fields
    update_data = agent_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)

    await db.commit()
    await db.refresh(agent)

    logger.info(f"Updated agent: {agent.name} (ID: {agent.id})")
    return await get_agent_response(agent, db)


@router.delete("/{agent_id}")
async def delete_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an agent"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    # Delete agent (cascade will handle documents and conversations)
    await db.delete(agent)
    await db.commit()

    logger.info(f"Deleted agent: {agent.name} (ID: {agent.id})")
    return {"message": f"Agent {agent_id} deleted successfully"}


@router.post("/{agent_id}/duplicate", response_model=AgentResponse)
async def duplicate_agent(agent_id: int, new_name: str, db: AsyncSession = Depends(get_db)):
    """Duplicate an existing agent"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
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
    from ..models import Document, Conversation

    # Get document count
    doc_count_result = await db.execute(
        select(func.count()).select_from(Document).where(Document.agent_id == agent.id)
    )
    doc_count = doc_count_result.scalar() or 0

    # Get conversation count
    conv_count_result = await db.execute(
        select(func.count()).select_from(Conversation).where(Conversation.agent_id == agent.id)
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
