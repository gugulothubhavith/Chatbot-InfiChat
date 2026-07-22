import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Radio, Send, RefreshCcw, Users, AlertTriangle, Info, CheckCircle, XCircle, Clock, Target, MousePointerClick } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function GlobalBroadcast() {
    const { token } = useAuth();
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'info' | 'warning' | 'critical'>('info');
    const [duration, setDuration] = useState<number>(0);
    const [targetRole, setTargetRole] = useState<'all' | 'admin'>('all');
    const [actionBtn, setActionBtn] = useState<'none' | 'refresh' | 'logout'>('none');
    
    const [stats, setStats] = useState<any>(null);
    const [activeBroadcasts, setActiveBroadcasts] = useState<any[]>([]);
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState('');

    const fetchData = async () => {
        if (!token) return;
        try {
            const resStats = await axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
            setStats(resStats.data);
            
            const resActive = await axios.get(`${API}/admin/system/broadcast`, { headers: { Authorization: `Bearer ${token}` } });
            setActiveBroadcasts(resActive.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { 
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [token]);

    const sendBroadcast = async (overrideMessage?: string, overridePriority?: 'info' | 'warning' | 'critical', overrideAction?: string) => {
        const msgToSend = overrideMessage || message;
        const prioToSend = overridePriority || priority;
        const actionToSend = overrideAction || actionBtn;

        if (!msgToSend.trim()) { setFeedback('Please enter a message.'); return; }
        setSending(true);
        setFeedback('');

        try {
            const res = await axios.post(`${API}/admin/system/broadcast`, {
                message: msgToSend.trim(),
                priority: prioToSend,
                duration: duration,
                target_role: targetRole,
                action: actionToSend
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setFeedback(`Broadcast dispatched live to ${res.data.receivers || stats?.total_users || 0} active listener(s)!`);
            fetchData();
        } catch (err: any) {
            console.error("Broadcast err", err);
            setFeedback(`Broadcast dispatch failed: ${err.response?.data?.detail || err.message}`);
        }

        if (!overrideMessage) setMessage('');
        setSending(false);
    };

    const stopBroadcast = async (id: string) => {
        try {
            await axios.delete(`${API}/admin/system/broadcast/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
        } catch (err: any) { alert(err.response?.data?.detail || "Failed to recall broadcast."); }
    };

    const resolveBroadcast = async (id: string) => {
        try {
            await axios.post(`${API}/admin/system/broadcast/${id}/resolve`, {}, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
        } catch (err: any) { alert(err.response?.data?.detail || "Failed to resolve broadcast."); }
    };

    const priorityConfig = {
        info: { icon: Info, color: 'blue', label: 'Information' },
        warning: { icon: AlertTriangle, color: 'amber', label: 'Warning' },
        critical: { icon: AlertTriangle, color: 'red', label: 'Critical Alert' }
    };

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                        <Radio className="w-7 h-7 text-purple-500" /> Advance Broadcast Suite
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Send real-time alerts with custom lifecycles, targeted blast radius, and attached interactive actions.
                    </p>
                </div>

                {/* Broadcast Composer */}
                <div className="admin-card border-purple-500/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                        <Send className="w-5 h-5 text-purple-400" /> Broadcast Composer
                    </h3>

                    {stats && (
                        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>System capability: <strong className="text-foreground">{stats.total_users}</strong> registered route nodes</span>
                        </div>
                    )}

                    <textarea
                        value={message} onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your advanced broadcast message..."
                        className="w-full h-24 bg-background border border-border rounded-xl p-3 text-sm focus:border-purple-500 outline-none resize-none mb-4"
                    />

                    {/* Advanced Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 border border-border rounded-lg mb-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Duration / Expiration</label>
                            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="bg-background border border-border rounded text-sm p-1.5 focus:border-purple-500">
                                <option value={0}>Infinite (Until Recalled)</option>
                                <option value={5}>5 Minutes</option>
                                <option value={60}>1 Hour</option>
                                <option value={1440}>24 Hours</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Target Audience Blast Radius</label>
                            <select value={targetRole} onChange={e => setTargetRole(e.target.value as any)} className="bg-background border border-border rounded text-sm p-1.5 focus:border-purple-500">
                                <option value="all">Global (All Users)</option>
                                <option value="super_admin">Command Center Admins Only</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> Attach Interactive Action</label>
                            <select value={actionBtn} onChange={e => setActionBtn(e.target.value as any)} className="bg-background border border-border rounded text-sm p-1.5 focus:border-purple-500">
                                <option value="none">None (Text Only)</option>
                                <option value="refresh">Force Page Refresh Button</option>
                                <option value="logout">Acknowledge & Kick Session</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 mt-4">
                        <div className="flex gap-2">
                            {(['info', 'warning', 'critical'] as const).map(p => {
                                const cfg = priorityConfig[p];
                                return (
                                    <button key={p} onClick={() => setPriority(p)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            priority === p
                                            ? `bg-${cfg.color}-500/20 text-${cfg.color}-500 border border-${cfg.color}-500/50`
                                            : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'
                                        }`}>
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => sendBroadcast()} disabled={sending}
                            className="ml-auto w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                            {sending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {sending ? 'Dispatching...' : 'Dispatch Advanced Broadcast'}
                        </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-wider">Message Templates ({priority})</div>
                        <div className="flex flex-col gap-2">
                            {priority === 'info' && [
                                'Scheduled Maintenance: System will be offline in 15 minutes.',
                                'New Feature Update: Check the dashboard for new capabilities!',
                                'System Back Online: Maintenance has been completed.',
                                'Policy Update: Please review the updated Terms of Service.',
                                'General Reminder: Please ensure you save your work frequently.'
                            ].map((msg, idx) => (
                                <button key={idx} onClick={() => { setMessage(msg); setActionBtn('refresh'); }} 
                                    className="px-3 py-2 text-left rounded-lg text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors flex items-center gap-2 w-full">
                                    <Info className="w-3.5 h-3.5 shrink-0" /> {msg} (Pre-attach: Force Refresh)
                                </button>
                            ))}

                            {priority === 'warning' && [
                                'High Latency Detected: Service responses may be delayed.',
                                'Database Sync Delay: Data might take a few minutes to reflect.',
                                'Partial Outage: Image Generation services are currently unstable.',
                                'API Rate Limit Approaching: Please reduce request volume.',
                                'Storage Quota Alert: The system is nearing maximum capacity.'
                            ].map((msg, idx) => (
                                <button key={idx} onClick={() => { setMessage(msg); setActionBtn('none'); }} 
                                    className="px-3 py-2 text-left rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 transition-colors flex items-center gap-2 w-full">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {msg}
                                </button>
                            ))}

                            {priority === 'critical' && [
                                'EMERGENCY: Defcon 1 Security Protocol Activated. Save work immediately.',
                                'CRITICAL FAILURE: Core Database unreachable. Emergency maintenance starting.',
                                'SECURITY BREACH DETECTED: All sessions will be terminated in 30 seconds.',
                                'DATA LOSS RISK: Immediate system halt initiated.',
                                'NODE FAILURE: Traffic is being rerouted. Expect significant disruption.'
                            ].map((msg, idx) => (
                                <button key={idx} onClick={() => { setMessage(msg); setActionBtn('logout'); }} 
                                    className="px-3 py-2 text-left rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors flex items-center gap-2 w-full">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" /> {msg} (Pre-attach: Kick Session)
                                </button>
                            ))}
                        </div>
                    </div>

                    {feedback && <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" /> {feedback}</div>}
                </div>

                {/* Live Active Broadcasts */}
                <div className="admin-card border-purple-500/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                        <Radio className="w-5 h-5 text-purple-400 animate-pulse" /> Live Active Broadcasts ({activeBroadcasts.length})
                    </h3>
                    {activeBroadcasts.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground text-sm flex flex-col items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-green-500/50" />
                            All clear! No active broadcasts affecting the system right now.
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {activeBroadcasts.map(b => (
                                <div key={b.id} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-background border border-border shadow-sm rounded-lg">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`mt-0.5 p-1.5 rounded-full ${b.priority === 'critical' ? 'bg-red-500/20 text-red-500' : b.priority === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                            {b.priority === 'critical' ? <AlertTriangle className="w-4 h-4" /> :
                                             b.priority === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                                             <Info className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-foreground">
                                                {b.message}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Dispatched: {new Date(b.timestamp).toLocaleTimeString()} {b.expires_at ? `(Expires: ${new Date(b.expires_at).toLocaleTimeString()})` : '(Infinite)'}</span>
                                                <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Targets: <strong className="text-foreground">{b.target_role === 'all' ? 'Globally' : 'Command Admins'}</strong></span>
                                                {b.action !== 'none' && <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3 text-purple-400" /> Attached Action: {b.action}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                                        <button onClick={() => stopBroadcast(b.id)} className="flex-1 md:flex-none px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                                            <XCircle className="w-3.5 h-3.5" /> Stop (Recall)
                                        </button>
                                        {(b.priority === 'warning' || b.priority === 'critical') && (
                                            <button onClick={() => resolveBroadcast(b.id)} className="flex-1 md:flex-none px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                                                <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </m.div>
        </Layout>
    );
}
