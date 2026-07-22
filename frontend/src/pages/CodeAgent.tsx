import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import { Button } from "../components/ui/Button";
import { 
  Play, Spinner as Loader2, Code as Code2, Sparkle as Sparkles, MagicWand as Wand2, TerminalWindow as TerminalSquare, 
  MagnifyingGlass as Search, FileCode as FileCode2, DownloadSimple as Download, SidebarSimple as LayoutPanelLeft, Folder, 
  CaretRight as ChevronRight, CaretDown as ChevronDown, File, X
} from "@phosphor-icons/react";
import { m, AnimatePresence, LayoutGroup } from "framer-motion";
import AgentTaskPlan, { type AgentTask } from "../components/AgentTaskPlan";
import { cn } from "../lib/utils";
import AIAgentPipeline from "../components/ui/ai-agent-pipeline";

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Demo tasks for the multi-agent squad plan view
const demoSquadTasks: AgentTask[] = [
  { id: "1", title: "System Architecture", description: "Architect designs system components and tech stack", status: "pending", priority: "high", level: 0, dependencies: [], subtasks: [] },
  { id: "2", title: "Technical Specifications", description: "SpecWriter details functional requirements and APIs", status: "pending", priority: "high", level: 0, dependencies: ["1"], subtasks: [] },
  { id: "3", title: "Task Decomposition", description: "TaskDecomposer breaks down work into parallel coding tasks", status: "pending", priority: "high", level: 0, dependencies: ["2"], subtasks: [] },
  { id: "4", title: "Parallel Coding Swarm", description: "CoderSwarm agents generate all required source code", status: "pending", priority: "high", level: 0, dependencies: ["3"], subtasks: [] },
  { id: "5", title: "Automated Testing", description: "Tester agent generates and verifies tests", status: "pending", priority: "medium", level: 0, dependencies: ["4"], subtasks: [] }
];

// --- Recursive File Tree Types & Components ---
interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: TreeNode[];
}

function buildFileTree(files: Record<string, string>): TreeNode[] {
  const root: TreeNode[] = [];
  
  for (const filepath of Object.keys(files)) {
    const parts = filepath.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      let existingNode = currentLevel.find(n => n.name === part);
      
      if (!existingNode) {
        const isFile = i === parts.length - 1;
        existingNode = {
          name: part,
          type: isFile ? 'file' : 'folder',
          path: currentPath,
          children: isFile ? undefined : []
        };
        currentLevel.push(existingNode);
      }
      
      if (!existingNode.children) existingNode.children = [];
      currentLevel = existingNode.children;
    }
  }

  // Sort folders first, then files
  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
    nodes.forEach(n => { if (n.children) sortTree(n.children); });
  };
  
  sortTree(root);
  return root;
}

