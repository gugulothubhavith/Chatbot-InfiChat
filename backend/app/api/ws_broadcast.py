from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from app.core.deps import get_current_user
from app.models.user import User
from app.core.rbac import RequiresPermission

router = APIRouter(tags=["Broadcast"])
logger = logging.getLogger(__name__)

# In-memory store of active broadcasts and global maintenance state
active_broadcasts: Dict[str, dict] = {}
system_maintenance: Dict[str, Any] = {
    "enabled": False,
    "message": "The platform is currently offline for critical maintenance.",
    "eta": "--:--:--"
}

def clean_expired_broadcasts():
    """Removes broadcasts that have passed their expiration time."""
    now = datetime.now(timezone.utc)
    expired_ids = []
    for bid, bdata in active_broadcasts.items():
        if bdata.get("expires_at"):
            exp = datetime.fromisoformat(bdata["expires_at"])
            if now > exp:
                expired_ids.append(bid)
    for bid in expired_ids:
        del active_broadcasts[bid]

class BroadcastConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Broadcast WS Connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Broadcast WS Disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to a client, removing connection: {e}")
                disconnected.append(connection)
                
        for conn in disconnected:
            self.disconnect(conn)

manager = BroadcastConnectionManager()

@router.websocket("/ws/broadcast")
async def websocket_broadcast_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Immediately send currently active broadcasts so new connections get them
        clean_expired_broadcasts()
        
        # Always send the initial sync to provide maintenance state, even if no active broadcasts
        await websocket.send_json({
            "type": "SYNC_ACTIVE_BROADCASTS",
            "broadcasts": list(active_broadcasts.values()),
            "maintenance": system_maintenance
        })
            
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS error: {e}")
        manager.disconnect(websocket)


@router.post("/admin/system/broadcast")
async def send_global_broadcast(
    payload: dict,
    current_user: User = Depends(get_current_user),
    admin: User = Depends(RequiresPermission.super_admin_only)
):
    """
    Super Admin only: Send a real-time broadcast message with targeting and lifecycle rules.
    """
    message = payload.get("message")
    priority = payload.get("priority", "info")
    target_role = payload.get("target_role", "all")
    action = payload.get("action", "none")
    duration = payload.get("duration", 0) # minutes, 0 = infinite (or manual clear)
    
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
        
    broadcast_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = None
    
    if duration > 0:
        expires_at = (now + timedelta(minutes=duration)).isoformat()
        
    broadcast_data = {
        "id": broadcast_id,
        "type": "GLOBAL_BROADCAST",
        "priority": priority,
        "message": message.strip(),
        "sender": current_user.username,
        "target_role": target_role,
        "action": action,
        "timestamp": now.isoformat(),
        "expires_at": expires_at
    }
    
    # Store it in memory so late-joiners still see it
    active_broadcasts[broadcast_id] = broadcast_data
    
    # Broadcast to all connected clients right now
    await manager.broadcast(broadcast_data)
    
    return {
        "success": True,
        "broadcast_id": broadcast_id,
        "receivers": len(manager.active_connections),
        "message": "Broadcast dispatched successfully"
    }

@router.delete("/admin/system/broadcast/{broadcast_id}")
async def stop_broadcast(
    broadcast_id: str,
    admin: User = Depends(RequiresPermission.super_admin_only)
):
    """Super Admin only: Recall/Stop an active broadcast."""
    if broadcast_id not in active_broadcasts:
        raise HTTPException(status_code=404, detail="Broadcast not found or already ended.")
        
    del active_broadcasts[broadcast_id]
    
    # Tell clients to kill it
    await manager.broadcast({
        "type": "CLEAR_BROADCAST",
        "id": broadcast_id
    })
    
    return {"message": "Broadcast successfully recalled."}

@router.post("/admin/system/broadcast/{broadcast_id}/resolve")
async def resolve_broadcast(
    broadcast_id: str,
    admin: User = Depends(RequiresPermission.super_admin_only)
):
    """Super Admin only: Resolve an active broadcast explicitly."""
    if broadcast_id not in active_broadcasts:
        raise HTTPException(status_code=404, detail="Broadcast not found.")
        
    original = active_broadcasts[broadcast_id]
    del active_broadcasts[broadcast_id]
    
    # Tell clients to resolve it
    await manager.broadcast({
        "type": "RESOLVE_BROADCAST",
        "id": broadcast_id,
        "message": f"Resolved: {original['message']}"
    })
    
    return {"message": "Broadcast successfully resolved."}

@router.get("/admin/system/broadcast")
async def get_active_broadcasts(
    admin: User = Depends(RequiresPermission.super_admin_only)
):
    """Super Admin only: Get a list of all currently live broadcasts."""
    clean_expired_broadcasts()
    return list(active_broadcasts.values())

class MaintenanceConfig(BaseModel):
    enabled: bool
    message: str = "The platform is currently offline for critical maintenance."
    eta: str = "--:--:--"

@router.get("/admin/system/maintenance")
async def get_maintenance_status(
    admin: User = Depends(RequiresPermission.super_admin_only)
):
    """Super Admin only: Get the current global maintenance state."""
    return system_maintenance

@router.post("/admin/system/maintenance")
async def toggle_maintenance(
    config: MaintenanceConfig,
    admin: User = Depends(RequiresPermission.super_admin_only)
):
    """Super Admin only: Toggle the global maintenance lock screen."""
    system_maintenance["enabled"] = config.enabled
    system_maintenance["message"] = config.message
    system_maintenance["eta"] = config.eta
    
    await manager.broadcast({
        "type": "MAINTENANCE_MODE",
        "enabled": config.enabled,
        "message": config.message,
        "eta": config.eta
    })
    
    return {"status": "success", "maintenance": system_maintenance}
