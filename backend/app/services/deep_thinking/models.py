"""Pydantic models for the Deep Thinking pipeline state."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime, timezone
import uuid


class ThinkingStage(str, Enum):
    ANALYZING = "analyzing"
    REASONING = "reasoning"
    VERIFYING = "verifying"
    SYNTHESIZING = "synthesizing"
    COMPLETE = "complete"
    ERROR = "error"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"


class ReasoningStep(BaseModel):
    step_number: int
    title: str
    content: str
    verification_status: VerificationStatus = VerificationStatus.PENDING
    confidence: float = 0.0
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    duration_ms: int = 0


class ProblemDecomposition(BaseModel):
    sub_problems: List[str] = Field(default_factory=list)
    dependencies: Dict[str, List[str]] = Field(default_factory=dict)


class Hypothesis(BaseModel):
    content: str
    supporting_evidence: List[str] = Field(default_factory=list)
    confidence: float = 0.0


class VerificationResult(BaseModel):
    step_number: int
    is_valid: bool = False
    issues: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)


class ThinkingReport(BaseModel):
    query: str
    executive_summary: str = ""
    reasoning_chain: List[ReasoningStep] = Field(default_factory=list)
    key_findings: List[str] = Field(default_factory=list)
    conclusion: str = ""
    confidence_score: float = 0.0
    caveats: List[str] = Field(default_factory=list)


class ThinkingState(BaseModel):
    """Mutable state object passed through the entire thinking pipeline."""
    thinking_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str = ""
    stage: ThinkingStage = ThinkingStage.ANALYZING
    decomposition: Optional[ProblemDecomposition] = None
    steps: List[ReasoningStep] = Field(default_factory=list)
    hypotheses: List[Hypothesis] = Field(default_factory=list)
    verification_results: List[VerificationResult] = Field(default_factory=list)
    report: Optional[ThinkingReport] = None
    iteration: int = 0
    max_iterations: int = 3
    error_message: str = ""
