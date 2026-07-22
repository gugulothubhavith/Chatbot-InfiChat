from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/proxy", tags=["Proxy"])

@router.get("/avatar")
async def proxy_avatar(url: str = Query(..., description="The external avatar URL to proxy")):
    """
    Proxies an external avatar image to avoid CORS issues and loading failures.
    """
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")
    
    from urllib.parse import urlparse
    parsed = urlparse(url)
    allowed_domains = ["googleusercontent.com", "githubusercontent.com", "gravatar.com", "ui-avatars.com"]
    
    if not any(parsed.netloc.endswith(domain) for domain in allowed_domains):
        logger.warning(f"SSRF Attempt Blocked: {url}")
        raise HTTPException(status_code=403, detail="SSRF Blocked: Domain not allowed for proxy")
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = await client.get(url, headers=headers)
            
            if response.status_code != 200:
                logger.warning(f"Failed to fetch avatar from {url}: {response.status_code}")
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch image")
            
            content_type = response.headers.get("Content-Type", "image/jpeg")
            if not content_type.startswith("image/"):
                logger.warning(f"URL did not return an image: {url}, content-type: {content_type}")
                raise HTTPException(status_code=400, detail="URL is not an image")
            
            # Return the image data with caching headers (7 days)
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=604800",
                    "Access-Control-Allow-Origin": "*"
                }
            )
            
    except httpx.RequestError as e:
        logger.error(f"Proxy request error for {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected proxy error: {e}")
        raise HTTPException(status_code=500, detail="Internal proxy error")
