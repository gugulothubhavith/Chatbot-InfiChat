import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
    UploadCloud, CheckCircle, Clock, List,
    ArrowRight, Info, AlertCircle, RefreshCw,
    Download, Globe, Tag, Terminal, Rocket,
    RotateCcw, Shield, Activity, X, ChevronDown,
    Package, Calendar, Hash, ExternalLink, Trash2,
    TrendingUp, Layers, Monitor, Apple 
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface Release {
    id: number;
    version: string;
    download_url: string;
    release_notes: string;
    platform: string;
    status: string;
    is_active: boolean;
    checksum: string | null;
    download_count: number;
    created_at: string;
}

interface ReleaseStats {
    total_releases: number;
    active_version: string;
    last_deploy: string | null;
    total_downloads: number;
}

// ─── Confirmation Modal ────────────────────────────────────────────────────
function ConfirmModal({ version, platform, notes, onConfirm, onCancel, pushing }: {
    version: string; platform: string; notes: string;
    onConfirm: () => void; onCancel: () => void; pushing: boolean;
}) {
    return (
        <m.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <m.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <Rocket className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Confirm Deployment</h3>
                                <p className="text-xs text-blue-200">This will notify all active users</p>
                            </div>
                        </div>
                        <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Version</p>
                            <p className="text-lg font-black text-gray-900 mt-0.5">{version}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Platform</p>
                            <p className="text-lg font-black text-gray-900 mt-0.5 capitalize">{platform === 'all' ? 'Cross-Platform' : platform}</p>
                        </div>
                    </div>
                    {notes && (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Release Notes</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{notes}</p>
                        </div>
                    )}
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            All active desktop users will receive an update notification within 10 seconds of their next session.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={pushing}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={pushing}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
                    >
                        {pushing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                        {pushing ? 'Deploying...' : 'Deploy Now'}
                    </button>
                </div>
            </m.div>
        </m.div>
    );
}

// ─── Platform Icon Helper ──────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
    const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
        all: { icon: <Globe className="w-3 h-3" />, label: 'Cross-Platform', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        windows: { icon: <Monitor className="w-3 h-3" />, label: 'Windows', color: 'bg-sky-100 text-sky-700 border-sky-200' },
        macos: { icon: <Apple className="w-3 h-3" />, label: 'macOS', color: 'bg-gray-100 text-gray-700 border-gray-200' },
        linux: { icon: <Terminal className="w-3 h-3" />, label: 'Linux', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    };
    const c = config[platform] || config.all;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${c.color}`}>
            {c.icon} {c.label}
        </span>
    );
}

// ─── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        previous: 'bg-gray-100 text-gray-600 border-gray-200',
        deprecated: 'bg-red-100 text-red-600 border-red-200',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.previous}`}>
            {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            {status}
        </span>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ReleaseManagement() {
    const { token } = useAuth();
    const [releases, setReleases] = useState<Release[]>([]);
    const [stats, setStats] = useState<ReleaseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [pushing, setPushing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [rollingBack, setRollingBack] = useState<number | null>(null);

    // Form State
    const [version, setVersion] = useState('');
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [platform, setPlatform] = useState('all');
    const [checksum, setChecksum] = useState('');

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = useCallback(async () => {
        try {
            const [relRes, statRes] = await Promise.all([
                axios.get(`${API}/system/releases`, { headers }).catch(() => ({ data: { releases: [] } })),
                axios.get(`${API}/system/releases/stats`, { headers }).catch(() => ({ data: null }))
            ]);
            setReleases(relRes.data.releases || []);
            setStats(statRes.data);
        } catch (err) {
            console.error('Failed to fetch release data', err);
            // Fallback: try the legacy endpoint
            try {
                const res = await axios.get(`${API}/system/latest-update`);
                if (res.data && res.data.version) {
                    setReleases([res.data]);
                }
            } catch {
                // ignore
            }
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-dismiss success messages
    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(''), 5000);
            return () => clearTimeout(t);
        }
    }, [success]);

    const handlePushRelease = async () => {
        setPushing(true);
        setError('');
        setSuccess('');
        try {
            await axios.post(`${API}/system/latest-update`, {
                version, download_url: url, release_notes: notes, platform, checksum: checksum || null
            }, { headers });
            setSuccess(`🚀 Release ${version} deployed successfully!`);
            setVersion(''); setUrl(''); setNotes(''); setChecksum('');
            setShowConfirm(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to push release');
            setShowConfirm(false);
        } finally {
            setPushing(false);
        }
    };

    const handleRollback = async (releaseId: number, ver: string) => {
        setRollingBack(releaseId);
        setError('');
        try {
            await axios.post(`${API}/system/releases/${releaseId}/rollback`, {}, { headers });
            setSuccess(`⏪ Rolled back to version ${ver}`);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Rollback failed');
        } finally {
            setRollingBack(null);
        }
    };

    const handleDeprecate = async (releaseId: number, ver: string) => {
        if (!confirm(`Deprecate version ${ver}? This cannot be undone.`)) return;
        setError('');
        try {
            await axios.delete(`${API}/system/releases/${releaseId}`, { headers });
            setSuccess(`Version ${ver} deprecated`);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to deprecate');
        }
    };

    const activeRelease = releases.find(r => r.is_active || r.status === 'active');

    const canSubmit = version.trim() && url.trim();

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                {/* ═══ Header ═══ */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Rocket className="w-7 h-7 text-blue-500" /> Release Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Deploy, track, and rollback InfiChat Desktop versions across all users.
                        </p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchData(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>

                {/* ═══ Stats Cards ═══ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            icon: <Layers className="w-5 h-5" />,
                            label: 'Total Releases',
                            value: stats?.total_releases ?? releases.length,
                            color: 'from-blue-500 to-indigo-500',
                            bg: 'bg-blue-50 border-blue-100'
                        },
                        {
                            icon: <Package className="w-5 h-5" />,
                            label: 'Active Version',
                            value: stats?.active_version ?? activeRelease?.version ?? '—',
                            color: 'from-emerald-500 to-teal-500',
                            bg: 'bg-emerald-50 border-emerald-100'
                        },
                        {
                            icon: <Calendar className="w-5 h-5" />,
                            label: 'Last Deploy',
                            value: stats?.last_deploy
                                ? new Date(stats.last_deploy).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                : '—',
                            color: 'from-violet-500 to-purple-500',
                            bg: 'bg-violet-50 border-violet-100'
                        },
                        {
                            icon: <TrendingUp className="w-5 h-5" />,
                            label: 'Total Downloads',
                            value: stats?.total_downloads ?? 0,
                            color: 'from-amber-500 to-orange-500',
                            bg: 'bg-amber-50 border-amber-100'
                        },
                    ].map((s, i) => (
                        <m.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`relative overflow-hidden rounded-2xl border p-5 ${s.bg} transition-all hover:shadow-md`}
                        >
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white mb-3 shadow-lg`}>
                                {s.icon}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</div>
                            <div className="text-2xl font-black text-gray-900 mt-0.5">{s.value}</div>
                        </m.div>
                    ))}
                </div>

                {/* ═══ Notifications ═══ */}
                <AnimatePresence>
                    {error && (
                        <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 shadow-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                        </m.div>
                    )}
                    {success && (
                        <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2 shadow-sm">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
                        </m.div>
                    )}
                </AnimatePresence>

                {/* ═══ Main Grid ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* ── Push Form (col-span-3) ── */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-blue-500" /> Push New Release
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">Fill in release details and deploy to production</p>
                        </div>
                        <div className="p-6">
                            <div className="space-y-5">
                                {/* Version + Platform Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Version <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="e.g. 1.2.0"
                                                value={version}
                                                onChange={e => setVersion(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Platform
                                        </label>
                                        <div className="flex items-center p-1 bg-gray-50 border border-gray-200 rounded-xl">
                                            {[
                                                { val: 'all', label: 'All', icon: <Globe className="w-3.5 h-3.5" /> },
                                                { val: 'windows', label: 'Win', icon: <Monitor className="w-3.5 h-3.5" /> },
                                                { val: 'macos', label: 'Mac', icon: <Apple className="w-3.5 h-3.5" /> },
                                            ].map(p => (
                                                <button
                                                    key={p.val}
                                                    type="button"
                                                    onClick={() => setPlatform(p.val)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${platform === p.val
                                                        ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    {p.icon} {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Download URL */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Download URL <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Download className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="url"
                                            placeholder="https://cdn.example.com/releases/setup-v1.2.0.exe"
                                            value={url}
                                            onChange={e => setUrl(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Checksum */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        SHA256 Checksum <span className="text-gray-300">(optional)</span>
                                    </label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="e.g. a1b2c3d4e5f6..."
                                            value={checksum}
                                            onChange={e => setChecksum(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Release Notes */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            Release Notes
                                        </label>
                                        <span className="text-[10px] text-gray-400">{notes.length}/500</span>
                                    </div>
                                    <textarea
                                        placeholder="What's new in this version? Bug fixes, features, improvements..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value.slice(0, 500))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all min-h-[100px] resize-none"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="button"
                                    disabled={!canSubmit || pushing}
                                    onClick={() => setShowConfirm(true)}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    <Rocket className="w-5 h-5" /> Deploy Release to Users
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Active Release Panel (col-span-2) ── */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Active Version Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-emerald-500" /> Active Release
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Currently served to all apps</p>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                            </div>
                            <div className="p-6">
                                {loading ? (
                                    <div className="py-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-blue-500" /></div>
                                ) : activeRelease ? (
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight leading-none">
                                                    v{activeRelease.version}
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <StatusBadge status="active" />
                                                    <PlatformBadge platform={activeRelease.platform} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-gray-100">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" /> Deployed
                                                </span>
                                                <span className="font-semibold text-gray-900">
                                                    {activeRelease.created_at
                                                        ? new Date(activeRelease.created_at).toLocaleDateString(undefined, {
                                                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        }) : 'N/A'}
                                                </span>
                                            </div>
                                            {activeRelease.checksum && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500 flex items-center gap-1.5">
                                                        <Hash className="w-3.5 h-3.5" /> Checksum
                                                    </span>
                                                    <span className="font-mono text-xs text-gray-600 truncate max-w-[160px]">{activeRelease.checksum}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 flex items-center gap-1.5">
                                                    <Download className="w-3.5 h-3.5" /> Downloads
                                                </span>
                                                <span className="font-semibold text-gray-900">{activeRelease.download_count || 0}</span>
                                            </div>
                                        </div>

                                        {activeRelease.release_notes && (
                                            <div className="pt-3 border-t border-gray-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Release Notes</p>
                                                <div className="text-sm text-gray-700 p-3 bg-gray-50 rounded-xl border border-gray-100 leading-relaxed">
                                                    {activeRelease.release_notes}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-gray-400">
                                        <Package className="w-12 h-12 mx-auto opacity-20 mb-2" />
                                        <p className="text-sm font-medium">No active release found</p>
                                        <p className="text-xs mt-1">Push your first release to get started</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Warning Card */}
                        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                            <div className="p-5 flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0 border border-amber-200">
                                    <Info className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Push-Sensitive Action</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Pushing a new release triggers a notification popup for all active desktop users within 10 seconds. Use the confirmation dialog to review before deploying.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ Release History Table ═══ */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <List className="w-5 h-5 text-gray-400" /> Release History
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">{releases.length} release{releases.length !== 1 ? 's' : ''} on record</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Version</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Platform</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deployed</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Downloads</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading releases...
                                    </td></tr>
                                ) : releases.length > 0 ? releases.map(r => (
                                    <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-gray-900">v{r.version}</span>
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                                        <td className="px-6 py-4"><PlatformBadge platform={r.platform} /></td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            }) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{r.download_count || 0}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {r.download_url && (
                                                    <a
                                                        href={r.download_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Open download URL"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                {!r.is_active && r.status !== 'deprecated' && (
                                                    <button
                                                        onClick={() => handleRollback(r.id, r.version)}
                                                        disabled={rollingBack === r.id}
                                                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Rollback to this version"
                                                    >
                                                        {rollingBack === r.id
                                                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                            : <RotateCcw className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                {!r.is_active && r.status !== 'deprecated' && (
                                                    <button
                                                        onClick={() => handleDeprecate(r.id, r.version)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Deprecate this version"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {r.is_active && (
                                                    <span className="px-2 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-200">
                                                        LIVE
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <Package className="w-10 h-10 mx-auto opacity-20 mb-2" />
                                        <p className="text-sm font-medium">No releases yet</p>
                                        <p className="text-xs mt-1">Push your first release to see it here</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </m.div>

            {/* ═══ Confirm Modal ═══ */}
            <AnimatePresence>
                {showConfirm && (
                    <ConfirmModal
                        version={version}
                        platform={platform}
                        notes={notes}
                        onConfirm={handlePushRelease}
                        onCancel={() => setShowConfirm(false)}
                        pushing={pushing}
                    />
                )}
            </AnimatePresence>
        </Layout>
    );
}
