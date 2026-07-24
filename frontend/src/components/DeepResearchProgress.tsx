import React, { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { Spinner, CheckCircle, WarningCircle, Database, Graph, ShieldCheck, Cpu } from "@phosphor-icons/react";
import { cn } from "../lib/utils";
import AIAgentPipeline from "./ui/ai-agent-pipeline";

export function DeepResearchProgress({ progress }: { progress: any }) {
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const isComplete = progress?.phase?.toLowerCase().includes("complete") || (progress?.agents && Object.values(progress.agents).length > 0 && Object.values(progress.agents).every((a: any) => a.status === 'complete'));
    if (isComplete) return;

    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, progress]);

  if (!progress) return null;

  const agents = Object.entries(progress.agents || {});
  const sources = progress.sources || [];
  
  const dynamicMessages = agents.map(([_, a]: any) => a.message).filter(Boolean);
  const activeCount = agents.filter(([_, a]: any) => a.status === 'running').length;
  const completedCount = agents.filter(([_, a]: any) => a.status === 'complete').length;

  const dynamicOutputs: { label: string; status: "done" | "active" | "queued" }[] = [
    { label: "Source Index", status: sources.length > 0 ? "done" : "active" },
    { label: "Fact Check", status: completedCount > 0 ? (progress.phase?.toLowerCase().includes("complete") ? "done" : "active") : "queued" },
    { label: "Report Gen", status: progress.phase?.toLowerCase().includes("complete") ? "done" : "queued" }
  ];

  return (
<LazyMotion features={domAnimation}>
    <div className="w-full max-w-3xl flex flex-col gap-4 font-sans my-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] relative overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: 'var(--color-accent)' }} />
        <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-accent)]/10">
          <Cpu className="h-5 w-5 animate-pulse" style={{ color: 'var(--color-accent)' }} weight="fill" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Deep Research Node Active
          </h3>
          <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            {progress.phase || "Initializing 12-agent pipeline..."}
          </p>
        </div>
        <Spinner className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>

      {/* Pipeline Visualization */}
      <AIAgentPipeline 
        variant="research" 
        dynamicStats={[
          { label: "WORKFLOWS", value: agents.length },
          { label: "SOURCES", value: sources.length },
          { label: "AGENTS", value: activeCount || agents.length || 12 },
          { label: "LATENCY", value: `${elapsed.toFixed(1)}s` }
        ]}
        dynamicMessages={dynamicMessages.length > 0 ? dynamicMessages : [progress.phase || "Initializing agents..."]}
        dynamicOutputs={dynamicOutputs}
        dynamicNodes={agents.map(([agentName, data]: any) => ({
          id: agentName,
          label: agentName,
          status: data.status === "running" ? "running" : data.status === "complete" ? "completed" : data.status === "error" ? "error" : "pending"
        }))}
      />

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {agents.map(([agentName, data]: any, i) => (
            <m.div
              key={agentName}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border shadow-sm transition-all duration-500 relative overflow-hidden",
                data.status === "running" ? "border-transparent" : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
              )}
              style={{ background: 'var(--color-bg)' }}
            >
              {data.status === "running" && (
                <div className="absolute inset-0 rounded-xl" style={{ padding: '1px', background: 'linear-gradient(90deg, var(--color-accent), transparent, var(--color-accent))', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', animation: 'spin 3s linear infinite' }} />
              )}
              {data.status === "running" && <Spinner className="h-4 w-4 animate-spin shrink-0 relative z-10" style={{ color: 'var(--color-accent)' }} />}
              {data.status === "complete" && <CheckCircle className="h-4 w-4 shrink-0 relative z-10" style={{ color: 'var(--color-success)' }} weight="fill" />}
              {data.status === "error" && <WarningCircle className="h-4 w-4 shrink-0 relative z-10" style={{ color: 'var(--color-error)' }} weight="fill" />}
              {!["running", "complete", "error"].includes(data.status) && <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse shrink-0 ml-1 mr-1 relative z-10" />}
              
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{agentName}</p>
                {data.message && (
                  <p className="text-[11px] truncate opacity-70" style={{ color: 'var(--color-text-secondary)' }}>{data.message}</p>
                )}
              </div>
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />

      {/* Sources */}
      {sources.length > 0 && (
        <m.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex flex-col gap-3 p-4 rounded-xl border border-[var(--color-border)]"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
            <h4 className="text-[13px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Sources Analysed ({sources.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s: any, idx: number) => (
              <a 
                key={idx} 
                href={s.url} 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors truncate max-w-[200px] flex items-center gap-1"
                style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}
              >
                {s.title || new URL(s.url).hostname}
              </a>
            ))}
          </div>
        </m.div>
      )}
    </div>
  </LazyMotion>
);
}
