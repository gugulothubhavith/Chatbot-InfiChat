import React, { useState } from "react";
import {
  CheckCircle,
  Circle,
  WarningCircle,
  CircleDashed,
  XCircle,
  Code
} from "@phosphor-icons/react";
import { m, LazyMotion, domAnimation, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "../lib/utils";

// Type definitions
export interface AgentSubtask {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending" | "need-help" | "failed";
  priority: "high" | "medium" | "low";
  tools?: string[];
  currentActivity?: string;
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending" | "need-help" | "failed";
  priority: "high" | "medium" | "low";
  level: number;
  dependencies: string[];
  subtasks: AgentSubtask[];
  currentActivity?: string;
}

interface AgentTaskPlanProps {
  tasks: AgentTask[];
  onTaskStatusToggle?: (taskId: string) => void;
  onSubtaskStatusToggle?: (taskId: string, subtaskId: string) => void;
}

// Status icon component
function StatusIcon({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  switch (status) {
    case "completed":
      return <CheckCircle className={`${sizeClass}`} style={{ color: 'var(--color-success)' }} weight="fill" />;
    case "in-progress":
      return <CircleDashed className={`${sizeClass} animate-spin-slow`} style={{ color: 'var(--color-accent)' }} weight="bold" />;
    case "need-help":
      return <WarningCircle className={`${sizeClass}`} style={{ color: 'var(--color-warning)' }} weight="fill" />;
    case "failed":
      return <XCircle className={`${sizeClass}`} style={{ color: 'var(--color-error)' }} weight="fill" />;
    default:
      return <Circle className={`${sizeClass} opacity-30`} style={{ color: 'var(--color-text-secondary)' }} weight="regular" />;
  }
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case "completed":
      return { background: 'color-mix(in oklch, var(--color-success) 15%, transparent)', color: 'var(--color-success)' };
    case "in-progress":
      return { background: 'color-mix(in oklch, var(--color-accent) 20%, transparent)', color: 'var(--color-accent)' };
    case "need-help":
      return { background: 'color-mix(in oklch, var(--color-warning) 15%, transparent)', color: 'var(--color-warning)' };
    case "failed":
      return { background: 'color-mix(in oklch, var(--color-error) 15%, transparent)', color: 'var(--color-error)' };
    default:
      return { background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' };
  }
}

export default function AgentTaskPlan({
  tasks,
  onTaskStatusToggle,
  onSubtaskStatusToggle,
}: AgentTaskPlanProps) {
  const [expandedTasks, setExpandedTasks] = useState<string[]>(() =>
    tasks.reduce((acc, t) => {
      if (t.status === "in-progress") acc.push(t.id);
      return acc;
    }, [] as string[])
  );
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Animation variants using UI_SPRING from Design Spec
  const taskVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 12, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: prefersReducedMotion ? "tween" : "spring",
        stiffness: 400,
        damping: 30,
        mass: 1,
      },
    },
  };

  const subtaskListVariants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" as const },
    visible: {
      height: "auto" as const,
      opacity: 1,
      overflow: "visible" as const,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 35,
        mass: 1,
        staggerChildren: 0.03,
        when: "beforeChildren",
      },
    },
    exit: {
      height: 0,
      opacity: 0,
      overflow: "hidden" as const,
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* Progress Overview */}
        <div className="flex gap-4 mb-6">
          {tasks.map((t, idx) => (
             <div key={t.id} className="flex-1 flex flex-col gap-2">
                <div 
                   className={cn(
                     "h-1.5 w-full rounded-full transition-all duration-500",
                     t.status === 'completed' ? 'opacity-100' : 
                     t.status === 'in-progress' ? 'opacity-100 relative overflow-hidden' : 'opacity-20'
                   )}
                   style={{ background: t.status === 'completed' ? 'var(--color-success)' : t.status === 'in-progress' ? 'var(--color-accent)' : 'var(--color-border)' }}
                >
                   {t.status === 'in-progress' && (
                      <m.div 
                        className="absolute inset-0 w-full h-full bg-white/30"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                   )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 truncate" style={{ color: 'var(--color-text-secondary)' }}>Step {idx + 1}</span>
             </div>
          ))}
        </div>

        <LayoutGroup>
          <div className="space-y-4">
            {tasks.map((task) => {
              const isExpanded = expandedTasks.includes(task.id);
              const isCompleted = task.status === "completed";
              const isInProgress = task.status === "in-progress";

              return (
                <m.div
                  key={task.id}
                  layout
                  initial="hidden"
                  animate="visible"
                  variants={taskVariants}
                  className={cn(
                    "rounded-2xl transition-all duration-300 overflow-hidden",
                    isInProgress ? "shadow-lg scale-[1.01]" : ""
                  )}
                  style={{
                    background: isInProgress ? 'var(--color-surface-2)' : 'var(--color-surface)',
                    border: isInProgress ? '1px solid color-mix(in oklch, var(--color-accent) 50%, transparent)' : '1px solid var(--color-border)',
                    boxShadow: isInProgress ? '0 8px 32px color-mix(in oklch, var(--color-accent) 15%, transparent)' : 'none'
                  }}
                >
                  {/* Task Header */}
                  <m.div
                    className="flex flex-col px-6 py-4 cursor-pointer relative overflow-hidden"
                    onClick={() => toggleTaskExpansion(task.id)}
                    layout
                  >
                    {isInProgress && (
                       <m.div 
                         className="absolute top-0 left-0 w-1 h-full" 
                         style={{ background: 'var(--color-accent)' }}
                         layoutId="activeTaskIndicator"
                       />
                    )}

                    <div className="flex items-center gap-4">
                      <m.div
                        className="flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); onTaskStatusToggle?.(task.id); }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <AnimatePresence mode="wait">
                          <m.div key={task.status} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                            <StatusIcon status={task.status} size="md" />
                          </m.div>
                        </AnimatePresence>
                      </m.div>

                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <div>
                           <h3 className={cn("text-base font-bold tracking-tight transition-colors", isCompleted ? "opacity-50 line-through" : "")} style={{ color: 'var(--color-text-primary)' }}>
                             {task.title}
                           </h3>
                           <p className="text-sm mt-0.5 opacity-70 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{task.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                           {task.dependencies.length > 0 && (
                              <div className="hidden sm:flex gap-1.5 opacity-60">
                                {task.dependencies.map(dep => (
                                   <span key={dep} className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>#{dep}</span>
                                ))}
                              </div>
                           )}
                           <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest" style={getStatusBadgeStyle(task.status)}>
                             {task.status}
                           </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Activity Stream for Main Task */}
                    <AnimatePresence>
                      {task.currentActivity && isInProgress && (
                        <m.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="ml-9 flex items-center gap-3 px-4 py-2 rounded-xl"
                          style={{ background: 'color-mix(in oklch, var(--color-accent) 8%, transparent)', border: '1px solid color-mix(in oklch, var(--color-accent) 20%, transparent)' }}
                        >
                          <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--color-accent)' }} />
                          <span className="text-xs font-mono font-medium truncate" style={{ color: 'var(--color-accent)' }}>
                            {task.currentActivity}
                          </span>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>

                  {/* Subtasks */}
                  <AnimatePresence mode="wait">
                    {isExpanded && task.subtasks.length > 0 && (
                      <m.div
                        variants={subtaskListVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="px-6 pb-5"
                      >
                        <div className="pl-5 pt-3 border-t relative" style={{ borderColor: 'var(--color-border)' }}>
                          {/* Tree guide line */}
                          <div className="absolute top-0 bottom-4 left-7 border-l-2 border-dashed" style={{ borderColor: 'var(--color-border)' }} />
                          
                          <ul className="space-y-1 relative z-10">
                            {task.subtasks.map((subtask) => {
                              const subtaskKey = `${task.id}-${subtask.id}`;
                              const isSubtaskExpanded = expandedSubtasks[subtaskKey];

                              return (
                                <m.li key={subtask.id} className="flex flex-col pl-6 py-1.5" layout>
                                  <div 
                                    className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors"
                                    style={{ background: isSubtaskExpanded ? 'var(--color-bg)' : 'transparent' }}
                                    onClick={() => toggleSubtaskExpansion(task.id, subtask.id)}
                                  >
                                    <div onClick={(e) => { e.stopPropagation(); onSubtaskStatusToggle?.(task.id, subtask.id); }}>
                                      <StatusIcon status={subtask.status} size="sm" />
                                    </div>
                                    <span className={cn("text-sm font-medium", subtask.status === "completed" ? "opacity-50 line-through" : "")} style={{ color: 'var(--color-text-primary)' }}>
                                      {subtask.title}
                                    </span>
                                  </div>

                                  <AnimatePresence>
                                    {isSubtaskExpanded && (
                                      <m.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="pl-9 pr-4 py-2 overflow-hidden text-sm"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                      >
                                        <p className="leading-relaxed mb-3">{subtask.description}</p>
                                        {subtask.tools && (
                                          <div className="flex flex-wrap gap-2">
                                            {subtask.tools.map(tool => (
                                              <span key={tool} className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'color-mix(in oklch, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}>
                                                {tool}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </m.div>
                                    )}
                                  </AnimatePresence>
                                </m.li>
                              );
                            })}
                          </ul>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </m.div>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </LazyMotion>
  );
}
