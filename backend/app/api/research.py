"""Deep Research API — SSE streaming endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.deps import get_current_user, get_db
from sqlalchemy.orm import Session
from app.models.chat import ChatMessage, ChatSession
from app.services.deep_research.orchestrator import run_pipeline

router = APIRouter()


class ResearchRequest(BaseModel):
    query: str
    conversation_id: str | None = None
    model: str | None = None


@router.post("/research/stream")
async def stream_research(request: ResearchRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Stream a deep research pipeline via Server-Sent Events.
    
    The client receives events in the format:
        data: {"type": "agent_status", "agent": "IntentAnalysis", "status": "running", ...}
    
    Event types:
        - agent_status: Agent started/completed/errored
        - plan: Research plan tree
        - source_found: New source discovered
        - quality_gate: Critic quality check results
        - report: Final research report
        - done: Pipeline complete
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    session_id = request.conversation_id
    if not session_id:
        import uuid
        new_session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=request.query[:50]
        )
        db.add(new_session)
        session_id = new_session.id
        db.commit()

    try:
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.query.strip()
        )
        db.add(user_msg)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving research prompt: {e}")

    import asyncio
    from app.database.db import SessionLocal
    queue = asyncio.Queue()

    async def background_research():
        bg_db = None
        try:
            bg_db = SessionLocal()
            from app.core.config import settings
            model_to_use = request.model or getattr(settings, "DEFAULT_CHAT_MODEL", "meta-llama/llama-3.1-8b-instruct")
            async for event in run_pipeline(request.query.strip(), model=model_to_use):
                if event.startswith("data: "):
                    try:
                        import json
                        data_str = event[6:].strip()
                        if data_str:
                            data = json.loads(data_str)
                            if data.get("type") == "report":
                                report_content = data.get("content", "")
                                citations = data.get("citations", [])
                                if citations:
                                    cit_str = "\n".join([f"[{c.get('index')}] [{c.get('title')}]({c.get('url')})" for c in citations])
                                    report_content += "\n\n---\n" + cit_str
                                
                                asst_msg = ChatMessage(
                                    session_id=session_id,
                                    role="assistant",
                                    content=report_content,
                                    model="deep-research"
                                )
                                bg_db.add(asst_msg)
                                bg_db.commit()
                    except Exception as inner_e:
                        bg_db.rollback()
                        print(f"Failed to save deep research report: {inner_e}")
                
                await queue.put(event)
            
            await queue.put(None) # Signal end of stream
        except Exception as e:
            import json
            await queue.put(f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n")
            await queue.put(None)
        finally:
            if bg_db:
                bg_db.close()

    # Start background task independent of client connection
    asyncio.create_task(background_research())

    async def event_stream():
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield event
        except asyncio.CancelledError:
            print(f"Client disconnected for session {session_id}, deep research continues in background.")
            raise

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Chat-Session-ID": str(session_id),
        },
    )
