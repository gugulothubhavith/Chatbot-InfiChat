import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Activity, Terminal, AlertTriangle, PlayCircle, StopCircle, RefreshCcw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function Telemetry() {
    const { token } = useAuth();
    const [running, setRunning] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [health, setHealth] = useState<any>(null);

    // Fetch real hardware metrics from /admin/system/health
    const fetchMetrics = async () => {
        if (!token || !running) return;
        try {
            const res = await axios.get(`${API}/admin/system/health`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHealth(res.data);
            setData(prev => {
                const newPoint = {
                    time: new Date().toLocaleTimeString(),
                    cpu: res.data.hardware?.cpu_percent || 0,
                    ram: res.data.hardware?.ram_percent || 0,
                };
                const newData = [...prev, newPoint];
                if (newData.length > 30) newData.shift();
                return newData;
            });
        } catch (err) {
            console.error('Telemetry fetch failed', err);
        }
    };

    useEffect(() => { fetchMetrics(); }, [token]);
    useEffect(() => {
        if (!running) return;
        const interval = setInterval(fetchMetrics, 5000); // Poll every 5s for real-time feel
        return () => clearInterval(interval);
    }, [token, running]);

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                        <Terminal className="w-7 h-7 text-indigo-500" /> Advanced Sandbox & Agent Telemetry
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Real-time CPU & RAM telemetry streamed from <code>/admin/system/health</code> every 5 seconds.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 admin-card border-indigo-500/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-400" /> Live Hardware Telemetry
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => setRunning(!running)} className={`px-3 py-1 rounded-md text-sm font-bold flex items-center gap-2 ${running ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}>
                                    {running ? <><StopCircle className="w-4 h-4" /> Pause</> : <><PlayCircle className="w-4 h-4" /> Resume</>}
                                </button>
                            </div>
                        </div>

                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#475569" fontSize={10} hide />
                                    <YAxis stroke="#475569" fontSize={12} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }} />
                                    <Area type="monotone" dataKey="cpu" stroke="#6366f1" fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                                    <Area type="monotone" dataKey="ram" stroke="#10b981" fillOpacity={1} fill="url(#colorRam)" name="RAM %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Live KPIs */}
                        {health && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-center">
                                    <div className="text-2xl font-black text-indigo-400">{health.hardware?.cpu_percent}%</div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">CPU Load (Live)</div>
                                </div>
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                                    <div className="text-2xl font-black text-emerald-400">{health.hardware?.ram_percent}%</div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">RAM Usage (Live)</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="admin-card">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /> Sandbox Protection Limits
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            Sandbox containers enforce strict isolation limits to prevent runaway code.
                        </p>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-muted/20 border border-border rounded-lg">
                                <span className="text-sm font-semibold">Max Execution Time</span>
                                <span className="font-mono text-xs text-amber-400">120s</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/20 border border-border rounded-lg">
                                <span className="text-sm font-semibold">Max Memory Limit</span>
                                <span className="font-mono text-xs text-amber-400">512MB</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/20 border border-border rounded-lg">
                                <span className="text-sm font-semibold">Network Access</span>
                                <span className="font-mono text-xs text-red-400">DISABLED</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/20 border border-border rounded-lg">
                                <span className="text-sm font-semibold">System Status</span>
                                <span className="font-mono text-xs text-emerald-400">{health?.overall?.toUpperCase() || 'CHECKING...'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </m.div>
        </Layout>
    );
}
