import httpx
import os
from fastapi import HTTPException
from app.core.config import settings
import logging
import json
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

# API ENDPOINTS
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

MODEL_MAP = {
    # Redirect legacy UI default to new NVIDIA default
    "llama-3.3-70b-versatile": settings.DEFAULT_CHAT_MODEL,
    "llama3-70b": "llama-3.3-70b-versatile",
    "llama3-8b": "llama-3.1-8b-instant",
    "llama-3.1-8b-instant": "llama-3.1-8b-instant",
    "mixtral": "llama-3.3-70b-versatile", # Fallback for decommissioned mixtral
    "gemma": "llama-3.1-8b-instant", # Fallback for decommissioned gemma
    # Vision Model
    "vision_model": settings.VISION_MODEL,
    # Multi-Agent Defaults
    "planner_agent": settings.PLANNER_MODEL,
    "coder_agent": settings.CODER_MODEL,
    "research_agent": settings.PLANNER_MODEL,
}

def is_groq_model(model_name: str) -> bool:
    """Check if the model is intended for Groq."""
    groq_models = [
        "llama-3.3-70b-versatile", 
        "llama-3.1-8b-instant",
        "llama-3.2-11b-vision-preview",
        "llama-3.2-3b-preview",
        "llama-3.2-1b-preview",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "whisper-large-v3",
        "whisper-large-v3-turbo"
    ]
    return model_name in groq_models or model_name.endswith("-groq") or "llama" in model_name.lower() or "whisper" in model_name.lower()

def convert_to_gemini_format(messages: list) -> dict:
    """Convert OpenAI-style messages (including multi-modal) to Gemini format."""
    contents = []
    system_instruction = None
    
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")
        
        if role == "system":
            system_instruction = {"parts": [{"text": content}]}
            continue
            
        gemini_parts = []
        if isinstance(content, list):
            for part in content:
                if part.get("type") == "text":
                    gemini_parts.append({"text": part.get("text")})
                elif part.get("type") == "image_url":
                    image_url = part.get("image_url", {}).get("url", "")
                    if image_url.startswith("data:image/"):
                        try:
                            # Format: data:image/png;base64,iVBOR...
                            header, data = image_url.split(",", 1)
                            mime_type = header.split(":", 1)[1].split(";", 1)[0]
                            gemini_parts.append({
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": data
                                }
                            })
                        except Exception as e:
                            logger.error(f"Failed to parse image data URL: {e}")
        else:
            gemini_parts.append({"text": content})
            
        contents.append({
            "role": "user" if role == "user" else "model",
            "parts": gemini_parts
        })
        
    payload = {"contents": contents}
    if system_instruction:
        payload["system_instruction"] = system_instruction
        
    return payload

async def call_gemini(payload: dict, model: str = None, api_key: str = None, stream: bool = False):
    """Call Google Gemini API."""
    model = model or settings.VISION_MODEL
    api_key = api_key or settings.GOOGLE_API_KEY
    
    # Use v1beta for stream support and newer models
    endpoint = "streamGenerateContent" if stream else "generateContent"
    url = f"{GEMINI_BASE_URL}/{model}:{endpoint}?key={api_key}"
    
    gemini_payload = convert_to_gemini_format(payload.get("messages", []))
    headers = {"Content-Type": "application/json"}
    
    if stream:
        async def stream_generator():
            async with httpx.AsyncClient(timeout=120.0) as client:
                try:
                    async with client.stream("POST", url, headers=headers, json=gemini_payload) as response:
                        response.raise_for_status()
                        buffer = ""
                        async for chunk in response.aiter_text():
                            if not chunk: continue
                            buffer += chunk
                            
                            # Gemini sends JSON objects that might be split. 
                            # We look for "text": "..." patterns inside the accumulated buffer.
                            while True:
                                try:
                                    # Very basic extraction for speed, but robust to split chunks
                                    if '"text": "' in buffer:
                                        start_idx = buffer.find('"text": "') + 9
                                        end_idx = buffer.find('"', start_idx)
                                        if end_idx != -1:
                                            text_part = buffer[start_idx:end_idx]
                                            # Decode unicode escapes
                                            try:
                                                decoded_text = text_part.encode().decode('unicode-escape')
                                                yield decoded_text
                                            except:
                                                yield text_part
                                            
                                            # Remove processed part from buffer
                                            buffer = buffer[end_idx + 1:]
                                        else:
                                            # Found start but not end, wait for more data
                                            break
                                    else:
                                        # No more text parts found in current buffer
                                        if len(buffer) > 1000: # Safety flush if buffer grows too large without match
                                            buffer = buffer[-500:]
                                        break
                                except Exception as e:
                                    logger.error(f"Gemini internal parse error: {e}")
                                    break
                except Exception as e:
                    logger.error(f"Gemini Stream Failed: {e}")
                    yield f"\n❌ [Gemini Stream Error]: {str(e)}"
        return stream_generator()

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(url, headers=headers, json=gemini_payload)
            response.raise_for_status()
            data = response.json()
            text = data['candidates'][0]['content']['parts'][0]['text']
            return {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": text
                        }
                    }
                ]
            }
        except Exception as e:
            logger.error(f"Gemini Call Failed ({model}): {e}")
            raise HTTPException(status_code=502, detail=f"Gemini API Error: {str(e)}")

