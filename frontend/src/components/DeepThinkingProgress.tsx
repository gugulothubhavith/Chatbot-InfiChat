import React, { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
  Brain, Spinner, CheckCircle, WarningCircle, Warning,
  CaretDown, CaretRight, Lightbulb, Sparkle, Clock,
} from "@phosphor-icons/react";
import AIAgentPipeline from "./ui/ai-agent-pipeline";

interface ReasoningStep {
  step_number: number;
  title: string;
  content: string;
  confidence: number;
  status: string;
  duration_ms?: number;
  verification_issues?: string[];
}

interface DeepThinkingProgressProps {
  progress: {
    stage: string;
    message: string;
    steps: ReasoningStep[];
    confidence: number;
    sub_problems?: string[];
  } | null;
}

const stageConfig: Record<string, { label: string; color: string; icon: any }> = {
  analyzing: { label: "Analyzing", color: "var(--color-accent)", icon: Lightbulb },
  reasoning: { label: "Reasoning", color: "oklch(0.600 0.200 300)", icon: Brain },
  verifying: { label: "Verifying", color: "oklch(0.650 0.250 15)", icon: Warning },
  synthesizing: { label: "Synthesizing", color: "oklch(0.600 0.200 240)", icon: Sparkle },
  complete: { label: "Complete", color: "var(--color-success)", icon: CheckCircle },
};

