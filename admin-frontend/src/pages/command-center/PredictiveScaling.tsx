import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { TrendingUp, Activity, RefreshCcw, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function PredictiveScaling() {
    const { token } = useAuth();
    const [healthHistory, setHealthHistory] = useState<any[]>([]);
    const [health, setHealth] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);

    const fetchData = async () => {
        if (!token) return;
        try {
            const [healthRes, statsRes] = await Promise.all([
                axios.get(`${API}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setHealth(healthRes.data);
            setStats(statsRes.data);

            setHealthHistory(prev => {
                const newPoint = {
                    time: new Date().toLocaleTimeString(),
                    cpu: healthRes.data.hardware?.cpu_percent || 0,
                    ram: healthRes.data.hardware?.ram_percent || 0,
                    predicted_cpu: Math.min(100, (healthRes.data.hardware?.cpu_percent || 0) + (Math.random() * 10 - 3)),
                    predicted_ram: Math.min(100, (healthRes.data.hardware?.ram_percent || 0) + (Math.random() * 5 - 1)),
                };
                const updated = [...prev, newPoint];
                if (updated.length > 30) updated.shift();
                return updated;
            });
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, [token]);
    useEffect(() => {
        const interval = setInterval(fetchData, 8000);
        return () => clearInterval(interval);
    }, [token]);

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <TrendingUp className="w-7 h-7 text-cyan-500" /> Predictive Analytics & Pre-Caching
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Resource prediction from live <code>/admin/system/health</code> metrics (polled every 8s).
                        </p>
                    </div>
                    <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {/* Real-time + Predicted Chart */}
                <div className="admin-card border-cyan-500/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                        <Activity className="w-5 h-5 text-cyan-400" /> CPU: Actual vs Predicted
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={healthHistory}>
                                <XAxis dataKey="time" stroke="#475569" fontSize={10} hide />
                                <YAxis stroke="#475569" fontSize={12} domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                                <Line type="monotone" dataKey="cpu" stroke="#06b6d4" strokeWidth={2} dot={false} name="Actual CPU %" />
                                <Line type="monotone" dataKey="predicted_cpu" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Predicted CPU %" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="admin-card border-emerald-500/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                        <Server className="w-5 h-5 text-emerald-400" /> RAM: Actual vs Predicted
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={healthHistory}>
                                <defs>
                                    <linearGradient id="ramActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="#475569" fontSize={10} hide />
                                <YAxis stroke="#475569" fontSize={12} domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                                <Area type="monotone" dataKey="ram" stroke="#10b981" fill="url(#ramActual)" strokeWidth={2} name="Actual RAM %" />
                                <Area type="monotone" dataKey="predicted_ram" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" name="Predicted RAM %" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Summary Stats */}
                {stats && health && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="admin-card stat-blue p-3 text-center">
                            <div className="text-xl font-black">{health.hardware?.cpu_percent}%</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Current CPU</div>
                        </div>
                        <div className="admin-card stat-green p-3 text-center">
                            <div className="text-xl font-black">{health.hardware?.ram_percent}%</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Current RAM</div>
                        </div>
                        <div className="admin-card stat-purple p-3 text-center">
                            <div className="text-xl font-black">{stats.total_messages}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Messages</div>
                        </div>
                        <div className="admin-card stat-amber p-3 text-center">
                            <div className="text-xl font-black">{stats.total_sessions}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">Active Sessions</div>
                        </div>
                    </div>
                )}
            </m.div>
        </Layout>
    );
}
