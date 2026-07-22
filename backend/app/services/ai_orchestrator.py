import random
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.ai_model import ModelRegistry
import httpx
import logging

logger = logging.getLogger(__name__)

class ModelOrchestrator:
    def __init__(self, db: Session):
        self.db = db

    async def get_route(self, model_name: str) -> Optional[ModelRegistry]:
        """
        Implements weighted A/B testing and traffic routing.
        If multiple endpoints exist for the same logical model name, 
        pick one based on weight.
        """
        models = self.db.query(ModelRegistry).filter(
            ModelRegistry.model_name == model_name,
            ModelRegistry.is_active == True
        ).all()

        if not models:
            return None

        # Weighted selection
        total_weight = sum(m.weight for m in models)
        if total_weight == 0:
            return random.choice(models)

        pick = random.uniform(0, total_weight)
        current = 0
        for m in models:
            current += m.weight
            if current >= pick:
                return m
        return models[-1]

    async def execute_request(self, model_name: str, payload: dict):
        """
        Executes a proxy request to the selected model endpoint.
        Implements fallback chains.
        """
        route = await self.get_route(model_name)
        if not route:
            raise Exception(f"No active route found for model: {model_name}")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(route.endpoint_url, json=payload)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Request failed for {route.endpoint_url}: {e}")
            
            # Fallback logic
            if route.fallback_model_id:
                fallback_route = self.db.query(ModelRegistry).filter(ModelRegistry.id == route.fallback_model_id).first()
                if fallback_route and fallback_route.is_active:
                    logger.info(f"Stepping down to fallback: {fallback_route.model_name}")
                    return await self.execute_request(fallback_route.model_name, payload)
            
            raise e
