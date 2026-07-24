import asyncio
from app.services.llm_router import call_llm

async def test():
    intent_prompt = "Does the following query absolutely require a real-time web search to answer accurately (e.g. current news, weather, recent events, live prices)? Reply ONLY with 'YES' or 'NO'.\nQuery: What is the weather in Khammam right now?"
    intent_payload = {
        'model': 'nvidia/nemotron-3-super-120b-a12b',
        'messages': [{'role': 'user', 'content': intent_prompt}],
        'temperature': 0.1,
        'max_tokens': 10
    }
    try:
        intent_res = await call_llm('chat', intent_payload, stream=False)
        print(intent_res)
    except Exception as e:
        print(f'Error: {e}')

asyncio.run(test())
