"""Pydantic models for the multi-agent coding pipeline."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime, timezone


class AgentType(str, Enum):
    ARCHITECT = "architect"
    SPEC_WRITER = "spec_writer"
    TASK_DECOMPOSER = "task_decomposer"
    CODER = "coder"
    TESTER = "tester"
    DEBUGGER = "debugger"
    OPTIMIZER = "optimizer"


class AgentMessage(BaseModel):
    agent_type: AgentType
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CodeFile(BaseModel):
    path: str
    content: str
    language: str = ""
    description: str = ""


class CodingTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str
    description: str
    status: str = "pending"  # pending, in_progress, completed, failed
    assigned_to: str = ""
    dependencies: List[str] = Field(default_factory=list)
    output_files: List[CodeFile] = Field(default_factory=list)
    test_results: Optional[str] = None
    error: Optional[str] = None


class ArchitecturePlan(BaseModel):
    overview: str = ""
    components: List[Dict[str, Any]] = Field(default_factory=list)
    data_flow: List[Dict[str, str]] = Field(default_factory=list)
    tech_stack: List[str] = Field(default_factory=list)
    directory_structure: List[str] = Field(default_factory=list)


class Specification(BaseModel):
    functional_requirements: List[str] = Field(default_factory=list)
    api_endpoints: List[Dict[str, Any]] = Field(default_factory=list)
    data_models: List[Dict[str, Any]] = Field(default_factory=list)
    error_handling: List[str] = Field(default_factory=list)


class OrchestrationState(BaseModel):
    """Mutable state object passed through the entire coding pipeline."""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str = ""
    architecture: Optional[ArchitecturePlan] = None
    specification: Optional[Specification] = None
    tasks: List[CodingTask] = Field(default_factory=list)
    output_files: List[CodeFile] = Field(default_factory=list)
    current_agent: AgentType = AgentType.ARCHITECT
    status: str = "running"  # running, completed, failed
    error: Optional[str] = None
    start_time: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    agent_messages: List[AgentMessage] = Field(default_factory=list)
