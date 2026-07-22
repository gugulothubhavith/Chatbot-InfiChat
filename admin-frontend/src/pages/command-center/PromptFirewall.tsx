import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { ShieldAlert, Ban, Plus, Trash2, RefreshCcw, Search, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function PromptFirewall() {
    const { token } = useAuth();
    const [threats, setThreats] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Local firewall rules (client-side)
    const [bannedPhrases, setBannedPhrases] = useState<string[]>(() => {
        const stored = localStorage.getItem('firewall_banned_phrases');
        return stored ? JSON.parse(stored) : [
            'ignore previous instructions',
            'system prompt',
            'jailbreak',
            'DAN mode',
            'bypass safety'
        ];
    });
    const [newPhrase, setNewPhrase] = useState('');

    useEffect(() => {
        localStorage.setItem('firewall_banned_phrases', JSON.stringify(bannedPhrases));
    }, [bannedPhrases]);

    const fetchData = async () => {
        if (!token) return;

        // Threats (super admin only — graceful fallback)
        try {
            const threatRes = await axios.get(`${API}/admin/system/threats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setThreats(threatRes.data);
        } catch (err: any) {
            if (err.response?.status === 403) {
                setThreats({ blocked_today: 0 });
            }
        }

        // Audit logs (super admin only — graceful fallback)
        try {
            const logRes = await axios.get(`${API}/admin/audit-logs?limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAuditLogs(logRes.data || []);
        } catch {
            setAuditLogs([]);
        }

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [token]);
    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const addPhrase = () => {
        if (newPhrase.trim() && !bannedPhrases.includes(newPhrase.trim().toLowerCase())) {
            setBannedPhrases([...bannedPhrases, newPhrase.trim().toLowerCase()]);
            setNewPhrase('');
        }
    };

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <ShieldAlert className="w-7 h-7 text-orange-500" /> Prompt Firewall & Injection Tuning
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage phrase blocklists and view live audit logs.
                        </p>
                    </div>
                    <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Banned Phrases */}
                        <div className="admin-card">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                                <Ban className="w-5 h-5 text-red-500" /> Banned Phrase Rules ({bannedPhrases.length})
                            </h3>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text" value={newPhrase} onChange={(e) => setNewPhrase(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addPhrase()}
                                    placeholder="Add banned phrase..."
                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none"
                                />
                                <button onClick={addPhrase} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {bannedPhrases.map((phrase, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-muted/20 border border-border rounded-lg group">
                                        <span className="text-sm font-mono">{phrase}</span>
                                        <button onClick={() => setBannedPhrases(bannedPhrases.filter((_, idx) => idx !== i))}
                                            className="p-1 text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Audit Log Feed */}
                        <div className="admin-card">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                                <Search className="w-5 h-5 text-blue-400" /> Live Audit Log Feed
                            </h3>
                            {threats && (
                                <div className="mb-4 p-3 bg-muted/20 border border-border rounded-lg flex justify-between">
                                    <span className="text-sm">Blocked today by InputSanitizer</span>
                                    <span className="font-bold text-red-500">{threats.blocked_today}</span>
                                </div>
                            )}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {auditLogs.length === 0 ? (
                                    <div className="text-sm text-muted-foreground text-center py-8">
                                        {threats ? 'No audit logs available yet.' : 'Audit logs require Super Admin access.'}
                                    </div>
                                ) : (
                                    auditLogs.map((log: any, i: number) => (
                                        <div key={i} className="p-2 bg-muted/10 border border-border rounded-lg text-xs">
                                            <div className="flex justify-between mb-1">
                                                <span className={`font-bold ${log.status_code >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {log.action || 'ADMIN_ACTION'}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                                                </span>
                                            </div>
                                            <div className="text-muted-foreground truncate">
                                                {log.resource_type && `${log.resource_type}`} {log.resource_id && `#${log.resource_id.slice(0,8)}`}
                                                {log.ip_address && ` from ${log.ip_address}`}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </m.div>
        </Layout>
</LazyMotion>
    );
}
