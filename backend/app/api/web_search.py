"""Web Search API — Fast SSE streaming endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.deps import get_current_user, get_db
from sqlalchemy.orm import Session
from app.models.chat import ChatMessage, ChatSession
from app.services.web_search.orchestrator import run_web_search

router = APIRouter()


class WebSearchRequest(BaseModel):
    query: str
    conversation_id: str | None = None
    model: str | None = None


@router.post("/web_search/stream")
async def stream_web_search(request: WebSearchRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Stream a fast web search pipeline via Server-Sent Events.
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
        print(f"Error saving web search prompt: {e}")

    import asyncio
    from app.database.db import SessionLocal
    queue = asyncio.Queue()

    async def background_search():
        bg_db = None
        try:
            bg_db = SessionLocal()
            from app.core.config import settings
            model_to_use = request.model or getattr(settings, "DEFAULT_CHAT_MODEL", "meta-llama/llama-3.1-8b-instruct")
            
            async for event in run_web_search(request.query.strip(), model=model_to_use):
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
                                    report_content += "\n\n---\n**Sources:**\n" + cit_str
                                
                                asst_msg = ChatMessage(
                                    session_id=session_id,
                                    role="assistant",
                                    content=report_content,
                                    model="web-search"
                                )
                                bg_db.add(asst_msg)
                                bg_db.commit()
                    except Exception as inner_e:
                        bg_db.rollback()
                        print(f"Failed to save web search report: {inner_e}")
                
                await queue.put(event)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            await queue.put(f"data: {{\"type\": \"error\", \"message\": \"{str(e)}\"}}\n\n")
        finally:
            if bg_db:
                bg_db.close()
            await queue.put(None)  # Sentinel value to stop generator

    async def event_generator():
        task = asyncio.create_task(background_search())
        while True:
            event = await queue.get()
            if event is None:
                break
            yield event
        await task

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
