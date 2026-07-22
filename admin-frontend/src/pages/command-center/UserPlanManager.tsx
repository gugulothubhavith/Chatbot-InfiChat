import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
    Search, User, Users, Mail, Shield, Loader2, Check, X,
    Crown, Infinity, Zap, Star, Sparkles, ChevronDown, RefreshCw,
    MessageSquare, Brain, Globe, Image, Code, AlertTriangle
} from 'lucide-react';
import Layout from '../../components/Layout';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface UserType {
    id: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

interface PlanType {
    id: string;
    name: string;
    price_monthly: number;
    is_admin_plan: boolean;
}

interface UsageData {
    [feature: string]: { count: number; tokens: number };
}

const FEATURE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
    chat_messages: { icon: MessageSquare, label: 'Chat', color: '#3b82f6' },
    deep_research: { icon: Globe, label: 'Research', color: '#8b5cf6' },
    deep_thinking: { icon: Brain, label: 'Thinking', color: '#10b981' },
    image_gen: { icon: Image, label: 'Images', color: '#f59e0b' },
    code_executions: { icon: Code, label: 'Code', color: '#ef4444' },
};

const getPlanBadge = (planName: string) => {
    switch (planName) {
        case 'Free': return { icon: Zap, color: 'text-muted-foreground', bg: 'bg-muted' };
        case 'Starter': return { icon: Star, color: 'text-blue-600', bg: 'bg-blue-50' };
        case 'Pro': return { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' };
        case 'Max': return { icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' };
        case 'Enterprise': return { icon: Infinity, color: 'text-red-600', bg: 'bg-red-50' };
        default: return { icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
};

export default function UserPlanManager() {
    const { token } = useAuth();
    const [users, setUsers] = useState<UserType[]>([]);
    const [plans, setPlans] = useState<PlanType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
    const [userUsage, setUserUsage] = useState<UsageData>({});
    const [usageLoading, setUsageLoading] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [assigning, setAssigning] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (!token) return;
        const fetchData = async () => {
            try {
                const [usersRes, plansRes] = await Promise.all([
                    axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_URL}/subscription/admin/plans`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setUsers(usersRes.data || []);
                setPlans(plansRes.data || []);
            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const fetchUserUsage = async (userId: string) => {
        setUsageLoading(true);
        try {
            const res = await axios.get(`${API_URL}/subscription/admin/user-usage/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUserUsage(res.data || {});
        } catch (err) {
            console.error('Failed to fetch user usage', err);
            setUserUsage({});
        } finally {
            setUsageLoading(false);
        }
    };

    const handleUserSelect = async (user: UserType) => {
        setSelectedUser(user);
        setSelectedPlanId('');
        await fetchUserUsage(user.id);
    };

    const handleAssignPlan = async () => {
        if (!selectedUser || !selectedPlanId) return;
        setAssigning(true);
        try {
            await axios.post(`${API_URL}/subscription/admin/users/${selectedUser.id}/assign-plan`,
                { plan_id: selectedPlanId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const planName = plans.find(p => p.id === selectedPlanId)?.name || 'Unknown';
            showToast(`Assigned ${planName} to ${selectedUser.username}`, 'success');
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Assignment failed', 'error');
        } finally {
            setAssigning(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <div className="p-6 space-y-6">
                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <m.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${
                                toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                            }`}
                        >
                            {toast.msg}
                        </m.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Plan Manager</h1>
                    <p className="text-sm text-muted-foreground mt-1">View and manage user subscription plans</p>
                </div>

                {/* Plan Distribution */}
                <div className="grid grid-cols-5 gap-3">
                    {['Free', 'Starter', 'Pro', 'Max', 'Enterprise'].map(name => {
                        const badge = getPlanBadge(name);
                        const BadgeIcon = badge.icon;
                        return (
                            <div key={name} className="rounded-xl p-3 bg-card border border-border text-center">
                                <div className={`w-8 h-8 rounded-lg ${badge.bg} flex items-center justify-center mx-auto mb-2`}>
                                    <BadgeIcon className={`w-4 h-4 ${badge.color}`} />
                                </div>
                                <div className="text-xs font-semibold text-foreground">{name}</div>
                            </div>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* User List */}
                        <div className="lg:col-span-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-border">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted">
                                    <Search className="w-4 h-4 text-muted-foreground" />
                                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search users..." className="bg-transparent outline-none flex-1 text-sm" />
                                </div>
                            </div>
                            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                                {filteredUsers.map(user => (
                                    <button key={user.id} onClick={() => handleUserSelect(user)}
                                        className={`w-full text-left px-4 py-3 hover:bg-muted transition-all flex items-center gap-3 ${
                                            selectedUser?.id === user.id ? 'bg-indigo-50' : ''
                                        }`}>
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">{user.username}</div>
                                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* User Detail */}
                        <div className="lg:col-span-2">
                            {selectedUser ? (
                                <m.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6"
                                >
                                    {/* User Info */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                            <User className="w-7 h-7 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-bold text-foreground">{selectedUser.username}</h2>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedUser.email}</span>
                                                <span className="flex items-center gap-1">
                                                    <Shield className="w-3.5 h-3.5" /> {selectedUser.role}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    selectedUser.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                }`}>
                                                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Plan Assignment */}
                                    <div className="rounded-2xl bg-muted p-4">
                                        <h3 className="font-semibold text-gray-800 mb-3">Assign Plan</h3>
                                        <div className="flex items-center gap-3">
                                            <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}
                                                className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-gray-200 outline-none text-sm font-medium">
                                                <option value="">Select a plan...</option>
                                                {plans.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} {p.is_admin_plan ? '(Unlimited)' : `(₹${p.price_monthly}/mo)`}
                                                    </option>
                                                ))}
                                            </select>
                                            <button onClick={handleAssignPlan} disabled={!selectedPlanId || assigning}
                                                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
                                                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                Assign
                                            </button>
                                        </div>
                                    </div>

                                    {/* Usage Stats */}
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-3">Usage (This Month)</h3>
                                        {usageLoading ? (
                                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                                        ) : Object.keys(userUsage).length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground text-sm">No usage data for this user</div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(userUsage).map(([feature, data]) => {
                                                    const config = FEATURE_CONFIG[feature] || { icon: AlertTriangle, label: feature, color: '#6b7280' };
                                                    const Icon = config.icon;
                                                    return (
                                                        <div key={feature} className="rounded-xl p-4 bg-card border border-border">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Icon className="w-4 h-4" style={{ color: config.color }} />
                                                                <span className="text-sm font-semibold text-foreground">{config.label}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">Requests</span>
                                                                <span className="font-bold text-foreground">{data.count}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">Tokens</span>
                                                                <span className="font-bold text-foreground">{data.tokens.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </m.div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                                    <Users className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="font-medium">Select a user</p>
                                    <p className="text-sm">Choose a user from the list to view their plan and usage</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    </LazyMotion>
);
}
