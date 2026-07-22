import React, { useState, useEffect, useRef, useMemo } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Globe2, RefreshCcw, Database, FileText, Layers, Maximize2, Minimize2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ForceGraph3DLazy: any = React.lazy(() =>
    import('react-force-graph-3d')
        .then(mod => ({ default: mod.default as any }))
        .catch(() => ({ default: (() => null) as any }))
);

const groupColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function NeuralGraph3D({ nodeCount, edgeMultiplier }: { nodeCount: number; edgeMultiplier: number }) {
    const graphRef = useRef<any>();
    const containerRef = useRef<HTMLDivElement>(null);

    const data = useMemo(() => {
        const N = Math.min(Math.max(nodeCount, 30), 150);
        const nodes = Array.from({ length: N }, (_, i) => ({
            id: i,
            group: Math.floor(Math.random() * 5),
            val: 1 + Math.random() * 3,
        }));
        const links: any[] = [];
        for (let i = 0; i < N; i++) {
            const c = Math.max(1, Math.floor(Math.random() * edgeMultiplier));
            for (let j = 0; j < c; j++) {
                const target = Math.floor(Math.random() * N);
                if (target !== i) links.push({ source: i, target });
            }
        }
        return { nodes, links };
    }, [nodeCount, edgeMultiplier]);


    // Use Suspense with the lazy-loaded 3D graph
    return (
        <div ref={containerRef} style={{ height: 450, background: '#060d16', borderRadius: 12, overflow: 'hidden' }}>
            <React.Suspense fallback={<FallbackCanvas nodeCount={nodeCount} />}>
                <ForceGraph3DLazy
                    graphData={data}
                    width={containerRef.current?.offsetWidth || 600}
                    height={450}
                    backgroundColor="#060d16"
                    nodeColor={(node: any) => groupColors[node.group]}
                    nodeOpacity={0.9}
                    nodeResolution={16}
                    linkColor={() => 'rgba(100,116,139,0.15)'}
                    linkWidth={0.3}
                    enableNodeDrag={true}
                    enableNavigationControls={true}
                    showNavInfo={false}
                />
            </React.Suspense>
        </div>
    );
}

// Fallback 2D Canvas if 3D lib fails
function FallbackCanvas({ nodeCount }: { nodeCount: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);
        const w = canvas.offsetWidth, h = canvas.offsetHeight;

        const N = Math.min(Math.max(nodeCount, 30), 120);
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
        const nodes = Array.from({ length: N }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
            r: 2 + Math.random() * 4, color: colors[Math.floor(Math.random() * 5)],
        }));

        const edges: [number, number][] = [];
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < 2; j++) {
                const t = Math.floor(Math.random() * N);
                if (t !== i) edges.push([i, t]);
            }
        }

        let animId: number;
        const animate = () => {
            ctx.fillStyle = '#060d16';
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = 'rgba(100,116,139,0.1)';
            ctx.lineWidth = 0.5;
            for (const [a, b] of edges) {
                ctx.beginPath();
                ctx.moveTo(nodes[a].x, nodes[a].y);
                ctx.lineTo(nodes[b].x, nodes[b].y);
                ctx.stroke();
            }

            for (const n of nodes) {
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;

                // Glow
                const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r + 8);
                g.addColorStop(0, n.color + '50'); g.addColorStop(1, n.color + '00');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 8, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = n.color;
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
            }

            animId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animId);
    }, [nodeCount]);

    return <canvas ref={canvasRef} className="w-full rounded-xl" style={{ height: 450, background: '#060d16' }} />;
}

export default function KnowledgeGraph() {
    const { token } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [expanded, setExpanded] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        try {
            const [s, h] = await Promise.all([
                axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setStats(s.data); setHealth(h.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, [token]);

    const nodeCount = Math.min(120, Math.max(30, stats?.total_messages || 50));

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Globe2 className="w-7 h-7 text-violet-500" /> Neural Knowledge Graph — 3D
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Interactive 3D embedding space driven by <code>/admin/stats</code>. Rotate & zoom with mouse.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                            <RefreshCcw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {/* 3D Graph Visualization */}
                <div className="admin-card border-violet-500/20 overflow-hidden p-0">
                    <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(139,92,246,0.05)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Neural Embedding Space — {nodeCount} Nodes</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">WebGL Accelerated</span>
                    </div>
                    <NeuralGraph3D nodeCount={nodeCount} edgeMultiplier={3} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { icon: Database, label: 'Data Points', value: stats?.total_messages || 0, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
                        { icon: FileText, label: 'Tokens Indexed', value: stats?.total_tokens || 0, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                        { icon: Layers, label: 'Contributors', value: stats?.total_users || 0, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                        { icon: Globe2, label: 'Vector Store', value: health?.overall?.toUpperCase() || '...', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' },
                    ].map((item) => (
                        <m.div key={item.label} whileHover={{ scale: 1.03 }} className="admin-card p-4 text-center" style={{ background: item.bg, backdropFilter: 'blur(12px)' }}>
                            <item.icon className="w-5 h-5 mx-auto mb-2" style={{ color: item.color }} />
                            <div className="text-2xl font-black">{item.value}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">{item.label}</div>
                        </m.div>
                    ))}
                </div>
            </m.div>
        </Layout>
    </LazyMotion>
);
}
