"""Multi-Agent Coding Orchestrator — Coordinates the 7-agent coding pipeline with SSE streaming."""

import json
import asyncio
import logging
from typing import AsyncGenerator

from app.services.code_orchestrator.models import (
    OrchestrationState, AgentType,
)
from app.services.code_orchestrator.agents import (
    run_architect,
    run_spec_writer,
    run_task_decomposer,
    run_coder,
    run_tester,
    run_debugger,
    run_optimizer,
)
from app.services.llm_router import call_llm
from app.core.config import settings

logger = logging.getLogger(__name__)


def _sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


async def _llm_call(messages: list, stream: bool = False):
    """Unified LLM call with graceful fallback chain.

    Tries:
    1. coder_agent routing → NVIDIA GLM 5.2 (primary)
    2. DEFAULT_CHAT_MODEL (fallback)
    """
    # Check if we have a coder API key configured
    has_coder_key = bool(settings.CODER_API_KEY) or bool(settings.DEFAULT_CHAT_API_KEY)

    if has_coder_key:
        try:
            payload = {
                "model": "coder_agent",
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 8192,
            }
            result = await call_llm("code_generate", payload, stream=stream)
            if stream:
                return result
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            if content and len(content.strip()) > 10:
                return content
        except Exception as e:
            logger.warning(f"Code LLM (coder_agent) failed: {e}. Trying default model...")

    # Fallback: use the default chat model
    logger.info("Code orchestrator using DEFAULT_CHAT_MODEL as fallback")
    payload = {
        "model": settings.DEFAULT_CHAT_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 8192,
    }
    try:
        result = await call_llm("chat", payload, stream=stream)
        if stream:
            return result
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        if content and len(content.strip()) > 10:
            return content
    except Exception as e2:
        logger.error(f"Code LLM fallback also failed: {e2}")

    # Last resort: return a meaningful error as "content"
    return (
        f"# Code Generation Note\n\n"
        f"The code generation service could not connect to any AI model. "
        f"Please ensure an API key is configured (CODER_API_KEY or DEFAULT_CHAT_API_KEY).\n\n"
        f"**Original request:** {messages[-1].get('content', '')[:200] if messages else 'N/A'}"
    )


