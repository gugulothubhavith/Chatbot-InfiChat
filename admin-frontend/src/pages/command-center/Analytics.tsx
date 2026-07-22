import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { BarChart3, Users, Coins, MessageSquare, TrendingUp, RefreshCcw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function Analytics() {
    const { token } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStats = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, [token]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const costPerToken = 0.000002; // ~$2 per 1M tokens (Groq pricing estimate)
    const estimatedCost = stats ? (stats.total_tokens * costPerToken).toFixed(4) : '0.00';

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <BarChart3 className="w-7 h-7 text-blue-500" /> Token Economics & Billing Analytics
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Real-time financial view of AI spending powered by <code>/admin/stats</code>.
                        </p>
                    </div>
                    <button onClick={fetchStats} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">{error}</div>
                )}

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    </div>
                ) : stats && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="admin-card stat-blue p-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    <Users className="w-4 h-4" /> Total Users
                                </div>
                                <div className="text-3xl font-black">{stats.total_users?.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Registered accounts</div>
                            </div>
                            <div className="admin-card stat-green p-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    <MessageSquare className="w-4 h-4" /> Messages
                                </div>
                                <div className="text-3xl font-black">{stats.total_messages?.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">All time</div>
                            </div>
                            <div className="admin-card stat-purple p-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    <TrendingUp className="w-4 h-4" /> Tokens Used
                                </div>
                                <div className="text-3xl font-black">{stats.total_tokens?.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">AI tokens consumed</div>
                            </div>
                            <div className="admin-card stat-amber p-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    <Coins className="w-4 h-4" /> Estimated Cost
                                </div>
                                <div className="text-3xl font-black">${estimatedCost}</div>
                                <div className="text-xs text-muted-foreground">Based on Groq pricing</div>
                            </div>
                        </div>

                        {/* 7-Day Chart */}
                        <div className="admin-card">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                                <BarChart3 className="w-5 h-5 text-blue-400" /> 7-Day Message Volume
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.daily_stats || []}>
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                        <YAxis stroke="#64748b" fontSize={12} />
                                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Messages" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Sessions */}
                        <div className="admin-card stat-teal p-4">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Sessions</div>
                            <div className="text-3xl font-black">{stats.total_sessions?.toLocaleString()}</div>
                        </div>
                    </>
                )}
            </m.div>
        </Layout>
    );
}
