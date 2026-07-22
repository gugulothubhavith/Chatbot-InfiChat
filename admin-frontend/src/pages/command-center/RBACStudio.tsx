import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Shield, Users, UserCheck, UserX, RefreshCcw, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function RBACStudio() {
    const { token } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMsg, setActionMsg] = useState('');

    const fetchUsers = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, [token]);

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        setActionMsg('');
        try {
            const res = await axios.patch(`${API}/admin/users/${userId}/status`, {
                is_active: !currentStatus
            }, { headers: { Authorization: `Bearer ${token}` } });
            setActionMsg(res.data.message);
            fetchUsers();
        } catch (err: any) {
            setActionMsg(err.response?.data?.detail || 'Action failed - Super Admin required');
        }
    };

    const deleteUser = async (userId: string, username: string) => {
        if (!confirm(`Permanently delete user "${username}"? This cannot be undone.`)) return;
        try {
            const res = await axios.delete(`${API}/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActionMsg(res.data.message);
            fetchUsers();
        } catch (err: any) {
            setActionMsg(err.response?.data?.detail || 'Delete failed - Super Admin required');
        }
    };

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Shield className="w-7 h-7 text-indigo-500" /> Role-Based Access Control Studio
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage user roles, permissions, and account statuses. Connected to <code>/admin/users</code>.
                        </p>
                    </div>
                    <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">{error}</div>}
                {actionMsg && <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-500 text-sm">{actionMsg}</div>}

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="admin-card stat-blue p-4">
                                <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Users</div>
                                <div className="text-3xl font-black">{users.length}</div>
                            </div>
                            <div className="admin-card stat-green p-4">
                                <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Active</div>
                                <div className="text-3xl font-black">{users.filter(u => u.is_active).length}</div>
                            </div>
                            <div className="admin-card stat-red p-4">
                                <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Suspended</div>
                                <div className="text-3xl font-black">{users.filter(u => !u.is_active).length}</div>
                            </div>
                        </div>

                        {/* User Table */}
                        <div className="admin-card p-0 overflow-hidden">
                            <table className="w-full text-left text-sm data-table">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Created</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td className="px-4 py-3 font-medium">{u.username}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`chip ${u.role === 'super_admin' ? 'chip-purple' : u.role === 'admin' ? 'chip-blue' : 'chip-gray'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`chip ${u.is_active ? 'chip-green' : 'chip-red'}`}>
                                                    {u.is_active ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => toggleUserStatus(u.id, u.is_active)}
                                                    className={`p-1.5 rounded mr-1 transition-colors ${u.is_active ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                                                    title={u.is_active ? 'Suspend User' : 'Activate User'}>
                                                    {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => deleteUser(u.id, u.username)}
                                                    className="p-1.5 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                                                    title="Delete User">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </m.div>
        </Layout>
    </LazyMotion>
);
}
