import { useState, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface ResearchProgress {
  agents: Record<string, { status: string; message?: string; data?: any }>;
  sources: { title: string; url: string; authority: number; type: string }[];
  plan: any;
  qualityGate: any;
  phase: string;
}

interface ResearchStep {
  step_number: number;
  title: string;
  content: string;
  confidence: number;
  status: string;
  duration_ms?: number;
}

export function useResearchStream() {
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const cancelResearch = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsResearching(false);
    setProgress(null);
  }, []);

  const startResearch = useCallback(
    async (
      query: string,
      token: string,
      sessionId: string | undefined,
      activeModel: string,
      navigate: (path: string, opts?: any) => void,
      onUpdate: (report: string) => void
    ) => {
      const abortController = new AbortController();
      abortRef.current = abortController;
      setIsResearching(true);
      setProgress({ agents: {}, sources: [], plan: null, qualityGate: null, phase: "Initializing..." });
      setReportContent("");
      const timeout = setTimeout(() => abortController.abort(), 300000);

      try {
        const resp = await fetch(`${API_URL}/research/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ query, conversation_id: sessionId || null, model: activeModel }),
        });

        if (resp.status === 401) throw new Error("Session expired");
        if (resp.status === 402) {
          const d = await resp.json().catch(() => ({ detail: "Upgrade required" }));
          throw new Error(d.detail || "Deep Research requires an upgraded plan");
        }
        if (resp.status === 429) {
          const d = await resp.json().catch(() => ({ detail: "Usage limit reached" }));
          throw new Error(d.detail || "Usage limit reached");
        }
        if (!resp.ok) throw new Error(`Research failed (${resp.status})`);

        const newSid = resp.headers.get("X-Chat-Session-ID");
        if (newSid && newSid !== sessionId) navigate(`/${newSid}`, { replace: true });

        const reader = resp.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";

        while (true) {
          if (abortController.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const sep = buffer.includes("\n\n") ? "\n\n" : "\n";
          const parts = buffer.split(sep);
          buffer = parts.pop() || "";

          for (const part of parts) {
            const t = part.trim();
            if (!t.startsWith("data: ")) continue;
            try {
              const ev = JSON.parse(t.slice(6));
              switch (ev.type) {
                case "research_stage":
                  setProgress((p) => p ? { ...p, phase: `Stage ${ev.stage_number}/${ev.total_stages}: ${ev.message}` } : p);
                  break;
                case "agent_status":
                  setProgress((p) => p ? { ...p, agents: { ...p.agents, [ev.agent]: { status: ev.status, message: ev.message, data: ev.data } } } : p);
                  break;
                case "plan":
                  setProgress((p) => p ? { ...p, plan: ev.tree } : p);
                  break;
                case "source_found":
                  setProgress((p) => p ? { ...p, sources: [...p.sources, ev.source] } : p);
                  break;
                case "partial_finding":
                  content += `\n- ${ev.claim || ""}`;
                  onUpdate(content);
                  break;
                case "quality_gate":
                  setProgress((p) => p ? { ...p, qualityGate: ev } : p);
                  break;
                case "report":
                  const r = ev.executive_summary
                    ? `## Executive Summary\n\n${ev.executive_summary}\n\n---\n\n${ev.content || ""}`
                    : ev.content || "";
                  const footer = `\n\n---\n📊 **Confidence:** ${Math.round((ev.confidence || 0) * 100)}% | 📚 **Sources:** ${ev.source_count || 0}`;
                  content = r + footer;
                  setReportContent(content);
                  onUpdate(content);
                  break;
                case "done":
                  setProgress(null);
                  break;
                case "error":
                  content = `⚠️ **Research error:** ${ev.message || "Unknown error"}`;
                  onUpdate(content);
                  break;
              }
            } catch { /* skip partial */ }
          }
        }
      } catch (err: any) {
        setProgress(null);
        onUpdate(`⚠️ **Deep Research failed:**\n\n${err.message || "Unknown error"}`);
      } finally {
        clearTimeout(timeout);
        setIsResearching(false);
      }
    },
    []
  );

  return { startResearch, cancelResearch, progress, isResearching, reportContent };
}
