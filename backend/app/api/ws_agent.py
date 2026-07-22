from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import logging
import json
from app.services.agent_service import run_orchestration
from app.services.code_orchestrator.orchestrator import run_coding_pipeline
from typing import Optional
from sqlalchemy.orm import Session
from app.database.db import get_db
from fastapi import Depends
from app.models.chat import ChatMessage, ChatSession

router = APIRouter(prefix="/ws", tags=["WebSocket"])
logger = logging.getLogger(__name__)

@router.websocket("/code/squad")
async def websocket_code_squad(
    websocket: WebSocket, 
    session_id: Optional[str] = None, 
    token: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    await websocket.accept()
    logger.info(f"Code Squad WebSocket connected (session_id: {session_id})")
    
    write_lock = asyncio.Lock()
    
    try:
        data = await websocket.receive_json()
        prompt = data.get("prompt")
        
        if not prompt:
            async with write_lock:
                await websocket.send_text(json.dumps({"type": "error", "message": "No prompt provided"}))
            await websocket.close()
            return

        collected_raw = ""

        async for event in run_coding_pipeline(prompt):
            if not event.startswith("data: "):
                continue

            data_str = event[6:].strip()
            if not data_str:
                continue

            try:
                # We simply forward the JSON from the coding pipeline straight to the frontend
                # It contains "agent_status", "code_generated", "report", etc.
                parsed_data = json.loads(data_str)
                
                if parsed_data.get("type") == "code_chunk":
                    collected_raw += parsed_data.get("chunk", "")
                    
                async with write_lock:
                    await websocket.send_text(json.dumps(parsed_data))
            except json.JSONDecodeError:
                continue
            except Exception as e:
                logger.error(f"Failed to forward update: {e}")

        # Save to database if session_id is provided
        if session_id and collected_raw:
            try:
                # Check if the prompt is already saved as a user message
                existing = db.query(ChatMessage).filter(
                    ChatMessage.session_id == session_id,
                    ChatMessage.role == "user"
                ).first()
                if not existing:
                    user_msg = ChatMessage(session_id=session_id, role="user", content=prompt)
                    db.add(user_msg)
                
                assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=collected_raw)
                db.add(assistant_msg)
                db.commit()
                logger.info(f"Saved generated code history for session {session_id}")
            except Exception as e:
                logger.error(f"Failed to save code history: {e}")

    except WebSocketDisconnect:
        logger.info("Code Squad WebSocket disconnected")
    except Exception as e:
        logger.error(f"Code Squad error: {e}", exc_info=True)
        try:
            async with write_lock:
                await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
