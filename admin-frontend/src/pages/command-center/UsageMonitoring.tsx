import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import {
    BarChart3, Activity, Users, MessageSquare, Brain, Globe,
    Image, Code, Database, RefreshCw, Loader2, TrendingUp,
    Zap, Clock, Calendar
} from 'lucide-react';
import Layout from '../../components/Layout';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface FeatureUsage {
    feature: string;
    requests: number;
    tokens: number;
    active_users: number;
}

const FEATURE_META: Record<string, { icon: any; label: string; color: string }> = {
    chat_messages: { icon: MessageSquare, label: 'Chat Messages', color: '#3b82f6' },
    deep_research: { icon: Globe, label: 'Deep Research', color: '#8b5cf6' },
    deep_thinking: { icon: Brain, label: 'Deep Thinking', color: '#10b981' },
    image_gen: { icon: Image, label: 'Image Generation', color: '#f59e0b' },
    code_executions: { icon: Code, label: 'Code Executions', color: '#ef4444' },
};

export default function UsageMonitoring() {
    const { token } = useAuth();
    const [usage, setUsage] = useState<FeatureUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUsage = async () => {
        try {
            const res = await axios.get(`${API_URL}/subscription/admin/usage`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsage(res.data.features || []);
        } catch (err) {
            console.error('Failed to fetch usage', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { if (token) fetchUsage(); }, [token]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUsage();
    };

    const totalRequests = usage.reduce((sum, f) => sum + f.requests, 0);
    const totalTokens = usage.reduce((sum, f) => sum + f.tokens, 0);
    const totalUsers = [...new Set(usage.map(f => f.active_users))].reduce((max, u) => Math.max(max, u), 0);

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Usage Monitoring</h1>
                        <p className="text-sm text-muted-foreground mt-1">Platform-wide feature usage this month</p>
                    </div>
                    <button onClick={handleRefresh} disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-all shadow-sm">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: Zap, label: 'Total Requests', value: totalRequests.toLocaleString(), color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { icon: Activity, label: 'Tokens Consumed', value: totalTokens.toLocaleString(), color: 'text-purple-600', bg: 'bg-purple-50' },
                        { icon: Users, label: 'Active Users', value: totalUsers.toLocaleString(), color: 'text-green-600', bg: 'bg-green-50' },
                        { icon: BarChart3, label: 'Features Tracked', value: usage.length.toString(), color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map((stat, i) => (
                        <m.div key={stat.label}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="rounded-2xl p-5 bg-card border border-gray-100 shadow-sm">
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                            <div className="text-sm text-muted-foreground mt-0.5">{stat.label}</div>
                        </m.div>
                    ))}
                </div>

                {/* Per-Feature Breakdown */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {usage.map((item, idx) => {
                            const meta = FEATURE_META[item.feature] || { icon: Database, label: item.feature, color: '#6b7280' };
                            const Icon = meta.icon;
                            const pct = totalRequests > 0 ? (item.requests / totalRequests) * 100 : 0;

                            return (
                                <m.div key={item.feature}
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                    className="rounded-2xl p-5 bg-card border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${meta.color}15` }}>
                                            <Icon className="w-5 h-5" style={{ color: meta.color }} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">{meta.label}</h3>
                                            <span className="text-xs text-gray-400">{item.feature}</span>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <div className="text-lg font-black text-foreground">{item.requests.toLocaleString()}</div>
                                            <div className="text-[10px] text-gray-400">requests</div>
                                        </div>
                                    </div>

                                    {/* Usage Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>Share of total</span>
                                            <span>{pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                            <m.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                className="h-full rounded-full" style={{ background: meta.color }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-50">
                                        <div>
                                            <div className="text-xs text-gray-400">Requests</div>
                                            <div className="font-bold text-foreground">{item.requests.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400">Tokens</div>
                                            <div className="font-bold text-foreground">{item.tokens.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-400">Users</div>
                                            <div className="font-bold text-foreground">{item.active_users.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </m.div>
                            );
                        })}

                        {usage.length === 0 && (
                            <div className="col-span-2 py-20 text-center text-gray-400">
                                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="font-medium">No usage data yet</p>
                                <p className="text-sm">Usage is recorded as users interact with features</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    </LazyMotion>
);
}