async def run_coding_pipeline(prompt: str) -> AsyncGenerator[str, None]:
    """
    Execute the 7-agent multi-agent coding pipeline.
    Yields SSE events for each stage of progress.

    Event types:
        - agent_status: Agent started/completed/errored
        - plan: Task plan tree
        - code_generated: Individual file output
        - test_results: Test output
        - report: Final report with all files
        - done: Pipeline complete
    """
    state = OrchestrationState(prompt=prompt)

    async def llm_call_with_model(messages: list, stream: bool = False):
        return await _llm_call(messages, stream=stream)

    # ── Agent 1: Architect ──────────────────────────────────
    state.current_agent = AgentType.ARCHITECT
    yield _sse_event("agent_status", {
        "agent": "Architect", "status": "running",
        "message": "Designing system architecture...",
        "agent_number": 1,
    })
    try:
        state = await run_architect(state, llm_call_with_model)
        yield _sse_event("agent_status", {
            "agent": "Architect", "status": "complete",
            "agent_number": 1,
            "data": {
                "components": len(state.architecture.components) if state.architecture else 0,
                "tech_stack": state.architecture.tech_stack if state.architecture else [],
            },
        })
    except Exception as e:
        logger.error(f"Architect failed: {e}")
        yield _sse_event("agent_status", {"agent": "Architect", "status": "error", "agent_number": 1, "message": str(e)})

    # ── Agent 2: Spec Writer ───────────────────────────────
    state.current_agent = AgentType.SPEC_WRITER
    yield _sse_event("agent_status", {
        "agent": "SpecWriter", "status": "running",
        "message": "Creating detailed specifications...",
        "agent_number": 2,
    })
    try:
        state = await run_spec_writer(state, llm_call_with_model)
        yield _sse_event("agent_status", {
            "agent": "SpecWriter", "status": "complete",
            "agent_number": 2,
            "data": {
                "requirements": len(state.specification.functional_requirements) if state.specification else 0,
                "endpoints": len(state.specification.api_endpoints) if state.specification else 0,
            },
        })
    except Exception as e:
        logger.error(f"SpecWriter failed: {e}")
        yield _sse_event("agent_status", {"agent": "SpecWriter", "status": "error", "agent_number": 2, "message": str(e)})

    # ── Agent 3: Task Decomposer ───────────────────────────
    state.current_agent = AgentType.TASK_DECOMPOSER
    yield _sse_event("agent_status", {
        "agent": "TaskDecomposer", "status": "running",
        "message": "Breaking down into parallel coding tasks...",
        "agent_number": 3,
    })
    try:
        state = await run_task_decomposer(state, llm_call_with_model)
        # Send task plan
        tasks_data = [{"id": t.id, "title": t.title, "dependencies": t.dependencies, "status": t.status} for t in state.tasks]
        yield _sse_event("plan", {"tree": tasks_data})
        yield _sse_event("agent_status", {
            "agent": "TaskDecomposer", "status": "complete",
            "agent_number": 3,
            "data": {"task_count": len(state.tasks)},
        })
    except Exception as e:
        logger.error(f"TaskDecomposer failed: {e}")
        yield _sse_event("agent_status", {"agent": "TaskDecomposer", "status": "error", "agent_number": 3, "message": str(e)})

    # ── Agent 4: Coder Swarm ───────────────────────────────
    state.current_agent = AgentType.CODER
    yield _sse_event("agent_status", {
        "agent": "CoderSwarm", "status": "running",
        "message": f"Running {len(state.tasks)} parallel coding agents...",
        "agent_number": 4,
    })

    # Run coders in parallel with ordering by dependencies
    async def _execute_coder(task):
        yield _sse_event("code_progress", {
            "task_id": task.id, "title": task.title,
            "status": "running", "message": f"Coding {task.title}...",
        })
        
        # We need a queue to stream chunks since we're in an async generator
        queue = asyncio.Queue()
        
        async def _chunk_callback(chunk: str):
            await queue.put(chunk)
            
        # Run coder as a separate task so we can stream from queue concurrently
        async def _run():
            try:
                result = await run_coder(state, task, llm_call_with_model, chunk_callback=_chunk_callback)
                await queue.put(result)
            except Exception as e:
                await queue.put(e)
                
        coder_task = asyncio.create_task(_run())
        
        while True:
            item = await queue.get()
            if isinstance(item, str):
                yield _sse_event("code_chunk", {"task_id": task.id, "chunk": item})
            else:
                result = item
                break
                
        if isinstance(result, Exception):
            yield _sse_event("code_progress", {
                "task_id": task.id, "title": task.title,
                "status": "failed", "error": str(result),
            })
            return
            
        yield _sse_event("code_progress", {
            "task_id": task.id, "title": task.title,
            "status": "completed" if result.status == "completed" else "failed",
            "files": [{"path": f.path, "language": f.language} for f in result.output_files],
            "error": result.error,
        })
        # Yield each generated file
        for f in result.output_files:
            yield _sse_event("code_generated", {
                "file": {"path": f.path, "content": f.content, "language": f.language},
            })
        # Signal completion — we can't return from an async generator,
        # so store the result on the task for later inspection
        task._completed = result.status == "completed"
        task._error = result.error

    # Process tasks respecting dependencies
    completed_tasks = set()
    remaining_tasks = list(state.tasks)

    while remaining_tasks:
        # Find tasks whose dependencies are all met
        ready = [t for t in remaining_tasks if all(dep in completed_tasks for dep in t.dependencies)]
        if not ready:
            logger.warning("Circular dependency detected or missing dependencies, running all remaining")
            ready = remaining_tasks

        # We need a unified queue to interleave events from all parallel tasks
        event_queue = asyncio.Queue()
        active_tasks = len(ready)

        async def _task_wrapper(t):
            try:
                async for event in _execute_coder(t):
                    await event_queue.put(event)
            except Exception as e:
                logger.error(f"Task wrapper failed: {e}")
            finally:
                await event_queue.put({"_internal_done": t.id})

        # Launch all ready tasks concurrently
        for t in ready:
            asyncio.create_task(_task_wrapper(t))

        # Stream events as they arrive
        while active_tasks > 0:
            event = await event_queue.get()
            if isinstance(event, dict) and "_internal_done" in event:
                active_tasks -= 1
            else:
                yield event

        # Update completed set
        for t in ready:
            remaining_tasks.remove(t)
            completed_tasks.add(t.id)

    # Collect all generated files
    for task in state.tasks:
        for f in task.output_files:
            if f.content:
                state.output_files.append(f)

    yield _sse_event("agent_status", {
        "agent": "CoderSwarm", "status": "complete",
        "agent_number": 4,
        "data": {"files_generated": len(state.output_files)},
    })

    # ── Agent 5: Tester ────────────────────────────────────
    state.current_agent = AgentType.TESTER
    yield _sse_event("agent_status", {
        "agent": "Tester", "status": "running",
        "message": "Generating and running tests...",
        "agent_number": 5,
    })
    try:
        state = await run_tester(state, llm_call_with_model)
        yield _sse_event("agent_status", {
            "agent": "Tester", "status": "complete",
            "agent_number": 5,
            "data": {"test_count": len([f for f in state.output_files if "test" in f.path.lower()])},
        })
    except Exception as e:
        logger.error(f"Tester failed: {e}")
        yield _sse_event("agent_status", {"agent": "Tester", "status": "error", "agent_number": 5, "message": str(e)})

    # ── Agent 6: Optimizer ─────────────────────────────────
    state.current_agent = AgentType.OPTIMIZER
    yield _sse_event("agent_status", {
        "agent": "Optimizer", "status": "running",
        "message": "Reviewing and optimizing code...",
        "agent_number": 6,
    })
    try:
        state = await run_optimizer(state, llm_call_with_model)
        yield _sse_event("agent_status", {
            "agent": "Optimizer", "status": "complete",
            "agent_number": 6,
            "data": {"files_optimized": len(state.output_files)},
        })
    except Exception as e:
        logger.error(f"Optimizer failed: {e}")
        yield _sse_event("agent_status", {"agent": "Optimizer", "status": "error", "agent_number": 6, "message": str(e)})

    state.status = "completed"

    # ── Final Report ────────────────────────────────────────
    yield _sse_event("report", {
        "content": _build_report(state),
        "files": [
            {
                "path": f.path,
                "content": f.content,
                "language": f.language,
                "description": f.description,
            }
            for f in state.output_files
        ],
        "architecture": state.architecture.model_dump() if state.architecture else {},
        "tasks": [{"id": t.id, "title": t.title, "status": t.status} for t in state.tasks],
    })

    yield _sse_event("done", {
        "session_id": state.session_id,
        "total_files": len(state.output_files),
        "total_tasks": len(state.tasks),
    })


def _build_report(state: OrchestrationState) -> str:
    """Build a human-readable report of the coding pipeline results."""
    lines = []
    lines.append("# Code Generation Report")
    lines.append("")
    lines.append(f"## Architecture Overview")
    lines.append(f"{state.architecture.overview if state.architecture else 'N/A'}")
    lines.append("")
    if state.architecture:
        lines.append("### Components")
        for c in state.architecture.components:
            lines.append(f"- **{c.get('name')}**: {c.get('responsibility')}")
    lines.append("")
    lines.append("## Generated Files")
    for f in state.output_files:
        lines.append(f"- `{f.path}` ({f.language})")
    lines.append("")
    lines.append("## Tasks Completed")
    for t in state.tasks:
        icon = "✅" if t.status == "completed" else "❌"
        lines.append(f"- {icon} {t.title} ({t.status})")
    lines.append("")
    lines.append(f"**Total files generated: {len(state.output_files)}**")
    return "\n".join(lines)
