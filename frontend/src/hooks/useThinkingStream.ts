import { useState, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface ThinkingStep {
  step_number: number;
  title: string;
  content: string;
  confidence: number;
  status: string;
  duration_ms?: number;
  verification_issues?: string[];
}

interface ThinkingProgress {
  stage: string;
  message: string;
  steps: ThinkingStep[];
  confidence: number;
  sub_problems?: string[];
}

export function useThinkingStream() {
  const [progress, setProgress] = useState<ThinkingProgress | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const cancelThinking = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsThinking(false);
    setProgress(null);
  }, []);

  const startThinking = useCallback(
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
      setIsThinking(true);
      setProgress({ stage: "analyzing", message: "Analyzing your question...", steps: [], confidence: 0 });
      const timeout = setTimeout(() => abortController.abort(), 300000);

      try {
        const resp = await fetch(`${API_URL}/thinking/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ query, conversation_id: sessionId || null, model: activeModel }),
        });

        if (resp.status === 401) throw new Error("Session expired");
        if (resp.status === 402) {
          const d = await resp.json().catch(() => ({ detail: "Upgrade required" }));
          throw new Error(d.detail || "Deep Thinking requires an upgraded plan");
        }
        if (resp.status === 429) {
          const d = await resp.json().catch(() => ({ detail: "Usage limit reached" }));
          throw new Error(d.detail || "Usage limit reached");
        }
        if (!resp.ok) throw new Error(`Thinking failed (${resp.status})`);

        const newSid = resp.headers.get("X-Chat-Session-ID");
        if (newSid && newSid !== sessionId) navigate(`/${newSid}`, { replace: true });

        const reader = resp.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

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
                case "thinking_progress":
                  setProgress((p) => p ? { ...p, stage: ev.stage || p.stage, message: ev.message || p.message, confidence: ev.confidence || p.confidence, sub_problems: ev.sub_problems || p.sub_problems } : p);
                  break;
                case "reasoning_step":
                  setProgress((p) => p ? { ...p, steps: [...p.steps, { step_number: ev.step_number, title: ev.title, content: ev.content, confidence: ev.confidence || 0.5, status: ev.status || "pending", duration_ms: ev.duration_ms, verification_issues: ev.verification_issues }] } : p);
                  break;
                case "thinking_complete": {
                  const report = ev.report || {};
                  const chain = (report.reasoning_chain || []).map((s: any) => `**Step ${s.step_number}:** ${s.title}\n${s.content}`).join("\n\n");
                  const full = [
                    report.executive_summary || report.conclusion || "",
                    chain ? `\n\n---\n\n## Reasoning Process\n\n${chain}` : "",
                    `\n\n---\n\n**Overall Confidence:** ${Math.round((report.confidence_score || 0) * 100)}%`,
                    report.caveats?.length ? `\n\n**Caveats:** ${report.caveats.join(", ")}` : "",
                  ].join("");
                  onUpdate(full);
                  setProgress(null);
                  break;
                }
                case "done":
                  setProgress(null);
                  break;
                case "error":
                  onUpdate(`⚠️ **Thinking error:** ${ev.message || "Unknown error"}`);
                  setProgress(null);
                  break;
              }
            } catch { /* skip partial */ }
          }
        }
      } catch (err: any) {
        setProgress(null);
        onUpdate(`⚠️ **Deep Thinking failed:**\n\n${err.message || "Unknown error"}`);
      } finally {
        clearTimeout(timeout);
        setIsThinking(false);
      }
    },
    []
  );

  return { startThinking, cancelThinking, progress, isThinking };
}
