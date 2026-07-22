import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Building, Plus, Trash2, RefreshCcw, Users, Activity, Settings } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function TenantManager() {
    const { token } = useAuth();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newName, setNewName] = useState('');
    const [feedback, setFeedback] = useState('');

    const fetchTenants = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/organizations/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTenants(res.data || []);
            setError('');
        } catch (err: any) {
            // If org endpoint doesn't exist, fall back to showing stats
            try {
                const statsRes = await axios.get(`${API}/admin/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTenants([{
                    id: 'default',
                    name: 'Default Organization',
                    slug: 'default',
                    users: statsRes.data.total_users || 0,
                    messages: statsRes.data.total_messages || 0,
                    status: 'active',
                    created_at: new Date().toISOString()
                }]);
            } catch {
                setError(err.response?.data?.detail || 'Failed to fetch organizations');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTenants(); }, [token]);

    const createTenant = async () => {
        if (!newName.trim()) { setFeedback('Enter organization name.'); return; }
        try {
            await axios.post(`${API}/organizations/`, {
                name: newName.trim(),
                slug: newName.trim().toLowerCase().replace(/\s+/g, '-')
            }, { headers: { Authorization: `Bearer ${token}` } });
            setFeedback(`Organization "${newName}" created.`);
            setNewName('');
            fetchTenants();
        } catch (err: any) {
            setFeedback(err.response?.data?.detail || 'Failed to create organization');
        }
    };

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Building className="w-7 h-7 text-indigo-500" /> Multi-Tenant Manager
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage isolated organizations via <code>/organizations/</code> API.
                        </p>
                    </div>
                    <button onClick={fetchTenants} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">{error}</div>}
                {feedback && <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-500 text-sm">{feedback}</div>}

                {/* Create Org */}
                <div className="admin-card border-indigo-500/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                        <Plus className="w-5 h-5 text-indigo-400" /> Spawn New Organization
                    </h3>
                    <div className="flex gap-3">
                        <input
                            type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createTenant()}
                            placeholder="Organization Name"
                            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                        />
                        <button onClick={createTenant} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                            Create
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tenants.map((t, i) => (
                            <div key={t.id || i} className="admin-card p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                                            <Building className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">{t.name}</h4>
                                            <div className="text-xs text-muted-foreground">{t.slug || t.id}</div>
                                        </div>
                                    </div>
                                    <span className={`chip ${t.status === 'active' || t.is_active !== false ? 'chip-green' : 'chip-red'}`}>
                                        {t.status || 'Active'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-muted/20 border border-border rounded text-center">
                                        <div className="text-lg font-bold">{t.users || t.member_count || 0}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">Users</div>
                                    </div>
                                    <div className="p-2 bg-muted/20 border border-border rounded text-center">
                                        <div className="text-lg font-bold">{t.messages || 0}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">Messages</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </m.div>
        </Layout>
    </LazyMotion>
);
}