const FileTreeNode = ({ 
  node, depth = 0, selectedFile, onSelect 
}: { 
  node: TreeNode, depth?: number, selectedFile: string | null, onSelect: (path: string) => void 
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedFile === node.path;
  const isFolder = node.type === 'folder';

  return (
    <div>
      <div 
        className={cn(
          "flex items-center py-1.5 px-2 cursor-pointer text-xs font-mono transition-colors",
          isSelected ? "bg-[var(--color-surface-active)] text-[var(--color-text-primary)] border-l-2 border-[var(--color-accent)]" : "text-[var(--color-text-secondary)] border-l-2 border-transparent hover:bg-[var(--color-surface)]"
        )}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
        onClick={() => isFolder ? setIsOpen(!isOpen) : onSelect(node.path)}
      >
        {isFolder ? (
           isOpen ? <ChevronDown className="h-3.5 w-3.5 mr-1.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 mr-1.5 opacity-60" />
        ) : (
           <span className="w-5" /> // spacer for files
        )}
        
        {isFolder ? (
           <Folder className="h-3.5 w-3.5 mr-2 opacity-70" />
        ) : (
           <FileCode2 className="h-3.5 w-3.5 mr-2 opacity-70 text-[var(--color-accent)]" />
        )}
        
        <span className="truncate">{node.name}</span>
      </div>
      
      {isFolder && isOpen && node.children && (
        <div className="flex flex-col">
          {node.children.map(child => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} selectedFile={selectedFile} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};


export default function CodeAgentWorkspace() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [squadTasks, setSquadTasks] = useState<AgentTask[]>(demoSquadTasks);
  const [hasStarted, setHasStarted] = useState(false);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingRaw, setStreamingRaw] = useState("");

  // Real-time tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [prompt]);

  // Auto-scroll stream
  useEffect(() => {
    if (isStreaming && streamingEndRef.current) {
       streamingEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingRaw, isStreaming]);

  // Real-time latency tracking
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loading && startTime) {
      interval = setInterval(() => {
        setElapsed((Date.now() - startTime) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [loading, startTime]);

  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  useEffect(() => {
    const loadSessionData = async () => {
      if (!token) return;
      
      // If no sessionId, ensure workspace is reset (user clicked "New Chat")
      if (!sessionId) {
        setHasStarted(false);
        setPrompt("");
        setUserPrompt("");
        setFiles({});
        setSelectedFile(null);
        setStreamingRaw("");
        setIsStreaming(false);
        setSquadTasks(demoSquadTasks);
        return;
      }

      // If we have a sessionId, reset state before loading new data to avoid stale UI
      setPrompt("");
      setStreamingRaw("");
      
      try {
        const res = await axios.get(`/chat/sessions/${sessionId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const messages = res.data;
        const userMsg = messages.find((m: any) => m.role === 'user');
        const assistantMsg = messages.find((m: any) => m.role === 'assistant');
        
        if (userMsg) {
           setUserPrompt(userMsg.content);
           setPrompt("");
           setHasStarted(true);
        }
        
        if (assistantMsg) {
           const raw = assistantMsg.content;
           const parsed: Record<string, string> = {};
           const regex = /```(?:[a-zA-Z0-9_\-+]+)?[\s:]*([^\n]+)?\n([\s\S]*?)(?:```|$)/g;
           let match;
           while ((match = regex.exec(raw)) !== null) {
               let filename = (match[1] || "").trim();
               let content = match[2] || "";
               if (!filename && content) {
                   const lines = content.split('\n');
                   if (lines[0].startsWith('// filepath:') || lines[0].startsWith('# filepath:')) {
                       filename = lines[0].split(':')[1].trim();
                   }
               }
               if (filename) parsed[filename] = content;
           }
           setFiles(parsed);
           if (Object.keys(parsed).length > 0) {
               setSelectedFile(Object.keys(parsed)[0]);
           }
           setSquadTasks(prev => prev.map(t => ({ ...t, status: "completed" })));
        }
      } catch (e) {
        console.error("Failed to load session data", e);
      }
    };
    loadSessionData();
  }, [sessionId, token]);

  const handleExecute = async () => {
    if (!prompt.trim()) return;
    if (ws) ws.close();
    
    setLoading(true);
    setHasStarted(true);
    setUserPrompt(prompt);
    setPrompt(""); // Clear input immediately
    if (textareaRef.current) {
        textareaRef.current.value = ""; // Force DOM clear
    }
    setIsStreaming(false);
    setStreamingRaw("");
    setStartTime(Date.now());
    setElapsed(0);

    setSquadTasks((prev) =>
      prev.map((t, i) => ({
        ...t,
        status: i === 0 ? "in-progress" : "pending",
        currentActivity: i === 0 ? "Starting analysis..." : undefined,
      }))
    );

    let activeSessionId = sessionId;
    try {
        if (!activeSessionId) {
             const res = await axios.post("/chat/sessions", { title: prompt.substring(0, 50) || "Code Generation", workspace: "code" }, { headers: { Authorization: `Bearer ${token}` } });
             activeSessionId = res.data.id;
             if (activeSessionId) {
                 setSearchParams({ session_id: activeSessionId });
             }
        }
    } catch (e) {
        console.error("Failed to create code session", e);
    }

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.hostname;
    const socket = new WebSocket(`${wsProtocol}//${wsHost}:8080/ws/code/squad?session_id=${activeSessionId || ''}&token=${token || ''}`);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ prompt }));
    };
    
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "agent_status") {
           const agentNum = msg.agent_number; 
           if (agentNum) {
              setSquadTasks(prev => prev.map(t => {
                 if (t.id === String(agentNum)) {
                    return { ...t, status: msg.status === "running" ? "in-progress" : msg.status === "error" ? "failed" : "completed", currentActivity: msg.message || t.currentActivity };
                 }
                 // Handle dynamic IDs gracefully (coder_task-1 -> NaN)
                 const parsedId = parseInt(t.id);
                 if (!isNaN(parsedId) && parsedId < agentNum && t.status !== "completed") {
                    return { ...t, status: "completed", currentActivity: undefined };
                 }
                 return t;
              }));
           }
        } 
        else if (msg.type === "plan") {
           setSquadTasks(prev => {
              const baseTasks = demoSquadTasks; 
              const newTasks = (msg.tree || []).map((task: any) => ({
                 id: `coder_${task.id}`,
                 title: task.title || "Coder Swarm Task",
                 description: `Parallel coder generating code for: ${task.title}`,
                 status: "pending",
                 priority: "high",
                 level: 0,
                 dependencies: [],
                 subtasks: []
              }));

              // Replace "CoderSwarm" with the individual parallel coders
              return [
                 ...baseTasks.slice(0, 3), // 1, 2, 3
                 ...newTasks,
                 ...baseTasks.slice(4) // 5
              ];
           });
        }
        else if (msg.type === "code_progress") {
           setSquadTasks(prev => prev.map(t => 
               t.id === `coder_${msg.task_id}` ? 
               { ...t, status: msg.status === "running" ? "in-progress" : msg.status === "failed" ? "failed" : "completed", currentActivity: msg.message } : 
               t
           ));
        }
        else if (msg.type === "code_chunk") {
           setStreamingRaw(prev => {
              const newStream = prev + msg.chunk;
              // Parse files out of the live stream
              const parsed: Record<string, string> = {};
              const regex = /```(?:[a-zA-Z0-9_\-+]+)?[\s:]*([^\n]+)?\n([\s\S]*?)(?:```|$)/g;
              let match;
              while ((match = regex.exec(newStream)) !== null) {
                  let filename = (match[1] || "").trim();
                  let content = match[2] || "";
                  if (!filename && content) {
                      const lines = content.split('\n');
                      if (lines[0].startsWith('// filepath:') || lines[0].startsWith('# filepath:')) {
                          filename = lines[0].split(':')[1].trim();
                      }
                  }
                  if (filename) {
                      parsed[filename] = content;
                  } else {
                      parsed['generating...'] = content;
                  }
              }
              setFiles(prevFiles => {
                  const nextFiles = { ...prevFiles };
                  for (const [k, v] of Object.entries(parsed)) {
                      nextFiles[k] = v;
                  }
                  return nextFiles;
              });
              
              // Select the most recently parsed file if none selected
              const parsedKeys = Object.keys(parsed);
              if (parsedKeys.length > 0) {
                  setSelectedFile(currentSelected => {
                      if (!currentSelected || currentSelected === 'generating...') return parsedKeys[parsedKeys.length - 1];
                      return currentSelected;
                  });
              }
              return newStream;
           });
        }
        else if (msg.type === "code_generated") {
           const path = msg.file.path;
           const content = msg.file.content;
           setFiles(prev => {
              const updated = { ...prev, [path]: content };
              if (!selectedFile) setSelectedFile(path);
              return updated;
           });
        }
        else if (msg.type === "done") {
           setSquadTasks(prev => prev.map(t => ({ ...t, status: "completed", currentActivity: undefined })));
           setLoading(false);
           setIsStreaming(false);
           setPrompt(""); 
        }

      } catch (err) {
         console.warn("WS parsing error:", err);
      }
    };
    
    socket.onclose = () => {
      setWs(null);
      setLoading(false);
      setIsStreaming(false);
    };
    
    socket.onerror = (err) => {
      setSquadTasks((prev) => prev.map((t) => t.status === "in-progress" ? { ...t, status: "failed", currentActivity: "Connection error" } : t));
      setWs(null);
      setLoading(false);
      setIsStreaming(false);
    };
    
    setWs(socket);
  };

  const resetWorkspace = () => {
    setHasStarted(false);
    setPrompt("");
    setUserPrompt("");
    setFiles({});
    setSelectedFile(null);
    setStreamingRaw("");
    setIsStreaming(false);
    setSquadTasks(demoSquadTasks);
  };

  const handleDownload = async () => {
     if (Object.keys(files).length === 0) return;
     
     const zip = new JSZip();
     Object.entries(files).forEach(([filepath, code]) => {
         zip.file(filepath, code);
     });
     
     const content = await zip.generateAsync({ type: "blob" });
     saveAs(content, "infibuild-workspace.zip");
  };

  const fileTreeNodes = buildFileTree(files);
  const activeFileExt = selectedFile ? selectedFile.split('.').pop() || 'typescript' : 'typescript';
  const activeTask = squadTasks.find(t => t.status === "in-progress");

  return (
    <LayoutGroup>
      <div className="flex h-[100dvh] w-full overflow-hidden relative" style={{ background: 'var(--color-bg)' }}>
        
        {/* Zero State overlay */}
        <AnimatePresence>
          {!hasStarted && (
            <m.div
              key="zerostate"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              data-lenis-prevent="true"
              className="absolute inset-0 z-30 overflow-y-auto flex flex-col"
              style={{ background: 'var(--color-bg)' }}
            >
              <div className="my-auto flex flex-col items-center w-full min-h-min py-12 px-6">
                <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
                  <div className="mb-10 text-center space-y-3">
                   <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, var(--color-text-primary) 20%, var(--color-text-tertiary) 100%)" }}>What are we building today?</h2>
                   <p className="text-lg font-medium opacity-80" style={{ color: 'var(--color-text-secondary)' }}>Describe your application. Our agent squad will plan, write, and review the code automatically.</p>
                </div>

                <div className="w-full max-w-3xl relative z-20">
                  <m.div 
                    layoutId="prompt-card"
                    className="flex flex-col w-full min-h-[180px] rounded-3xl overflow-hidden transition-all duration-300 relative group-focus-within:shadow-[0_0_0_4px_var(--color-accent-muted)]"
                    style={{ 
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      boxShadow: 'var(--shadow-xl)'
                    }}
                  >
                    <div className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-100" style={{ border: '1px solid var(--color-border-focus)', borderRadius: 'inherit' }} />
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe your application... (e.g. Build a Task Management app with React and FastAPI)"
                      className="w-full flex-1 bg-transparent resize-none outline-none focus:outline-none focus:ring-0 focus:border-transparent border-none px-6 py-6 text-lg leading-relaxed custom-scrollbar placeholder:opacity-40"
                      style={{ color: 'var(--color-text-primary)' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleExecute();
                        }
                      }}
                    />
                    <div className="flex justify-between items-center p-4 w-full bg-transparent relative z-10" style={{ borderTop: '1px solid var(--color-border)' }}>
                       <div className="flex items-center gap-2 px-2 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                          <Code2 className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>Full Stack Agents</span>
                       </div>
                       <Button
                         onClick={handleExecute}
                         disabled={!prompt.trim() || loading}
                         className="rounded-full px-6 py-2.5 font-bold shadow-sm transition-all duration-300 press-scale disabled:opacity-50"
                         style={{ 
                           background: 'var(--color-text-primary)', 
                           color: 'var(--color-bg)',
                           border: 'none'
                         }}
                       >
                         Generate <Wand2 className="h-4 w-4 ml-2" />
                       </Button>
                    </div>
                  </m.div>
                </div>
              </div>
            </div>
          </m.div>
          )}
        </AnimatePresence>

        {/* Main Workspace Panels */}
        <m.div
          initial={false}
          animate={hasStarted ? { opacity: 1, pointerEvents: "auto" } : { opacity: 0, pointerEvents: "none" }}
          className="flex h-full w-full overflow-hidden"
        >
          {/* Pane 1: Agent Timeline & Chat — expands to fill available space */}
          <m.div 
            initial={false}
            animate={hasStarted ? { x: 0, opacity: 1 } : { x: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="flex-1 min-w-[340px] flex flex-col" 
            style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
          >
             <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <h2 className="font-bold text-sm tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Plan: Swarm Chat</h2>
                <Button variant="ghost" size="icon" onClick={resetWorkspace} className="h-7 w-7 rounded-md">
                   <LayoutPanelLeft className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
                </Button>
             </div>

             <div data-lenis-prevent="true" className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* User Prompt Message */}
                {userPrompt && (
                   <div className="flex flex-col items-end space-y-1">
                      <div className="max-w-[90%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-sm bg-[var(--color-surface-active)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                         {userPrompt}
                      </div>
                      <span className="text-[9px] opacity-40 px-1 font-semibold">User Request</span>
                   </div>
                )}

                {/* Swarm Status Message — while loading */}
                {hasStarted && loading && (
                   <div className="flex flex-col items-start space-y-1.5 w-full">
                      <div className="w-full rounded-2xl p-4 space-y-4 shadow-sm bg-[var(--color-bg)] border border-[var(--color-border)]">
                         <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full animate-pulse bg-[var(--color-accent)]" />
                            <span className="text-[10px] font-bold tracking-wider uppercase opacity-80" style={{ color: 'var(--color-text-secondary)' }}>Swarm Executor</span>
                         </div>
                         
                         <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                            I've analyzed your request and provisioned the agent plan. Parallel coders are building the files.
                         </p>
                         
                         {/* Active Swarm Threads Ticker */}
                         {squadTasks.filter(t => t.status === "in-progress").length > 0 && (
                            <div className="space-y-2 mt-4">
                               {squadTasks.filter(t => t.status === "in-progress").map(activeTask => (
                                  <m.div
                                     key={activeTask.id}
                                     initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                     animate={{ opacity: 1, y: 0, scale: 1 }}
                                     exit={{ opacity: 0, scale: 0.95 }}
                                     className="rounded-xl p-3 border font-mono text-[10px] leading-relaxed space-y-1.5"
                                     style={{ 
                                        background: 'color-mix(in oklch, var(--color-accent) 4%, var(--color-bg))',
                                        borderColor: 'color-mix(in oklch, var(--color-accent) 15%, var(--color-border))'
                                     }}
                                  >
                                     <div className="flex items-center justify-between">
                                        <span className="font-bold tracking-wider uppercase flex items-center gap-1.5" style={{ color: 'var(--color-accent)' }}>
                                           <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-ping" />
                                           Active Swarm Process
                                        </span>
                                        <span className="text-[9px] opacity-40 font-sans">Thread #{activeTask.id}</span>
                                     </div>
                                     <div className="flex flex-col gap-1">
                                        <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{activeTask.title}</span>
                                        <span className="opacity-70 truncate">{activeTask.currentActivity || "Executing instructions..."}</span>
                                     </div>
                                  </m.div>
                               ))}
                            </div>
                         )}

                         {/* Agent Pipeline Visualization — only during active processing */}
                         <div className="mt-4">
                           <AIAgentPipeline 
                             variant="code" 
                             dynamicStats={[
                               { label: "WORKFLOWS", value: squadTasks.filter(t => t.status === 'completed').length },
                               { label: "FILES", value: Object.keys(files).length },
                               { label: "AGENTS", value: squadTasks.filter(t => t.status !== 'pending').length || 6 },
                               { label: "LATENCY", value: `${elapsed.toFixed(1)}s` }
                             ]}
                             dynamicMessages={
                               squadTasks.filter(t => t.currentActivity).length > 0 
                                 ? squadTasks.filter(t => t.currentActivity).map(t => t.currentActivity as string) 
                                 : undefined
                             }
                             dynamicNodes={squadTasks.map(t => ({
                               id: t.id,
                               label: t.title,
                               status: t.status === 'in-progress' ? 'running' : t.status === 'completed' ? 'completed' : t.status === 'failed' ? 'error' : 'pending'
                             }))}
                           />
                         </div>
                      </div>
                      <span className="text-[9px] opacity-40 px-1 font-semibold">Assistant</span>
                   </div>
                )}

                {/* Completion Message — after generation finishes */}
                {hasStarted && !loading && Object.keys(files).length > 0 && (
                   <m.div
                     initial={{ opacity: 0, y: 12 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                     className="flex flex-col items-start space-y-1.5 w-full"
                   >
                      <div className="w-full rounded-2xl p-5 space-y-4 shadow-sm bg-[var(--color-bg)] border border-[var(--color-border)]">
                         {/* Completion header */}
                         <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in oklch, var(--color-success) 15%, transparent)' }}>
                               <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'var(--color-success)' }}>Build Complete</span>
                            {elapsed > 0 && (
                              <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>{elapsed.toFixed(1)}s</span>
                            )}
                         </div>

                         {/* Summary text */}
                         <p className="text-[13px] leading-[1.7]" style={{ color: 'var(--color-text-primary)' }}>
                            I've finished generating your codebase. Here's a summary of what was built:
                         </p>

                         {/* File stats */}
                         <div className="flex gap-4 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'color-mix(in oklch, var(--color-accent) 6%, var(--color-surface))', border: '1px solid color-mix(in oklch, var(--color-accent) 12%, var(--color-border))' }}>
                               <FileCode2 className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} />
                               <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{Object.keys(files).length} files</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'color-mix(in oklch, var(--color-success) 6%, var(--color-surface))', border: '1px solid color-mix(in oklch, var(--color-success) 12%, var(--color-border))' }}>
                               <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-success)' }} />
                               <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{squadTasks.filter(t => t.status === 'completed').length} tasks completed</span>
                            </div>
                         </div>

                         {/* Generated file list */}
                         <div className="space-y-1">
                            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--color-text-tertiary)' }}>Generated Files</span>
                            <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                               {Object.keys(files).slice(0, 12).map(filepath => (
                                  <button
                                    key={filepath}
                                    onClick={() => setSelectedFile(filepath)}
                                    className="flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors hover:bg-[var(--color-surface)]"
                                  >
                                     <FileCode2 className="h-3 w-3 shrink-0" style={{ color: 'var(--color-accent)', opacity: 0.7 }} />
                                     <span className="text-[11px] font-mono truncate" style={{ color: 'var(--color-text-secondary)' }}>{filepath}</span>
                                  </button>
                               ))}
                               {Object.keys(files).length > 12 && (
                                  <span className="text-[10px] px-2 py-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                     +{Object.keys(files).length - 12} more files
                                  </span>
                               )}
                            </div>
                         </div>

                         {/* Action hint */}
                         <p className="text-[11px] leading-[1.6]" style={{ color: 'var(--color-text-tertiary)' }}>
                            Click any file above to view its code, or use the file explorer to browse the full project. You can download the entire codebase as a ZIP.
                         </p>
                      </div>
                      <span className="text-[9px] opacity-40 px-1 font-semibold">Assistant</span>
                   </m.div>
                )}
             </div>

             <div className="p-4 bg-transparent">
                <m.div 
                  layoutId="prompt-card"
                  className="relative rounded-2xl p-1" 
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                >
                   <textarea
                     ref={textareaRef}
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     placeholder="Ask InfiBuild..."
                     className="w-full bg-transparent resize-none outline-none focus:outline-none focus:ring-0 focus:border-transparent border-none p-3 text-sm min-h-[44px] custom-scrollbar placeholder:opacity-50"
                     style={{ color: 'var(--color-text-primary)' }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleExecute();
                       }
                     }}
                   />
                   {loading && (
                      <div className="absolute right-3 bottom-3">
                         <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-accent)' }} />
                      </div>
                   )}
                </m.div>
             </div>
          </m.div>

          {/* Pane 2: File Explorer — only shows when files exist */}
          {Object.keys(files).length > 0 && (
            <div
              className="w-[260px] flex flex-col flex-shrink-0 relative" 
              style={{ borderRight: '1px solid var(--color-border)', background: 'color-mix(in oklch, var(--color-surface) 50%, var(--color-bg))' }}
            >
               <div className="p-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                   <div className="relative flex items-center rounded-lg px-3 py-1.5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                       <Search className="h-3.5 w-3.5 mr-2 opacity-50" />
                       <input 
                         placeholder="Search code" 
                         className="w-full bg-transparent outline-none text-xs" 
                         style={{ color: 'var(--color-text-primary)' }}
                       />
                   </div>
               </div>

               <div data-lenis-prevent="true" className="flex-1 overflow-y-auto custom-scrollbar py-2">
                  <LayoutGroup>
                     {fileTreeNodes.map(node => (
                        <FileTreeNode 
                          key={node.path} 
                          node={node} 
                          selectedFile={selectedFile} 
                          onSelect={setSelectedFile} 
                        />
                     ))}
                  </LayoutGroup>
               </div>

               <div className="p-4 mt-auto bg-transparent">
                  <Button 
                     onClick={handleDownload}
                     className="w-full text-xs font-medium rounded-2xl h-[44px] shadow-sm"
                     style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  >
                     <Download className="h-3.5 w-3.5 mr-2" /> Download codebase ZIP
                  </Button>
               </div>
            </div>
          )}

          {/* Pane 3: Code Viewer — only mounts when a file is selected */}
          {selectedFile && (
            <div
              className="flex-1 flex flex-col min-w-0"
              style={{ background: '#1e1e1e' }}
            >
                   <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <div className="px-6 py-4 flex items-center justify-between shadow-sm" style={{ borderBottom: '1px solid #333', background: '#252526' }}>
                         <h3 className="text-sm font-mono tracking-tight text-white flex items-center">
                            {selectedFile} {selectedFile === 'generating...' && <span className="ml-2 animate-pulse text-blue-400">...</span>}
                         </h3>
                         <button 
                           onClick={() => setSelectedFile(null)} 
                           className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                         >
                            <X className="h-4 w-4" weight="bold" />
                         </button>
                      </div>
                      <div data-lenis-prevent="true" className="flex-1 overflow-y-auto p-4 relative custom-scrollbar">
                         <SyntaxHighlighter
                            language={activeFileExt === 'ts' ? 'typescript' : activeFileExt === 'js' ? 'javascript' : activeFileExt}
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '14px' }}
                            showLineNumbers={true}
                         >
                            {files[selectedFile] || ""}
                         </SyntaxHighlighter>
                         <div ref={streamingEndRef} />
                      </div>
                   </div>
            </div>
          )}
        </m.div>

      </div>
    </LayoutGroup>
  );
}
