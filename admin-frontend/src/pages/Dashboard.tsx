import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useIsSuperAdmin } from '../hooks/useHasPermission';
import axios from 'axios';
import { LazyMotion, m, domAnimation, AnimatePresence } from 'framer-motion';
import {
    Users, Activity, Database, Server, Shield, Zap, RefreshCw,
    Trash2, AlertTriangle, CheckCircle, XCircle, ArrowDownRight,
    Lock, Unlock, TrendingUp, Clock, MessageSquare, Bot,
    RotateCcw, Terminal, ChevronRight, Download, Search,
    BarChart2, Globe, ShieldAlert, Key, Eye, EyeOff, Fingerprint,
    ShieldCheck, UploadCloud
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

type UserType = { id: string; email: string; username: string; role: string; is_active: boolean; created_at: string; };

function StatCard({ label, value, sub, icon: Icon, colorClass, trend }: any) {
    return (
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-5 card-hover ${colorClass}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/20 shadow-sm">
                    <Icon className="w-5 h-5" />
                </div>
                {trend !== undefined && (
                    <span className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
            <div className="text-sm font-medium text-foreground/70">{label}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </m.div>
    );
}

function LiveBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="font-bold text-foreground">{value}%</span>
            </div>
            <div className="progress-bar">
                <m.div className={`progress-fill ${color}`}
                    initial={{ width: 0 }} animate={{ width: `${value}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }} />
            </div>
        </div>
    );
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) {
    return (
        <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border max-w-sm
                ${type === 'success' ? 'bg-green-900/40 border-green-800 text-green-300' :
                    type === 'error' ? 'bg-red-900/40 border-red-800 text-red-300' :
                        'bg-blue-900/40 border-blue-800 text-blue-300'}`}
        >
            {type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> :
                type === 'error' ? <XCircle className="w-4 h-4 flex-shrink-0" /> :
                    <Activity className="w-4 h-4 flex-shrink-0" />}
            {msg}
        </m.div>
    );
}

const serviceStatuses = [
    { label: 'Backend API', key: 'backend' },
    { label: 'PostgreSQL', key: 'postgresql' },
    { label: 'Redis Cache', key: 'redis' },
    { label: 'ChromaDB', key: 'chromadb' },
    { label: 'AI Sandbox', key: 'ai' },
];

export default function Dashboard() {
    const { token } = useAuth();
    const isSuperAdmin = useIsSuperAdmin();

    const [users, setUsers] = useState<UserType[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, activeSessions: 0, totalMessages: 0, totalTokens: 0 });
    const [health, setHealth] = useState<any>({});
    const [privacySettings, setPrivacySettings] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [log, setLog] = useState<string[]>([]);
    const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'control' | 'ai' | 'logs' | 'security'>('overview');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [threatData, setThreatData] = useState<any>({
        status: 'SECURE',
        threat_level: 'LOW',
        blocked_today: 0,
        encryption: 'AES-256',
        active_monitors: ['Network', 'API', 'DB']
    });

    const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const addLog = useCallback((msg: string) => {
        const ts = new Date().toLocaleTimeString();
        setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 100));
    }, []);

    const authHeaders = { Authorization: `Bearer ${token}` };

    const fetchData = useCallback(async (isAutoRefresh = false) => {
        if (!token) return;
        try {
            const [usersRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/admin/users`, { headers: authHeaders }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/admin/stats`, { headers: authHeaders }).catch(() => ({ data: {} })),
            ]);
            setUsers(usersRes.data || []);
            const s = statsRes.data;
            setStats({
                totalUsers: s.total_users || 0,
                activeSessions: s.total_sessions || 0,
                totalMessages: s.total_messages || 0,
                totalTokens: s.total_tokens || 0,
            });
            if (!isAutoRefresh) addLog('Dashboard data refreshed');
        } catch {
            if (!isAutoRefresh) addLog('ERROR: Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchHealth = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_URL}/admin/system/health`, { headers: authHeaders });
            setHealth(res.data);
        } catch {
            setHealth({ overall: 'unknown', services: {} });
        }
    }, [token]);

    const fetchPrivacy = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_URL}/admin/privacy/settings`, { headers: authHeaders });
            setPrivacySettings(res.data);
        } catch {
            setPrivacySettings({});
        }
    }, [token]);

    const fetchSecurityData = useCallback(async () => {
        if (!token) return;
        try {
            const [auditRes, threatRes] = await Promise.all([
                axios.get(`${API_URL}/admin/audit-logs`, { headers: authHeaders }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/admin/system/threats`, { headers: authHeaders }).catch(() => ({ data: null })),
            ]);
            setAuditLogs(auditRes.data || []);
            if (threatRes.data && Object.keys(threatRes.data).length > 0) {
                setThreatData(threatRes.data);
            }
        } catch (e) {
            console.error("Security data fetch failed", e);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
        fetchHealth();
        fetchPrivacy();
        fetchSecurityData();
    }, [fetchData, fetchHealth, fetchPrivacy, fetchSecurityData]);

    useEffect(() => {
        const t = setInterval(() => {
            fetchData(true);
            fetchHealth();
            fetchSecurityData();
        }, 2000);
        return () => clearInterval(t);
    }, [fetchData, fetchHealth, fetchSecurityData]);

    const handleToggleActive = async (userId: string, currentStatus: boolean) => {
        if (!confirm(`${currentStatus ? 'Block' : 'Enable'} this user?`)) return;
        setActionLoading(userId + '_toggle');
        try {
            await axios.patch(`${API_URL}/admin/users/${userId}/status`, { is_active: !currentStatus }, { headers: authHeaders });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
            const action = !currentStatus ? 'enabled' : 'blocked';
            addLog(`User ${userId.slice(0, 8)}... ${action}`);
            showToast(`User ${action} successfully`, 'success');
        } catch (e: any) {
            const msg = e.response?.data?.detail || 'Failed to update user';
            addLog(`ERROR: ${msg}`);
            showToast(msg, 'error');
        } finally { setActionLoading(null); }
    };

    const handleDeleteUser = async (userId: string, email: string) => {
        if (!confirm(`PERMANENTLY DELETE "${email}"? This cannot be undone!`)) return;
        setActionLoading(userId + '_delete');
        try {
            await axios.delete(`${API_URL}/admin/users/${userId}`, { headers: authHeaders });
            setUsers(prev => prev.filter(u => u.id !== userId));
            addLog(`User ${email} permanently removed`);
            showToast(`User "${email}" deleted`, 'success');
        } catch (e: any) {
            const msg = e.response?.data?.detail || 'Failed to delete user';
            addLog(`ERROR: ${msg}`);
            showToast(msg, 'error');
        } finally { setActionLoading(null); }
    };

    const handleFlushCache = async () => {
        if (!confirm('Flush all Redis cache? This clears all cached AI responses.')) return;
        setActionLoading('cache');
        addLog('Flushing Redis cache...');
        try {
            const res = await axios.post(`${API_URL}/admin/cache/flush`, {}, { headers: authHeaders });
            addLog(`OK ${res.data.message}`);
            showToast(res.data.message, 'success');
        } catch (e: any) {
            const msg = e.response?.data?.detail || 'Cache flush failed';
            addLog(`ERROR: ${msg}`);
            showToast(msg, 'error');
        } finally { setActionLoading(null); }
    };

    const handleBackupDB = async () => {
        setActionLoading('backup');
        addLog('Initiating database backup...');
        try {
            const res = await axios.get(`${API_URL}/admin/system/backup`, {
                headers: authHeaders,
                responseType: 'blob'
            });
            const disposition = res.headers['content-disposition'];
            let filename = `infichat_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const match = disposition.match(/filename="?(.+)"?/);
                if (match && match.length > 1) filename = match[1].replace(/"/g, '');
            }
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            addLog(`OK Backup downloaded successfully.`);
            showToast(`Backup downloaded: ${filename}`, 'success');
        } catch (e: any) {
            let msg = 'Backup failed';
            if (e.response && e.response.data instanceof Blob) {
                const text = await e.response.data.text();
                try { const json = JSON.parse(text); msg = json.detail || msg; }
                catch { msg = text || msg; }
            }
            addLog(`ERROR: ${msg}`);
            showToast(msg, 'error');
        } finally { setActionLoading(null); }
    };

    const handleRotateKey = async () => {
        if (!confirm('Rotate encryption key? All new data will be encrypted with the new key.')) return;
        setActionLoading('rotate');
        addLog('Rotating encryption key...');
        try {
            const res = await axios.post(`${API_URL}/admin/privacy/key/rotate`, {}, { headers: authHeaders });
            addLog(`OK ${res.data.message}`);
            showToast('Encryption key rotated successfully', 'success');
        } catch (e: any) {
            const msg = e.response?.data?.detail || 'Key rotation failed';
            addLog(`ERROR: ${msg}`);
            showToast(msg, 'error');
        } finally { setActionLoading(null); }
    };

    const handleRestartService = async (service: string) => {
        if (!confirm(`Restart ${service}?`)) return;
        setActionLoading('restart_' + service);
        addLog(`Restarting ${service}...`);
        try {
            const res = await axios.post(`${API_URL}/admin/system/restart-service`, { service }, { headers: authHeaders });
            addLog(`OK ${res.data.message}`);
            showToast(res.data.message, 'success');
            setTimeout(() => fetchHealth(), 3000);
        } catch (e: any) {
            const msg = e.response?.data?.detail || `Restart of ${service} failed`;
            addLog(`ERROR: ${msg}`);
            showToast(msg, 'error');
        } finally { setActionLoading(null); }
    };

    const handleTogglePII = async (enabled: boolean) => {
        addLog(`${enabled ? 'Enabling' : 'Disabling'} PII scrubbing...`);
        try {
            await axios.post(`${API_URL}/admin/privacy/pii`, { enabled }, { headers: authHeaders });
            setPrivacySettings((prev: any) => ({ ...prev, pii_scrubbing: enabled }));
            addLog(`OK PII scrubbing ${enabled ? 'enabled' : 'disabled'}`);
            showToast(`PII scrubbing ${enabled ? 'enabled' : 'disabled'}`, 'success');
        } catch (e: any) {
            const msg = e.response?.data?.detail || 'Failed to toggle PII scrubbing';
            showToast(msg, 'error');
        }
    };

    const filteredUsers = users.filter(u => {
        if (filterRole !== 'all' && u.role !== filterRole) return false;
        if (filterStatus === 'active' && !u.is_active) return false;
        if (filterStatus === 'blocked' && u.is_active) return false;
        if (searchQuery && !u.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !u.username.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'security', label: 'Security Intelligence', icon: ShieldCheck },
        { id: 'users', label: 'User Registry', icon: Users },
        { id: 'ai', label: 'AI Control', icon: Bot },
        ...(isSuperAdmin ? [{ id: 'control', label: 'System Control', icon: Terminal }] : []),
        { id: 'logs', label: 'Action Logs', icon: Activity },
    ] as const;



    return (
        <Layout>
            <LazyMotion features={domAnimation}>
            <AnimatePresence>
                {toast && <Toast msg={toast.msg} type={toast.type} />}
            </AnimatePresence>

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text">Command Center</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Full-spectrum control of your InfiChat infrastructure
                            {isSuperAdmin && <span className="ml-2 chip chip-amber"><Zap className="w-3 h-3 inline" /> Super Admin</span>}
                        </p>
                    </div>
                    <button onClick={() => { fetchData(); fetchHealth(); addLog('Manual refresh triggered'); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium text-muted-foreground transition-all">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${activeTab === tab.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            <tab.icon className="w-4 h-4" />{tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* ===== OVERVIEW ===== */}
                    {activeTab === 'overview' && (
                        <m.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                <StatCard label="Total Users" value={loading ? '...' : stats.totalUsers} icon={Users} colorClass="stat-blue" sub="Registered accounts" />
                                <StatCard label="Messages" value={loading ? '...' : stats.totalMessages.toLocaleString()} icon={MessageSquare} colorClass="stat-green" sub="All time" />
                                <StatCard label="Tokens Used" value={loading ? '...' : `${(stats.totalTokens / 1000).toFixed(1)}K`} icon={Zap} colorClass="stat-purple" sub="AI tokens consumed" />
                                <StatCard label="Active Sessions" value={loading ? '...' : stats.activeSessions} icon={Activity} colorClass="stat-amber" sub="All active connections" />
                                <StatCard label="System Health" value={health.overall === 'healthy' ? 'OK' : (health.overall ? 'Degraded' : 'OFFLINE')} icon={CheckCircle} colorClass={health.overall === 'healthy' ? 'stat-teal' : 'stat-red'} sub="Live status" />
                                <StatCard label="Active Release" value="0.2.0" icon={Download} colorClass="stat-blue" sub="Desktop version" trend={0} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                {/* System Health */}
                                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-base font-bold text-foreground">System Health</h2>
                                            <p className="text-xs text-muted-foreground">Live service status</p>
                                        </div>
                                        <button onClick={() => fetchHealth()} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <Link to="/releases" className="flex items-center gap-3 p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 mb-4 group">
                                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                                <UploadCloud className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold">Push New Update</div>
                                                <div className="text-[10px] opacity-80">Deploy v0.2.1+ to all users</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-all" />
                                        </Link>

                                        {serviceStatuses.map(svc => {
                                            const svcStatus = health?.services?.[svc.key];
                                            const isHealthy = svcStatus?.status === 'healthy';
                                            const isUnknown = !svcStatus;
                                            return (
                                                <div key={svc.key} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                                    <div className="flex items-center gap-2">
                                                        {isUnknown ? <div className="w-2 h-2 rounded-full bg-gray-500" /> :
                                                            isHealthy ? <div className="live-dot w-2 h-2 flex-shrink-0" /> :
                                                                <div className="w-2 h-2 rounded-full bg-red-400" />}
                                                        <span className="text-sm font-medium text-foreground">{svc.label}</span>
                                                    </div>
                                                    <span className={`chip text-[10px] ${isUnknown ? 'chip-gray' : isHealthy ? 'chip-green' : 'chip-red'}`}>
                                                        {isUnknown ? 'Unknown' : svcStatus.status}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm lg:col-span-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-base font-bold text-foreground">Recent Users</h2>
                                            <p className="text-xs text-muted-foreground">Latest registrations</p>
                                        </div>
                                        <button onClick={() => setActiveTab('users')} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                                            View all <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="data-table w-full">
                                            <thead><tr>
                                                <th className="text-left">User</th>
                                                <th className="text-left">Role</th>
                                                <th className="text-left">Status</th>
                                                <th className="text-left">Joined</th>
                                            </tr></thead>
                                            <tbody>
                                                {loading ? Array.from({ length: 3 }).map((_, i) => (
                                                    <tr key={i}><td colSpan={4}><div className="skeleton h-4 w-full my-2" /></td></tr>
                                                )) : users.slice(0, 6).map(u => (
                                                    <tr key={u.id}>
                                                        <td>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                                    {u.username?.[0]?.toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-semibold text-foreground">{u.username}</div>
                                                                    <div className="text-xs text-muted-foreground">{u.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td><span className={`chip ${u.role === 'admin' ? 'chip-purple' : 'chip-gray'}`}>{u.role}</span></td>
                                                        <td><span className={`chip ${u.is_active ? 'chip-green' : 'chip-red'}`}>{u.is_active ? 'Active' : 'Blocked'}</span></td>
                                                        <td className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Token Budget</div>
                                    <LiveBar label="Daily Usage" value={Math.min(Math.round((stats.totalTokens / 500000) * 100), 100)} color="bg-blue-500" />
                                    <div className="mt-2 text-xs text-muted-foreground">{stats.totalTokens.toLocaleString()} tokens total</div>
                                </div>
                                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">User Activity</div>
                                    <LiveBar label="Active / Total" value={users.length > 0 ? Math.round((users.filter(u => u.is_active).length / users.length) * 100) : 0} color="bg-green-500" />
                                    <div className="mt-2 text-xs text-muted-foreground">{users.filter(u => u.is_active).length} active of {users.length} users</div>
                                </div>
                                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Messages per User</div>
                                    <LiveBar label="Engagement" value={users.length > 0 ? Math.min(Math.round((stats.totalMessages / users.length) * 10), 100) : 0} color="bg-violet-500" />
                                    <div className="mt-2 text-xs text-muted-foreground">{users.length > 0 ? (stats.totalMessages / users.length).toFixed(1) : 0} avg messages/user</div>
                                </div>
                            </div>
                        </m.div>
                    )}

                    {/* ===== USERS TAB ===== */}
                    {activeTab === 'users' && (
                        <m.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
                                    <div className="flex-1 min-w-48 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-muted/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground" />
                                    </div>
                                    <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)}
                                        className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                                        <option value="all">All Roles</option>
                                        <option value="admin">Admin</option>
                                        <option value="user">User</option>
                                    </select>
                                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                                        className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="blocked">Blocked</option>
                                    </select>
                                    <div className="text-xs text-muted-foreground ml-auto">{filteredUsers.length} users</div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="data-table w-full">
                                        <thead><tr>
                                            <th className="text-left">Identity</th>
                                            <th className="text-left">Role</th>
                                            <th className="text-left">Status</th>
                                            <th className="text-left">Joined</th>
                                            {isSuperAdmin && <th className="text-center">Actions</th>}
                                        </tr></thead>
                                        <tbody>
                                            {loading ? Array.from({ length: 5 }).map((_, i) => (
                                                <tr key={i}><td colSpan={5}><div className="skeleton h-4 w-full my-3" /></td></tr>
                                            )) : filteredUsers.map(u => (
                                                <tr key={u.id}>
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                {u.username?.[0]?.toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-foreground">{u.username}</div>
                                                                <div className="text-xs text-muted-foreground">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td><span className={`chip ${u.role === 'admin' ? 'chip-purple' : 'chip-gray'}`}>{u.role}</span></td>
                                                    <td><span className={`chip ${u.is_active ? 'chip-green' : 'chip-red'}`}>{u.is_active ? 'Active' : 'Blocked'}</span></td>
                                                    <td className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                                                    {isSuperAdmin && (
                                                        <td>
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={() => handleToggleActive(u.id, u.is_active)} disabled={!!actionLoading}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50
                                                                        ${u.is_active ? 'bg-amber-900/20 text-amber-300 border-amber-800 hover:bg-amber-900/30' : 'bg-green-900/20 text-green-300 border-green-800 hover:bg-green-900/30'}`}>
                                                                    {actionLoading === u.id + '_toggle' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                                                                        u.is_active ? <><Lock className="w-3 h-3" />Block</> : <><Unlock className="w-3 h-3" />Enable</>}
                                                                </button>
                                                                <button onClick={() => handleDeleteUser(u.id, u.email)} disabled={!!actionLoading}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-red-900/20 text-red-300 border-red-800 hover:bg-red-900/30 transition-all disabled:opacity-50">
                                                                    {actionLoading === u.id + '_delete' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3" />Remove</>}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                            {filteredUsers.length === 0 && !loading && (
                                                <tr><td colSpan={isSuperAdmin ? 5 : 4}>
                                                    <div className="py-16 text-center text-muted-foreground">
                                                        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                                        <div className="font-medium">No users match your filters</div>
                                                    </div>
                                                </td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </m.div>
                    )}

                    {/* ===== AI CONTROL ===== */}
                    {activeTab === 'ai' && (
                        <m.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-violet-900/40 flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">Active Model</h3>
                                            <p className="text-xs text-muted-foreground">Current AI engine</p>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-violet-900/30 border border-violet-800 text-center mb-4">
                                        <div className="text-lg font-bold text-violet-300">Llama 3.3 70B</div>
                                        <div className="text-xs text-violet-400">via Groq API</div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Context Window</span><span className="font-semibold text-foreground">128K</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="chip chip-green">Live</span></div>
                                    </div>
                                </div>

                                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-900/40 flex items-center justify-center">
                                            <Zap className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">Token Usage</h3>
                                            <p className="text-xs text-muted-foreground">Consumption metrics</p>
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold gradient-text mb-1">{(stats.totalTokens / 1000).toFixed(1)}K</div>
                                    <div className="text-xs text-muted-foreground mb-4">Total tokens consumed (all users)</div>
                                    <LiveBar label="Daily Budget (est.)" value={Math.min(Math.round((stats.totalTokens / 500000) * 100), 100)} color="bg-blue-500" />
                                </div>

                                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-green-900/40 flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">Privacy Controls</h3>
                                            <p className="text-xs text-muted-foreground">Live settings</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                            <div>
                                                <div className="text-sm font-medium text-foreground">PII Scrubbing</div>
                                                <div className="text-xs text-muted-foreground">Auto-mask sensitive data</div>
                                            </div>
                                            <button onClick={() => handleTogglePII(!privacySettings?.pii_scrubbing)}
                                                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${privacySettings?.pii_scrubbing ? 'bg-green-500' : 'bg-gray-600'}`}>
                                                <span className={`inline-block h-4 w-4 m-0.5 rounded-full bg-white shadow transition-transform ${privacySettings?.pii_scrubbing ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                            <div>
                                                <div className="text-sm font-medium text-foreground">Prompt Firewall</div>
                                                <div className="text-xs text-muted-foreground">Block injection attacks</div>
                                            </div>
                                            <span className="chip chip-green">ON</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                                            <div>
                                                <div className="text-sm font-medium text-foreground">Rate Limiting</div>
                                                <div className="text-xs text-muted-foreground">100 req/min per user</div>
                                            </div>
                                            <span className="chip chip-green">ON</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                                <h3 className="font-bold text-foreground mb-4">Real-Time AI Metrics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Messages', value: stats.totalMessages.toLocaleString(), icon: MessageSquare, color: 'text-blue-400' },
                                        { label: 'Total Tokens', value: `${(stats.totalTokens / 1000).toFixed(1)}K`, icon: Zap, color: 'text-violet-400' },
                                        { label: 'Active Users', value: users.filter(u => u.is_active).length, icon: Users, color: 'text-green-400' },
                                        { label: 'Total Sessions', value: stats.activeSessions, icon: Activity, color: 'text-amber-400' },
                                    ].map(m => (
                                        <div key={m.label} className="text-center p-4 rounded-xl bg-muted/50">
                                            <m.icon className={`w-6 h-6 mx-auto mb-2 ${m.color}`} />
                                            <div className="text-2xl font-bold text-foreground">{m.value}</div>
                                            <div className="text-xs text-muted-foreground">{m.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </m.div>
                    )}

                    {/* ===== SECURITY ===== */}
                    {activeTab === 'security' && (
                        <m.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Shield className="w-64 h-64 text-blue-500 rotate-12" />
                                    </div>
                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                                                    <ShieldCheck className="w-6 h-6 text-green-400" />
                                                </div>
                                                <div>
                                                    <div className="text-white text-lg font-bold">Security Posture</div>
                                                    <div className="text-green-400 text-sm font-medium flex items-center gap-1.5">
                                                        <span className="live-dot w-2 h-2" />
                                                        {threatData.status} · {threatData.threat_level} Risk
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                {[
                                                    { label: 'Blocked Today', value: threatData.blocked_today || 0, icon: ShieldAlert },
                                                    { label: 'Encryption', value: 'AES-256-GCM', icon: Fingerprint },
                                                    { label: 'Active Monitors', value: (threatData.active_monitors || ['N/A']).length, icon: Eye },
                                                    { label: '2FA Enforcement', value: 'Enabled', icon: Key },
                                                ].map(m => (
                                                    <div key={m.label} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                                            <m.icon className="w-3 h-3" />{m.label}
                                                        </div>
                                                        <div className="text-white font-bold text-lg">{m.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Link to="/rbac" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all w-fit">
                                            <Shield className="w-4 h-4" /> Configure RBAC Policies
                                        </Link>
                                    </div>
                                </div>

                                {/* Audit Logs */}
                                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-foreground">Recent Audit Logs</h3>
                                        <Activity className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {auditLogs.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground text-sm">No recent audit events</div>
                                        ) : auditLogs.slice(0, 10).map((log: any) => (
                                            <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/30">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-foreground truncate">{log.action}</div>
                                                    <div className="text-xs text-muted-foreground">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Encryption Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-foreground">E2E Encryption</div>
                                        <div className="text-xs text-muted-foreground">Messages encrypted at rest</div>
                                    </div>
                                    <button onClick={handleRotateKey} disabled={!!actionLoading}
                                        className="px-3 py-1.5 rounded-lg bg-amber-900/20 text-amber-300 border border-amber-800 text-xs font-semibold hover:bg-amber-900/30 transition-all disabled:opacity-50">
                                        {actionLoading === 'rotate' ? 'Rotating...' : 'Rotate Key'}
                                    </button>
                                </div>
                                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-foreground">DB Backup</div>
                                        <div className="text-xs text-muted-foreground">Download PostgreSQL snapshot</div>
                                    </div>
                                    <button onClick={handleBackupDB} disabled={!!actionLoading}
                                        className="px-3 py-1.5 rounded-lg bg-blue-900/20 text-blue-300 border border-blue-800 text-xs font-semibold hover:bg-blue-900/30 transition-all disabled:opacity-50">
                                        {actionLoading === 'backup' ? 'Downloading...' : 'Download'}
                                    </button>
                                </div>
                                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-foreground">Redis Cache</div>
                                        <div className="text-xs text-muted-foreground">Flush all cached responses</div>
                                    </div>
                                    <button onClick={handleFlushCache} disabled={!!actionLoading}
                                        className="px-3 py-1.5 rounded-lg bg-red-900/20 text-red-300 border border-red-800 text-xs font-semibold hover:bg-red-900/30 transition-all disabled:opacity-50">
                                        {actionLoading === 'cache' ? 'Flushing...' : 'Flush'}
                                    </button>
                                </div>
                            </div>
                        </m.div>
                    )}

                    {/* ===== SYSTEM CONTROL (super admin) ===== */}
                    {activeTab === 'control' && isSuperAdmin && (
                        <m.div key="control" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {[
                                    { label: 'PostgreSQL', icon: Database, color: 'blue', endpoint: 'postgres' },
                                    { label: 'Redis Cache', icon: Database, color: 'red', endpoint: 'redis' },
                                    { label: 'ChromaDB', icon: Database, color: 'green', endpoint: 'chroma' },
                                ].map(svc => (
                                    <div key={svc.label} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg bg-${svc.color}-900/40 flex items-center justify-center`}>
                                                    <Database className={`w-4 h-4 text-${svc.color}-400`} />
                                                </div>
                                                <span className="font-semibold text-foreground">{svc.label}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Link to={`/database?tab=${svc.endpoint}`} className="flex-1 text-center py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                                                View Data
                                            </Link>
                                            <button onClick={() => handleRestartService(svc.label)} disabled={!!actionLoading}
                                                className="px-3 py-2 rounded-lg bg-amber-900/20 text-amber-300 border border-amber-800 text-xs font-semibold hover:bg-amber-900/30 transition-all disabled:opacity-50">
                                                Restart
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </m.div>
                    )}

                    {/* ===== ACTION LOGS ===== */}
                    {activeTab === 'logs' && (
                        <m.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-foreground">Action Log</h3>
                                    <span className="text-xs text-muted-foreground">{log.length} entries</span>
                                </div>
                                <div className="h-96 overflow-y-auto font-mono text-xs space-y-1">
                                    {log.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">No actions logged yet</div>
                                    ) : log.map((entry, i) => (
                                        <div key={entry + "-" + i} className="p-2 rounded hover:bg-muted/30">
                                            <span className="text-muted-foreground">{entry}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>
            </LazyMotion>
        </Layout>
    );
}
