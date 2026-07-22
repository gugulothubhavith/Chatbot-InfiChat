"""Multi-Agent Code Orchestration Service — Facade over the code_orchestrator pipeline.

This module maintains backward compatibility with existing code that calls run_orchestration().
"""

import logging
from app.services.code_orchestrator.orchestrator import run_coding_pipeline

logger = logging.getLogger(__name__)


async def run_orchestration(user_prompt: str, stream_callback=None) -> str:
    """
    Run the multi-agent coding pipeline and collect results.

    This is a synchronous-facing wrapper around the async streaming pipeline.
    For streaming access, use run_coding_pipeline() directly from code_orchestrator.

    Args:
        user_prompt: The coding task description
        stream_callback: Optional async callback for real-time progress updates

    Returns:
        A markdown-formatted report of all generated code
    """
    logger.info(f"Starting Multi-Agent Orchestration for: {user_prompt[:50]}")

    collected_report = ""
    collected_files = []

    async for event in run_coding_pipeline(user_prompt):
        import json
        if not event.startswith("data: "):
            continue

        data_str = event[6:].strip()
        if not data_str:
            continue

        try:
            data = json.loads(data_str)
            event_type = data.get("type", "")

            if event_type == "agent_status":
                agent = data.get("agent", "")
                status = data.get("status", "")
                message = data.get("message", "")

                if stream_callback:
                    icons = {"running": "⏳", "complete": "✅", "error": "❌"}
                    icon = icons.get(status, "➡️")
                    await stream_callback(f"{icon} **{agent}**: {message}")

            elif event_type == "code_generated":
                file_data = data.get("file", {})
                path = file_data.get("path", "unknown")
                content = file_data.get("content", "")
                collected_files.append({"path": path, "content": content})

                if stream_callback:
                    await stream_callback(f"📄 Generated `{path}` ({len(content)} chars)")

            elif event_type == "report":
                report_content = data.get("content", "")
                collected_report = report_content

            elif event_type == "code_progress":
                task_title = data.get("title", "")
                task_status = data.get("status", "")
                if stream_callback and task_status == "running":
                    await stream_callback(f"⚙️ Working on: {task_title}")

            elif event_type == "done":
                total_files = data.get("total_files", 0)
                if stream_callback:
                    await stream_callback(
                        f"✅ **Pipeline Complete**: {total_files} files generated"
                    )

        except json.JSONDecodeError:
            continue
        except Exception as e:
            logger.warning(f"Error processing event: {e}")
            continue

    # Build final report
    if collected_report:
        return collected_report

    # Fallback report
    lines = ["# Code Generation Report\n"]
    for f in collected_files:
        lines.append(f"## {f['path']}")
        lines.append(f"```\n{f['content']}\n```\n")

    return "\n".join(lines) if lines else "No code was generated. Please try again with a more specific request."
