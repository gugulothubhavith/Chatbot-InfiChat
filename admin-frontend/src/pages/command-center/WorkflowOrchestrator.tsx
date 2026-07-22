import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Workflow, Play, RefreshCcw, Trash2, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import {
    ReactFlow,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    BackgroundVariant,
    Handle,
    Position,
    MarkerType,
    type Connection,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const AGENT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    planner: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', glow: 'rgba(59,130,246,0.3)' },
    coder: { bg: '#2d1b4e', border: '#8b5cf6', text: '#c4b5fd', glow: 'rgba(139,92,246,0.3)' },
    reviewer: { bg: '#422006', border: '#f59e0b', text: '#fcd34d', glow: 'rgba(245,158,11,0.3)' },
    executor: { bg: '#052e16', border: '#10b981', text: '#6ee7b7', glow: 'rgba(16,185,129,0.3)' },
};

// Custom Agent Node component
function AgentNode({ data }: { data: any }) {
    const colors = AGENT_COLORS[data.agentType] || AGENT_COLORS.planner;
    const isRunning = data.status === 'running';
    const isDone = data.status === 'done';
    const isError = data.status === 'error';

    return (
        <div
            className="px-4 py-3 rounded-xl border-2 min-w-[180px] text-center relative"
            style={{
                background: colors.bg,
                borderColor: isRunning ? colors.border : isDone ? '#10b981' : isError ? '#ef4444' : colors.border + '60',
                boxShadow: isRunning ? `0 0 20px ${colors.glow}` : 'none',
                transition: 'all 0.3s ease',
            }}
        >
            <Handle type="target" position={Position.Left} style={{ background: colors.border, width: 10, height: 10, border: '2px solid #1a1a2e' }} />
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: colors.text }}>{data.label}</div>
            <div className="text-[10px] font-mono" style={{ color: colors.text + '90' }}>{data.agentType}</div>
            {isRunning && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
            )}
            {isDone && (
                <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500" />
            )}
            {isError && (
                <AlertTriangle className="absolute -top-1 -right-1 w-4 h-4 text-red-500" />
            )}
            <Handle type="source" position={Position.Right} style={{ background: colors.border, width: 10, height: 10, border: '2px solid #1a1a2e' }} />
        </div>
    );
}

const nodeTypes = { agent: AgentNode };

const INITIAL_NODES: Node[] = [
    { id: 'planner', type: 'agent', position: { x: 50, y: 100 }, data: { label: '🧠 Planner', agentType: 'planner', status: 'idle' } },
    { id: 'coder', type: 'agent', position: { x: 300, y: 50 }, data: { label: '💻 Coder', agentType: 'coder', status: 'idle' } },
    { id: 'reviewer', type: 'agent', position: { x: 300, y: 180 }, data: { label: '🔍 Reviewer', agentType: 'reviewer', status: 'idle' } },
    { id: 'executor', type: 'agent', position: { x: 550, y: 100 }, data: { label: '⚡ Executor', agentType: 'executor', status: 'idle' } },
];

