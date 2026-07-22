from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import logging
import ipaddress
from app.core.config import settings

logger = logging.getLogger(__name__)

class InfrastructureFirewallMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # Parse allowed IPs into a list of network objects for CIDR support
        self.allowed_admin_networks = []
        if settings.ADMIN_WHITELIST_IPS:
            for ip_str in settings.ADMIN_WHITELIST_IPS.split(','):
                try:
                    ip_str = ip_str.strip()
                    if not ip_str:
                        continue
                    # Supports "192.168.1.0/24" or strict IPs "127.0.0.1"
                    self.allowed_admin_networks.append(ipaddress.ip_network(ip_str, strict=False))
                except ValueError as e:
                    logger.error(f"Firewall Init Error: Invalid IP/CIDR '{ip_str}': {e}")
                    
    def _is_ip_allowed(self, client_ip: str, networks: list) -> bool:
        if not networks:
            # If no IPs configured, assume locked down completely or wholly open depending on strictness.
            # We default to allowing nothing if list is totally empty but feature is on.
            return False 
            
        try:
            ip_obj = ipaddress.ip_address(client_ip)
            for net in networks:
                if ip_obj in net:
                    return True
            return False
        except ValueError:
            return False

    async def dispatch(self, request: Request, call_next):
        # 1. Cloudflare Origin Shield (DDoS Mitigation)
        # If the environment has a Cloudflare secret set, ALL traffic must contain it.
        # This prevents attackers from hitting the AWS/VPS public IP directly and bypassing Cloudflare.
        if settings.CLOUDFLARE_ORIGIN_SECRET:
            cf_secret = request.headers.get("X-Cloudflare-Secret") or request.headers.get("X-Origin-Secret")
            if cf_secret != settings.CLOUDFLARE_ORIGIN_SECRET:
                logger.warning(f"DDoS SHIELD: Dropped unauthenticated proxy traffic from {request.client.host}")
                return JSONResponse(
                    status_code=403, 
                    content={"detail": "Forbidden: Untrusted Proxy / Invalid Origin Secret"}
                )

        # 2. IP Whitelist Firewall (Admin Zone)
        # We exclusively lock the /admin and system endpoints (both legacy and versioned)
        path = request.url.path
        is_admin_path = (
            path.startswith("/admin/") or path.startswith("/api/admin/") or 
            path.startswith("/api/v1/admin/") or path.startswith("/system/") or
            path.startswith("/api/v1/system/")
        )
        if is_admin_path:
            
            # ALWAYS allow OPTIONS preflight requests for CORS to succeed gracefully
            if request.method == "OPTIONS":
                return await call_next(request)
                
            # Use X-Forwarded-For if behind a proxy, else local client host
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            else:
                client_ip = request.client.host if request.client else "127.0.0.1"
                
            if not self._is_ip_allowed(client_ip, self.allowed_admin_networks):
                logger.warning(f"FIREWALL: Rejected Admin Access from unwhitelisted IP: {client_ip}")
                return JSONResponse(
                    status_code=403,
                    content={"detail": f"Firewall Exception: Your IP ({client_ip}) is not whitelisted for the Administration Zone."}
                )

        # Allow traffic to proceed if it passes network shields
        response = await call_next(request)
        return response
