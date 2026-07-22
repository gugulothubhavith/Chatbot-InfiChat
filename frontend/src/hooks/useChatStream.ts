import { useState, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface StreamCallbacks {
  onToken: (text: string) => void;
  onError: (error: string) => void;
  onDone: () => void;
  onStatus?: (code: number, message: string) => void;
}

export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendStreamingMessage = useCallback(
    async (url: string, body: object, callbacks: StreamCallbacks, token?: string) => {
      const abortController = new AbortController();
      abortRef.current = abortController;
      setIsStreaming(true);

      const timeout = setTimeout(() => abortController.abort(), 300000);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          signal: abortController.signal,
          body: JSON.stringify(body),
        });

        callbacks.onStatus?.(response.status, response.statusText);

        if (response.status === 401) {
          callbacks.onError("Session expired. Please refresh and log in again.");
          return;
        }
        if (response.status === 402) {
          const data = await response.json().catch(() => ({ detail: "Feature requires an upgraded plan" }));
          callbacks.onError(data.detail || "Feature requires an upgraded plan");
          return;
        }
        if (response.status === 403) {
          const data = await response.json().catch(() => ({ detail: "Not authenticated" }));
          callbacks.onError(data.detail || "Not authenticated. Please log in again.");
          return;
        }
        if (response.status === 429) {
          const data = await response.json().catch(() => ({ detail: "Usage limit reached" }));
          callbacks.onError(data.detail || "Usage limit reached. Please wait or upgrade.");
          return;
        }
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          callbacks.onError(`Request failed (${response.status}): ${text.slice(0, 200)}`);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError("No response stream available");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          if (abortController.signal.aborted) {
            callbacks.onDone();
            return;
          }
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const separator = buffer.includes("\n\n") ? "\n\n" : "\n";
          const parts = buffer.split(separator);
          buffer = parts.pop() || "";

          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data && typeof data.content === "string") {
                fullText += data.content;
                callbacks.onToken(fullText);
              }
            } catch {
              // Non-JSON SSE data
            }
          }
        }

        // Flush buffer
        if (buffer.trim().startsWith("data: ")) {
          try {
            const data = JSON.parse(buffer.trim().slice(6));
            if (data && typeof data.content === "string") {
              fullText += data.content;
              callbacks.onToken(fullText);
            }
          } catch {
            // ignore
          }
        }

        callbacks.onDone();
      } catch (err: any) {
        if (err.name === "AbortError") {
          callbacks.onDone();
          return;
        }
        const msg = err.message || "Something went wrong";
        if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
          callbacks.onError("Unable to reach the server. Please check that the backend is running.");
        } else {
          callbacks.onError(msg);
        }
      } finally {
        clearTimeout(timeout);
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    []
  );

  return { sendStreamingMessage, cancelStream, isStreaming };
}