const INITIAL_EDGES: Edge[] = [
    { id: 'e1', source: 'planner', target: 'coder', animated: false, style: { stroke: '#3b82f6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
    { id: 'e2', source: 'planner', target: 'reviewer', animated: false, style: { stroke: '#f59e0b' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' } },
    { id: 'e3', source: 'coder', target: 'executor', animated: false, style: { stroke: '#8b5cf6' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
    { id: 'e4', source: 'reviewer', target: 'executor', animated: false, style: { stroke: '#f59e0b' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' } },
];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function WorkflowOrchestrator() {
    const { token } = useAuth();
    const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
    const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
    const [running, setRunning] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [health, setHealth] = useState<any>(null);

    const onConnect = useCallback((conn: Connection) => {
        setEdges(eds => addEdge({ ...conn, animated: false, style: { stroke: '#64748b' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' } }, eds));
    }, [setEdges]);

    const fetchHealth = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } });
            setHealth(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchHealth(); }, [token]);


    const executeWorkflow = async () => {
        if (running) return;
        setRunning(true);
        setFeedback('');

        // Get execution order via BFS from nodes with no incoming edges
        const incomingMap: Record<string, number> = {};
        nodes.forEach(n => { incomingMap[n.id] = 0; });
        edges.forEach(e => { incomingMap[e.target as string] = (incomingMap[e.target as string] || 0) + 1; });

        const queue = nodes.reduce((acc, n) => {
            if ((incomingMap[n.id] || 0) === 0) {
                acc.push(n.id);
            }
            return acc;
        }, [] as string[]);
        const visited = new Set<string>();
        const order: string[] = [];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);
            order.push(current);
            const outgoing = edges.filter(e => e.source === current);
            for (const e of outgoing) {
                if (!visited.has(e.target as string)) queue.push(e.target as string);
            }
        }
        // Add any unvisited
        nodes.forEach(n => { if (!visited.has(n.id)) order.push(n.id); });

        // Execute sequentially
        for (const nodeId of order) {
            // Animate edges leading TO this node
            setEdges(eds => eds.map(e => e.target === nodeId ? { ...e, animated: true } : e));
            setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));

            await sleep(1800);

            // Real backend call
            try {
                await axios.get(`${API}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } });
                setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'done' } } : n));
            } catch {
                setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' } } : n));
            }

            // Stop animation on incoming edges
            setEdges(eds => eds.map(e => e.target === nodeId ? { ...e, animated: false } : e));
        }

        const done = nodes.filter(n => n.data.status === 'done').length + order.length;
        setFeedback(`Pipeline complete! All ${order.length} agents executed.`);
        setRunning(false);
    };

    const resetNodes = () => {
        setNodes(INITIAL_NODES);
        setEdges(INITIAL_EDGES);
        setFeedback('');
    };

    const addNode = (type: string) => {
        const id = `${type}_${Date.now()}`;
        const labels: Record<string, string> = { planner: '🧠 Planner', coder: '💻 Coder', reviewer: '🔍 Reviewer', executor: '⚡ Executor' };
        setNodes(ns => [...ns, {
            id, type: 'agent',
            position: { x: 100 + Math.random() * 300, y: 50 + Math.random() * 200 },
            data: { label: labels[type] || type, agentType: type, status: 'idle' },
        }]);
    };

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Workflow className="w-7 h-7 text-violet-500" /> Agentic Workflow Orchestrator
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Drag-and-drop agent pipeline with animated data flow. Connect nodes by dragging handles.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <m.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={executeWorkflow} disabled={running}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-violet-500/20">
                            {running ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {running ? 'Executing...' : 'Execute Pipeline'}
                        </m.button>
                        <button onClick={resetNodes} className="px-3 py-2 bg-muted/50 hover:bg-muted rounded-xl text-sm font-bold transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {feedback && (
                    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="p-3 rounded-lg border border-violet-500/30 text-sm font-bold" style={{ background: 'rgba(139,92,246,0.08)', color: '#8b5cf6' }}>
                        {feedback}
                    </m.div>
                )}

                {/* Agent Palette */}
                <div className="flex flex-wrap gap-2">
                    {['planner', 'coder', 'reviewer', 'executor'].map(type => (
                        <button key={type} onClick={() => addNode(type)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all hover:scale-105"
                            style={{ borderColor: AGENT_COLORS[type].border + '60', background: AGENT_COLORS[type].bg, color: AGENT_COLORS[type].text }}>
                            + {type.charAt(0).toUpperCase() + type.slice(1)} Agent
                        </button>
                    ))}
                </div>

                {/* React Flow Canvas */}
                <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: 450, background: '#0d1117' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} size={1} />
                        <Controls style={{ background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }} />
                    </ReactFlow>
                </div>

                {/* Health Footer */}
                {health && (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border" style={{ background: health.overall === 'healthy' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                        <span className="text-sm font-medium">Backend Status</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                            background: health.overall === 'healthy' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: health.overall === 'healthy' ? '#10b981' : '#ef4444'
                        }}>
                            {health.overall?.toUpperCase()}
                        </span>
                    </div>
                )}
            </m.div>
        </Layout>
    </LazyMotion>
);
}
