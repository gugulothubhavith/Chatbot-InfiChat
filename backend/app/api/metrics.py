from fastapi import APIRouter, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, Summary
import time

router = APIRouter(prefix="/metrics", tags=["Observability"])

# Define Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP Requests', ['method', 'endpoint', 'status'])
LATENCY = Histogram('http_request_duration_seconds', 'HTTP Request Latency', ['endpoint'])
ACTIVE_USERS = Gauge('active_users_current', 'Current number of active users')
LLM_TOKENS = Counter('llm_tokens_total', 'Total LLM tokens processed', ['direction', 'model'])

@router.get("")
def get_metrics():
    """Exporter for Prometheus scraping"""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
