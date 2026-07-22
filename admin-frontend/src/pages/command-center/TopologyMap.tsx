import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Network, Server, CheckCircle, XCircle, RefreshCcw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function TopologyMap() {
    const { token } = useAuth();
    const [health, setHealth] = useState<any>(null);
    const [globalHealth, setGlobalHealth] = useState<any>(null);

    const fetchHealth = async () => {
        if (!token) return;
        try {
            const sysRes = await axios.get(`${API}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } });
            setHealth(sysRes.data);
        } catch (err) { console.error("Failed system health", err); }
        
        try {
            const globalRes = await axios.get(`${API}/health`, { headers: { Authorization: `Bearer ${token}` } });
            setGlobalHealth(globalRes.data);
        } catch (err) { console.error("Failed global health", err); }
    };

    useEffect(() => { fetchHealth(); }, [token]);
    useEffect(() => {
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, [token]);

    const services = health?.services || {};
    const nodeColors: any = {
        backend: { color: 'purple', label: 'FastAPI Backend' },
        redis: { color: 'red', label: 'Redis Cache' },
        postgresql: { color: 'blue', label: 'PostgreSQL' },
        chromadb: { color: 'violet', label: 'ChromaDB Core' },
        ai: { color: 'emerald', label: 'AI Sandbox Engine' }
    };

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Network className="w-7 h-7 text-cyan-500" /> Live System Topology Map
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Real-time cluster status from <code>/admin/system/health</code> and <code>/health</code>.
                        </p>
                    </div>
                    <button onClick={fetchHealth} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {/* Central Node Graph */}
                <div className="admin-card relative overflow-hidden p-8 border-cyan-500/30 min-h-[400px]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent pointer-events-none"></div>

                    {/* Nginx Gateway (Center) */}
                    <div className="flex flex-col items-center mb-12 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)] relative">
                            <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-20"></div>
                            <Network className="w-10 h-10 text-cyan-400" />
                        </div>
                        <div className="mt-3 text-sm font-bold text-cyan-400">Nginx Gateway</div>
                        <div className="text-xs text-muted-foreground">Port 80 → Routing Hub</div>
                    </div>

                    {/* Service Nodes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        {Object.entries(services).map(([name, svc]: [string, any]) => {
                            const meta = nodeColors[name] || { color: 'gray', label: name };
                            const isHealthy = svc.status === 'healthy';
                            return (
                                <div key={name} className={`p-5 rounded-xl border-2 transition-all ${isHealthy ? `border-${meta.color}-500/30 bg-${meta.color}-500/5` : 'border-red-500/30 bg-red-500/5'}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-lg ${isHealthy ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                            <Server className={`w-5 h-5 ${isHealthy ? 'text-emerald-500' : 'text-red-500'}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold capitalize">{meta.label}</h4>
                                            <div className="text-xs text-muted-foreground">{name}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isHealthy ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                        <span className={`text-xs font-bold ${isHealthy ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {svc.status?.toUpperCase()}
                                        </span>
                                        {svc.latency_ms !== undefined && (
                                            <span className="text-xs text-muted-foreground ml-auto font-mono">{svc.latency_ms}ms</span>
                                        )}
                                    </div>
                                    {svc.detail && <div className="text-xs text-red-400 mt-2 truncate">{svc.detail}</div>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Hardware + Overall */}
                    <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                        <span className="chip chip-blue">Overall: {health?.overall?.toUpperCase() || '...'}</span>
                        {health?.hardware && (
                            <>
                                <span className="chip chip-purple">CPU: {health.hardware.cpu_percent}%</span>
                                <span className="chip chip-green">RAM: {health.hardware.ram_percent}%</span>
                            </>
                        )}
                        {globalHealth && (
                            <>
                                <span className={`chip ${globalHealth.database === 'connected' ? 'chip-green' : 'chip-red'}`}>
                                    DB: {globalHealth.database}
                                </span>
                                <span className={`chip ${globalHealth.redis === 'connected' ? 'chip-green' : 'chip-red'}`}>
                                    Redis: {globalHealth.redis}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </m.div>
        </Layout>
    );
}
