from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
from app.services.indic_voice_service import indic_voice_service
from app.services import voice_service
from app.schemas.voice import TTSRequest
from app.core.deps import get_current_user
from app.models.user import User
import tempfile
import shutil
import os
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice"])

# Use platform-safe temp directory
UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "uploads", "voice")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    filepath = None
    try:
        # Save temp file
        ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else "wav"
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Transcribe using Groq Cloud (primary) or local Whisper (fallback)
        text = await voice_service.transcribe_audio(filepath)
        
        if not text or text.startswith("[Error"):
             raise HTTPException(status_code=500, detail="Transcription failed or empty")
             
        return {"text": text}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always cleanup temp file
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Professional Indic TTS streaming via Edge-TTS."""
    try:
        if not request.text:
             raise HTTPException(status_code=400, detail="Text is required")
             
        return StreamingResponse(
            indic_voice_service.synthesize_professional_stream(
                request.text, 
                voice_id=request.voice_id or "en_professional_male"
            ),
            media_type="audio/mpeg"
        )
    except Exception as e:
        logger.error(f"[API ERROR] TTS failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
