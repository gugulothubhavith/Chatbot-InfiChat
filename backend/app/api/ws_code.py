"""WebSocket code execution endpoint.

First message from client must be a JSON auth payload:
    {"token": "eyJ..."}

Validates JWT before allowing code execution.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import logging
import os
import io
import tarfile
from datetime import datetime
from app.core.config import settings
from app.core.auth import decode_token

router = APIRouter(prefix="/ws", tags=["WebSocket"])
logger = logging.getLogger(__name__)

# Docker availability check
_HAS_DOCKER = False
try:
    import docker
    _HAS_DOCKER = True
except ImportError:
    logger.info("Docker SDK not installed — code execution via WebSocket will use local subprocess")


@router.websocket("/code/execute")
async def websocket_code_execute(websocket: WebSocket):
    logger.info("New WebSocket connection request")
    await websocket.accept()
    logger.info("WebSocket accepted")

    client = None
    container_id = None
    user_id = "anonymous"

    try:
        # ── Step 1: Authenticate ────────────────────────
        try:
            auth_data = await websocket.receive_json()
            token = auth_data.get("token", "")
            if not token:
                await websocket.send_text(json.dumps({"type": "error", "message": "Authentication required"}))
                await websocket.close(1008)
                return

            payload = decode_token(token)
            if not payload:
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid or expired token"}))
                await websocket.close(1008)
                return

            user_id = payload.get("sub", "unknown")
            logger.info(f"WebSocket authenticated: user_id={user_id}")
            await websocket.send_text(json.dumps({"type": "auth_ok", "user_id": user_id}))
        except Exception as e:
            logger.error(f"WebSocket auth failed: {e}")
            await websocket.send_text(json.dumps({"type": "error", "message": "Authentication failed"}))
            await websocket.close(1008)
            return

        # ── Step 2: Execute Code ────────────────────────
        # Get the language and code from the sandbox service
        from app.services.sandbox_service import execute_in_sandbox

        while True:
            try:
                data = await websocket.receive_json()
                code = data.get("code", "")
                language = data.get("language", "python")
            except Exception:
                continue

            if not code.strip():
                continue

            await websocket.send_text(json.dumps({
                "type": "status", "message": f"Executing {language} code...",
            }))

            try:
                result_str = await execute_in_sandbox(code, language, user_id)
                result = json.loads(result_str)
                await websocket.send_text(json.dumps({
                    "type": "result",
                    "status": result.get("status", "error"),
                    "output": result.get("output", ""),
                    "exit_code": result.get("exit_code", 1),
                    "execution_time_ms": result.get("execution_time_ms", 0),
                }))
            except Exception as e:
                logger.error(f"Execution error: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error", "message": str(e),
                }))

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user_id={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if container_id:
            try:
                if _HAS_DOCKER and client:
                    client.remove_container(container_id, force=True)
                    logger.info(f"Cleaned up container {container_id}")
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