export function DeepThinkingProgress({ progress }: DeepThinkingProgressProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (progress?.stage === "complete") return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, progress]);

  if (!progress) return null;

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) next.delete(stepNumber);
      else next.add(stepNumber);
      return next;
    });
  };



  const cfg = stageConfig[progress.stage] || stageConfig.analyzing;

  return (
<LazyMotion features={domAnimation}>
    <div className="w-full max-w-3xl flex flex-col gap-4 font-sans my-4">
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-4 rounded-xl border relative overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: cfg.color }} />
        <div
          className="relative flex items-center justify-center h-10 w-10 rounded-full shrink-0"
          style={{ background: `${cfg.color}15` }}
        >
          {progress.stage === "complete" ? (
            <CheckCircle className="h-5 w-5" style={{ color: cfg.color }} weight="fill" />
          ) : (
            <Brain className="h-5 w-5 animate-pulse" style={{ color: cfg.color }} weight="fill" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[15px] tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Deep Thinking Active
          </h3>
          <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-tertiary)" }}>
            {progress.message || "Processing..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {progress.steps.length > 0 && (
            <span className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
              {progress.steps.length} steps
            </span>
          )}
          {progress.stage !== "complete" && (
            <Spinner className="h-5 w-5 animate-spin shrink-0" style={{ color: cfg.color }} />
          )}
        </div>
      </m.div>

      {/* Pipeline Visualization */}
      <AIAgentPipeline 
        variant="thinking" 
        dynamicStats={[
          { label: "WORKFLOWS", value: progress.steps.length },
          { label: "STEPS", value: progress.steps.length },
          { label: "CONFIDENCE", value: `${(progress.confidence * 100).toFixed(1)}%` },
          { label: "LATENCY", value: `${elapsed.toFixed(1)}s` }
        ]}
        dynamicMessages={progress.steps.length > 0 ? progress.steps.map(s => s.title) : [progress.message || "Initializing reasoning engine..."]}
        dynamicOutputs={[
          { label: "Analysis", status: progress.stage === "analyzing" ? "active" : "done" },
          { label: "Verification", status: progress.stage === "analyzing" ? "queued" : progress.stage === "verifying" || progress.stage === "reasoning" ? "active" : "done" },
          { label: "Synthesis", status: progress.stage === "complete" ? "done" : progress.stage === "synthesizing" ? "active" : "queued" }
        ] as { label: string; status: "done" | "active" | "queued" }[]}
        dynamicNodes={progress.steps.map(s => ({
          id: `step-${s.step_number}`,
          label: `Step ${s.step_number}`,
          status: s.status === 'running' || s.status === 'processing' ? 'running' : s.status === 'completed' || s.status === 'complete' ? 'completed' : 'error'
        }))}
      />

      {/* Stage Progress Bar */}
      <div className="flex items-center gap-2 px-1">
        {["analyzing", "reasoning", "verifying", "synthesizing"].map((stage, idx) => {
          const sc = stageConfig[stage];
          const isActive = progress.stage === stage;
          const isPast = ["analyzing", "reasoning", "verifying", "synthesizing", "complete"].indexOf(progress.stage) > idx;
          const StageIcon = sc.icon;
          return (
            <div key={stage} className="flex items-center gap-1.5 flex-1">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                style={{
                  background: isActive ? `${sc.color}15` : isPast ? `${sc.color}10` : "transparent",
                  color: isActive ? sc.color : isPast ? sc.color : "var(--color-text-tertiary)",
                  opacity: isPast ? 0.8 : isActive ? 1 : 0.5,
                }}
              >
                <StageIcon className="h-3 w-3" weight="fill" />
                <span className="hidden sm:inline">{sc.label}</span>
              </div>
              {idx < 3 && (
                <div className="flex-1 h-px" style={{
                  background: isPast ? sc.color : "var(--color-border)",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Reasoning Steps */}
      <AnimatePresence mode="popLayout">
        {progress.steps.map((step, index) => {
          const isLatest = index === progress.steps.length - 1 && progress.stage !== "complete";
          return (
          <m.div
            key={step.step_number}
            initial={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(8px)" }}
            animate={{ 
              opacity: isLatest ? 1 : 0.7, 
              y: 0, 
              scale: 1, 
              filter: "blur(0px)",
              borderColor: isLatest ? "var(--color-accent)" : "var(--color-border)"
            }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-xl border overflow-hidden transition-all duration-300 shadow-sm"
            style={{
              background: "var(--color-bg)",
            }}
          >
            {/* Step Header */}
            <button
              onClick={() => toggleStep(step.step_number)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
            >
              {/* Step Number Badge */}
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                style={{
                  background:
                    step.status === "verified"
                      ? "var(--color-success-subtle)"
                      : step.status === "failed"
                      ? "var(--color-error-subtle)"
                      : `${cfg.color}15`,
                  color:
                    step.status === "verified"
                      ? "var(--color-success)"
                      : step.status === "failed"
                      ? "var(--color-error)"
                      : cfg.color,
                }}
              >
                {step.step_number}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                  {step.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Status Indicator */}
                  {step.status === "verified" && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-success)" }}>
                      <CheckCircle className="h-3 w-3" weight="fill" /> Verified
                    </span>
                  )}
                  {step.status === "failed" && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-error)" }}>
                      <WarningCircle className="h-3 w-3" weight="fill" /> Needs review
                    </span>
                  )}
                  {(step.status === "pending" || step.status === "revised") && (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {step.status === "revised" ? "Revised" : "Pending"}
                    </span>
                  )}
                  {/* Confidence */}
                  {step.confidence > 0 && (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {Math.round(step.confidence * 100)}% confidence
                    </span>
                  )}
                  {/* Duration */}
                  {step.duration_ms && step.duration_ms > 0 && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-text-tertiary)" }}>
                      <Clock className="h-3 w-3" weight="bold" /> {(step.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>

              {/* Expand/Collapse */}
              <div
                className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200"
                style={{ transform: expandedSteps.has(step.step_number) ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <CaretDown className="h-4 w-4" style={{ color: "var(--color-text-tertiary)" }} weight="bold" />
              </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {expandedSteps.has(step.step_number) && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-4 pb-4 pt-1 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      color: "var(--color-text-secondary)",
                      borderTop: "1px solid var(--color-border)",
                    }}
                  >
                    {step.content}

                    {/* Verification Issues */}
                    {step.verification_issues && step.verification_issues.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--color-error-subtle)" }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-error)" }}>
                          Issues found:
                        </p>
                        <ul className="text-xs space-y-1">
                          {step.verification_issues.map((issue, i) => (
                            <li key={issue + "-" + i} style={{ color: "var(--color-error)" }}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
          );
        })}
      </AnimatePresence>

      {/* Confidence Meter (shown when complete) */}
      {progress.stage === "complete" && progress.confidence > 0 && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Overall Confidence
            </span>
            <span className="text-sm font-bold" style={{ color: cfg.color }}>
              {Math.round(progress.confidence * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-hover)" }}>
            <m.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.confidence * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ background: cfg.color }}
            />
          </div>
        </m.div>
      )}
    </div>
  </LazyMotion>
);
}
