import asyncio
import json
import logging
from app.services.deep_research.orchestrator import run_pipeline

logging.basicConfig(level=logging.WARNING)

query = "What are the exact release dates and architectural differences between GPT-4o and o1, and what are the major controversies surrounding their safety alignment?"

async def test_deep_research():
    print(f"--- Running Deep Research Pipeline ---")
    print(f"Query: {query}\n")
    
    with open('test_results.md', 'w', encoding='utf-8') as f:
        pass
        
    async for event in run_pipeline(query):
        if event.startswith("data: "):
            try:
                data = json.loads(event[6:].strip())
                event_type = data.get("type")
                
                if event_type == "research_stage":
                    print(f"\n[{data.get('message')}]", flush=True)
                elif event_type == "agent_status":
                    agent = data.get("agent")
                    status = data.get("status")
                    msg = data.get("message", "")
                    print(f"  [{agent}] {status.upper()}: {msg}", flush=True)
                    if "data" in data and data["data"]:
                        print(f"    -> {data['data']}", flush=True)
                elif event_type == "partial_finding":
                    claim = data.get('claim', '')
                    print(f"  [Finding] {claim[:150]}... (Confidence: {data.get('confidence', 0):.0%})", flush=True)
                elif event_type == "source_found":
                    print(f"  [Source] {data.get('url')}", flush=True)
                elif event_type == "quality_gate":
                    print(f"  [Quality Gate] Verdict: {data.get('verdict')} (Confidence: {data.get('confidence', 0):.0%})", flush=True)
                    print(f"    Feedback: {data.get('feedback')}", flush=True)
                elif event_type == "plan":
                    print(f"  [Plan] Generated {len(data.get('subtopics', []))} subtopics.", flush=True)
                elif event_type == "report":
                    report = data.get("content", "")
                    print("\n" + "="*50, flush=True)
                    print("FINAL REPORT:", flush=True)
                    print("="*50, flush=True)
                    print(report, flush=True)
                    print("="*50, flush=True)
                elif event_type == "done":
                    print(f"\n[DONE] Pipeline complete. {data.get('total_sources')} sources analyzed in {data.get('iterations')} iterations.", flush=True)
                elif event_type == "error":
                    print(f"\n[ERROR] {data.get('message')}", flush=True)
                else:
                    print(f"  [Unknown Event] {event_type}", flush=True)
            except Exception as e:
                print(f"Exception parsing event: {e}", flush=True)

if __name__ == "__main__":
    asyncio.run(test_deep_research())