async def call_openrouter(payload: dict, api_key: str, stream: bool = False):
    """Call OpenRouter API (OpenAI Compatible) with streaming support."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/google-deepmind/antigravity",
        "X-Title": "Antigravity AI Chatbot"
    }
    
    payload["stream"] = stream
    
    if stream:
        async def stream_generator():
            async with httpx.AsyncClient(timeout=120.0) as client:
                try:
                    async with client.stream("POST", OPENROUTER_CHAT_URL, headers=headers, json=payload) as response:
                        if response.status_code != 200:
                            error_detail = await response.aread()
                            logger.error(f"OpenRouter Stream Error ({response.status_code}): {error_detail.decode()}")
                            yield f"\n❌ [OpenRouter Error]: {response.status_code}"
                            return

                        buffer = ""
                        async for chunk in response.aiter_text():
                            if not chunk: continue
                            buffer += chunk
                            
                            lines = buffer.split('\n')
                            # Keep the last potentially incomplete line in the buffer
                            buffer = lines.pop()
                            
                            for line in lines:
                                if line.startswith("data: "):
                                    data_str = line[6:].strip()
                                    if data_str == "[DONE]": continue
                                    try:
                                        data = json.loads(data_str)
                                        content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                        if content:
                                            yield content
                                    except:
                                        pass
                except Exception as e:
                    logger.error(f"OpenRouter Stream Failed: {e}")
                    yield f"\n❌ [OpenRouter Stream Error]: {str(e)}"
        return stream_generator()

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(OPENROUTER_CHAT_URL, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"OpenRouter Call Failed: {e}")
            raise HTTPException(status_code=502, detail=f"OpenRouter API Error: {str(e)}")

import asyncio
# Limit concurrent NVIDIA NIM API calls to prevent 502/Timeouts on the free tier
NVIDIA_SEMAPHORE = asyncio.Semaphore(3)

async def call_nvidia(payload: dict, api_key: str, stream: bool = False):
    """Call NVIDIA NIM API (OpenAI Compatible) with streaming support."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    # Sanitize payload to only valid OpenAI keys supported by NVIDIA NIM
    valid_keys = {"model", "messages", "temperature", "top_p", "n", "stream", "stop", "max_tokens", "presence_penalty", "frequency_penalty", "logit_bias", "user", "response_format", "seed", "tools", "tool_choice"}
    clean_payload = {k: v for k, v in payload.items() if k in valid_keys}
    clean_payload["stream"] = stream

    if stream:
        async def stream_generator():
            async with httpx.AsyncClient(timeout=120.0) as client:
                try:
                    async with client.stream("POST", NVIDIA_CHAT_URL, headers=headers, json=clean_payload) as response:
                        if response.status_code != 200:
                            error_detail = await response.aread()
                            logger.error(f"NVIDIA Stream Error ({response.status_code}): {error_detail.decode()}")
                            yield f"\n❌ [NVIDIA Error]: {response.status_code}"
                            return

                        buffer = ""
                        async for chunk in response.aiter_text():
                            if not chunk: continue
                            buffer += chunk
                            
                            lines = buffer.split('\n')
                            buffer = lines.pop()
                            
                            for line in lines:
                                if line.startswith("data: "):
                                    data_str = line[6:].strip()
                                    if data_str == "[DONE]": continue
                                    try:
                                        data = json.loads(data_str)
                                        content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                        if content:
                                            yield content
                                    except:
                                        pass
                except Exception as e:
                    logger.error(f"NVIDIA Stream Failed: {e}")
                    yield f"\n❌ [NVIDIA Stream Error]: {str(e)}"
        return stream_generator()

    async with NVIDIA_SEMAPHORE:
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                # Force max_tokens down slightly if it's too high to prevent timeouts
                if clean_payload.get("max_tokens", 0) > 2048:
                    clean_payload["max_tokens"] = 2048

                response = await client.post(NVIDIA_CHAT_URL, headers=headers, json=clean_payload)
                response.raise_for_status()
                return response.json()
            except httpx.ReadTimeout as e:
                logger.warning(f"NVIDIA API ReadTimeout (Tenacity will retry): {e}")
                raise HTTPException(status_code=502, detail=f"NVIDIA API Error: ReadTimeout {str(e)}")
            except Exception as e:
                if "429" in str(e) or "502" in str(e):
                    logger.warning(f"NVIDIA API Concurrency Limit hit (Tenacity will retry): {e}")
                else:
                    logger.error(f"NVIDIA Call Failed: {str(e)}")
                raise HTTPException(status_code=502, detail=f"NVIDIA API Error: {str(e)}")

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    retry=retry_if_exception_type(HTTPException)
)
async def call_llm(request_type: str, payload: dict, key_group: str = None, stream: bool = False):
    """
    Call LLM via appropriate provider (Groq, OpenRouter, Gemini).
    Supports streaming if stream=True. Automatically retries on rate limits (HTTPException 429/502).
    """
    requested_alias = payload.get("model", settings.DEFAULT_CHAT_MODEL)
    model_name = MODEL_MAP.get(requested_alias, requested_alias)
    payload["model"] = model_name
    payload["stream"] = stream

    try:
        # 1. Route Multi-Agent Specific Requests (Explicit Aliases)
        if requested_alias == "planner_agent":
            api_key = settings.PLANNER_API_KEY or settings.DEFAULT_CHAT_API_KEY
            if model_name.startswith("z-ai/glm") or model_name.startswith("nvidia/") or (api_key and api_key.startswith("nvapi")):
                logger.info(f"Routing Planner to NVIDIA: {model_name}")
                return await call_nvidia(payload, api_key, stream=stream)
            else:
                logger.info(f"Routing Planner to Groq: {model_name}")
                api_key = settings.GROQ_API_KEY
        elif requested_alias == "research_agent":
            logger.info(f"Routing Search Agent to Groq: {model_name}")
            api_key = settings.PLANNER_API_KEY or settings.GROQ_API_KEY
        elif requested_alias == "coder_agent":
            if model_name.startswith("z-ai/glm") or (settings.CODER_API_KEY and settings.CODER_API_KEY.startswith("nvapi")):
                logger.info(f"Routing Coder to NVIDIA: {model_name}")
                return await call_nvidia(payload, settings.CODER_API_KEY, stream=stream)
            else:
                logger.info(f"Routing Coder to OpenRouter: {model_name}")
                return await call_openrouter(payload, settings.CODER_API_KEY, stream=stream)
        # 2. Intelligent Routing based on Model ID Pattern
        elif "gemini" in model_name.lower():
            logger.info(f"Auto-Routing Gemini model: {model_name}")
            return await call_gemini(payload, model=model_name, stream=stream)
        elif model_name.startswith("nvidia/") or model_name.startswith("z-ai/"):
            logger.info(f"Auto-Routing NVIDIA model: {model_name}")
            return await call_nvidia(payload, settings.DEFAULT_CHAT_API_KEY, stream=stream)
        elif "/" in model_name or "deepseek" in model_name.lower() or "claude" in model_name.lower():
            logger.info(f"Auto-Routing OpenRouter model: {model_name}")
            or_key = settings.CODER_API_KEY or os.getenv("OPENROUTER_API_KEY")
            return await call_openrouter(payload, or_key, stream=stream)
        elif key_group == "vision" or model_name == settings.VISION_MODEL:
            logger.info(f"Routing Vision to Gemini: {model_name}")
            return await call_gemini(payload, stream=stream)
        
        # 3. Default Groq Routing (Llama, Mixtral, etc.)
        logger.info(f"Routing '{request_type}' (stream={stream}) to Groq Model: {model_name}")
        api_key = settings.GROQ_API_KEY
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        url = GROQ_CHAT_URL
        
        if stream:
            async def stream_generator():
                async with httpx.AsyncClient(timeout=120.0) as client:
                    try:
                        async with client.stream("POST", url, headers=headers, json=payload) as response:
                            if response.status_code != 200:
                                error_detail = await response.aread()
                                logger.error(f"Groq Stream Error ({response.status_code}): {error_detail.decode()}")
                                yield f"\n❌ [Groq Error]: {response.status_code}"
                                return

                            buffer = ""
                            async for chunk in response.aiter_text():
                                if not chunk: continue
                                buffer += chunk
                                
                                lines = buffer.split('\n')
                                buffer = lines.pop()
                                
                                for line in lines:
                                    if line.startswith("data: "):
                                        data_str = line[6:].strip()
                                        if data_str == "[DONE]": continue
                                        try:
                                            data = json.loads(data_str)
                                            content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                            if content:
                                                yield content
                                        except:
                                            pass
                    except Exception as e:
                        logger.error(f"Groq Stream Failed: {e}")
                        yield f"\n❌ [Streaming Error]: {str(e)}"
            return stream_generator()

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Groq Call Failed ({model_name}): {e}")
                raise HTTPException(status_code=502, detail=f"Groq API Error: {str(e)}")
    except Exception as exc:
        error_msg = str(exc)
        logger.error(f"Routing Failure: {error_msg}")
        if stream:
            async def error_gen():
                yield f"\n❌ [Routing Error]: {error_msg}"
            return error_gen()
        raise exc