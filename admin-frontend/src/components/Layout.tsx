import { ReactNode, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useHasPermission, useIsSuperAdmin } from '../hooks/useHasPermission';
import {
    Server, LogOut, LayoutDashboard, Users, ShieldAlert,
    Bell, Search, ChevronDown, Zap, Activity,
    Database, CheckCircle, XCircle, Clock,
    Bot, Cpu, Network, ShieldCheck, Flame, PieChart,
    Radio, Settings, TerminalSquare, Key, Globe, LayoutGrid, Layers, Hexagon, AlertTriangle, Power, RefreshCcw, UploadCloud,
    CreditCard, BarChart3, ToggleLeft, Sliders, UserCog
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import CommandPalette from './CommandPalette';
import axios from 'axios';
import logo from '../logo_icon.png';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function NavItem({ to, icon: Icon, label, active, badge }: {
    to: string; icon: any; label: string; active: boolean; badge?: string;
}) {
    return (
        <Link to={to} className={`sidebar-item ${active ? 'active' : ''}`}>
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && <span className="chip chip-blue">{badge}</span>}
        </Link>
    );
}

const navGroups = [
    {
        title: "Analytics & Telemetry",
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', always: true },
            { to: '/analytics', icon: PieChart, label: 'Token Economics', always: true },
            { to: '/telemetry', icon: Activity, label: 'Sandbox Telemetry', always: true },
            { to: '/topology', icon: Network, label: 'Network Topology', always: true }
        ]
    },
    {
        title: "System Operations",
        items: [
            { to: '/database', icon: Database, label: 'Vector DB Control', always: true },
            { to: '/hardware', icon: Cpu, label: 'GPU Pass-through', always: true },
            { to: '/diagnostics', icon: Server, label: 'Auto-Healing', always: true },
            { to: '/releases', icon: UploadCloud, label: 'Release Management', always: true },
            { to: '/federation', icon: Globe, label: 'Cluster Federation', always: true },
            { to: '/tenants', icon: Layers, label: 'Tenant Manager', always: true }
        ]
    },
    {
        title: "AI Intelligence",
        items: [
            { to: '/models', icon: Bot, label: 'Model Hub', always: true },
            { to: '/firewall', icon: Flame, label: 'Prompt Firewall', always: true },
            { to: '/knowledge', icon: Hexagon, label: 'Knowledge Graph', always: true },
            { to: '/workflows', icon: LayoutGrid, label: 'Workflow Orchestrator', always: true }
        ]
    },
    {
        title: "Security & Access",
        items: [
            { to: '/rbac', icon: Users, label: 'RBAC Studio', always: true },
            { to: '/network', icon: ShieldCheck, label: 'Zero-Trust Network', always: true },
            { to: '/apikeys', icon: Key, label: 'Developer APIs', always: true },
            { to: '/chaos', icon: ShieldAlert, label: 'Chaos Monkey', always: true }
        ]
    },
    {
        title: "DEFCON",
        items: [
            { to: '/defcon', icon: AlertTriangle, label: 'Incident Response', always: true, customClass: 'text-red-500 hover:bg-red-50 hover:border-red-200' },
            { to: '/broadcast', icon: Radio, label: 'Global Broadcast', always: true },
            { to: '/maintenance', icon: Power, label: 'Platform Outage', always: true },
            { to: '/branding', icon: Settings, label: 'Platform Branding', always: true }
        ]
    },
    {
        title: "Subscription & Billing",
        items: [
            { to: '/subscriptions', icon: CreditCard, label: 'Plan Management', always: true },
            { to: '/usage', icon: BarChart3, label: 'Usage Monitoring', always: true },
            { to: '/features', icon: ToggleLeft, label: 'Feature Flags', always: true },
            { to: '/model-config', icon: Sliders, label: 'Model Config', always: true },
            { to: '/user-plans', icon: UserCog, label: 'User Plan Manager', always: true }
        ]
    }
];

const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    sessionStorage.setItem('admin_sidebar_scroll', top.toString());
};

export default function Layout({ children }: { children: ReactNode }) {
    const { user, logout, token } = useAuth();
    const location = useLocation();
    const isSuperAdmin = useIsSuperAdmin();
    const canManageAdmins = useHasPermission("can_manage_admins");
    const canViewAudit = useHasPermission("can_view_audit_logs");

    const [searchOpen, setSearchOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [pendingActions, setPendingActions] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [cpu, setCpu] = useState(0);
    const [ram, setRam] = useState(0);
    const sidebarRef = useRef<HTMLDivElement>(null);



    const [liveBroadcasts, setLiveBroadcasts] = useState<any[]>([]);

    // Fetch live notification and hardware data
    useEffect(() => {
        if (!token) return;
        const fetchData = async () => {
            try {
                if (isSuperAdmin) {
                    const pendingRes = await axios.get(`${API_URL}/admin-security/two-person/pending`, { headers: { Authorization: `Bearer ${token}` } });
                    setPendingActions(pendingRes.data);
                }
                if (canViewAudit) {
                    const auditRes = await axios.get(`${API_URL}/admin-security/audit`, { headers: { Authorization: `Bearer ${token}` } });
                    setAuditLogs(auditRes.data.slice(0, 5));
                }

                // Fetch Hardware Metrics
                const hwRes = await axios.get(`${API_URL}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } });
                if (hwRes.data?.hardware) {
                    setCpu(Math.round(hwRes.data.hardware.cpu_percent));
                    setRam(Math.round(hwRes.data.hardware.ram_percent));
                }
            } catch (e) {
                console.error("Failed to fetch layout data");
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 15000); // Auto refresh every 15s
        
        // Setup Global Broadcast Listener
        const wsUrl = (API_URL ? API_URL.replace('http', 'ws') : 'ws://127.0.0.1:8080') + '/ws/broadcast';
        let ws: WebSocket;
        
        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                // Permission filter
                if (data.target_role === 'super_admin' && !isSuperAdmin) return;
                
                if (data.type === 'SYNC_ACTIVE_BROADCASTS') {
                    setLiveBroadcasts(data.broadcasts.filter((b: any) => 
                        !(b.target_role === 'super_admin' && !isSuperAdmin)
                    ));
                } else if (data.type === 'GLOBAL_BROADCAST') {
                    setLiveBroadcasts(prev => [...prev.filter(b => b.id !== data.id), data]);
                } else if (data.type === 'CLEAR_BROADCAST' || data.type === 'RESOLVE_BROADCAST') {
                    setLiveBroadcasts(prev => prev.filter(b => b.id !== data.id));
                    
                    if (data.type === 'RESOLVE_BROADCAST') {
                        // Show a temporary green toast for the resolution
                        const resolvedData = {
                            id: 'res_' + data.id,
                            priority: 'info',
                            message: data.message,
                            sender: 'System Automated',
                            temporary: true
                        };
                        setLiveBroadcasts(prev => [...prev, resolvedData]);
                        setTimeout(() => setLiveBroadcasts(p => p.filter(b => b.id !== resolvedData.id)), 5000);
                    }
                }
            };
        } catch (e) {
            console.error("Broadcast WS failed", e);
        }

        return () => {
            clearInterval(interval);
            if (ws) ws.close();
        };
    }, [token, isSuperAdmin, canViewAudit]);

    // Restore scroll position on mount with a strong defense against layout shifts
    useLayoutEffect(() => {
        const savedScroll = sessionStorage.getItem('admin_sidebar_scroll');
        if (savedScroll && sidebarRef.current) {
            const scrollPos = parseInt(savedScroll, 10);
            // Defend scroll position aggressively for 300ms against React Router / browser resets
            let frameId: number;
            const forceScroll = () => {
                if (sidebarRef.current) sidebarRef.current.scrollTop = scrollPos;
                frameId = requestAnimationFrame(forceScroll);
            };
            forceScroll();
            const timer = setTimeout(() => cancelAnimationFrame(frameId), 300);
            return () => { cancelAnimationFrame(frameId); clearTimeout(timer); };
        }
    }, [location.pathname]);




    const handleApprove = async (id: string) => {
        try {
            await axios.post(`${API_URL}/admin-security/two-person/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingActions(prev => prev.filter((p: any) => p.id !== id));
            alert("Action Approved successfully");
        } catch (e: any) {
            alert(e.response?.data?.detail || "Approval failed");
        }
    };

    const totalNotifs = pendingActions.length;

    return (
        <div className="admin-layout font-sans">
            <CommandPalette open={searchOpen} setOpen={setSearchOpen} />

            {/* Global Broadcast Toasts rendered above everything */}
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none w-full max-w-lg px-4 flex flex-col gap-3">
                {liveBroadcasts.map(broadcast => (
                    <div key={broadcast.id} className="animate-in slide-in-from-top fade-in duration-300 pointer-events-auto p-4 rounded-xl shadow-2xl flex items-start gap-4 border"
                        style={{
                            background: broadcast.priority === 'critical' ? 'rgba(239, 68, 68, 0.95)' : 
                                        broadcast.priority === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 
                                        broadcast.priority === 'info' && broadcast.message?.startsWith('Resolved:') ? 'rgba(16, 185, 129, 0.95)' :
                                        'rgba(59, 130, 246, 0.95)',
                            borderColor: broadcast.priority === 'critical' ? '#fca5a5' : 
                                         broadcast.priority === 'warning' ? '#fcd34d' : 
                                         broadcast.priority === 'info' && broadcast.message?.startsWith('Resolved:') ? '#6ee7b7' :
                                         '#93c5fd',
                            color: 'white',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        {broadcast.priority === 'critical' ? <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" /> :
                         broadcast.priority === 'warning' ? <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" /> :
                         broadcast.message?.startsWith('Resolved:') ? <CheckCircle className="w-6 h-6 shrink-0 mt-0.5" /> :
                         <Radio className="w-6 h-6 shrink-0 mt-0.5" />}
                        
                        <div className="flex-1 min-w-0">
                            <div className="font-bold flex items-center justify-between">
                                <span>{broadcast.priority === 'critical' ? 'CRITICAL SYSTEM ALERT' : 
                                       broadcast.priority === 'warning' ? 'SYSTEM WARNING' :
                                       broadcast.message?.startsWith('Resolved:') ? 'ISSUE RESOLVED' : 'GLOBAL BROADCAST'}</span>
                            </div>
                            <div className="text-sm mt-1 mb-2 leading-relaxed opacity-95">
                                {broadcast.message}
                            </div>
                            
                            {/* Actionable Interactive Buttons */}
                            {broadcast.action && broadcast.action !== 'none' && (
                                <div className="mt-3">
                                    {broadcast.action === 'refresh' && (
                                        <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-bold transition-all shadow-sm">
                                            Force Refresh Now
                                        </button>
                                    )}
                                    {broadcast.action === 'logout' && (
                                        <button onClick={logout} className="px-3 py-1.5 bg-black/30 hover:bg-black/40 rounded text-xs font-bold transition-all shadow-sm border border-white/10">
                                            Acknowledge & Log Out
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setLiveBroadcasts(p => p.filter(b => b.id !== broadcast.id))} className="p-1 hover:bg-white/20 rounded opacity-75 hover:opacity-100 transition-all">
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* ===== SIDEBAR ===== */}
            <aside className="admin-sidebar hidden md:flex flex-col">
                {/* Brand */}
                <div className="flex items-center justify-center px-5 py-4 border-b border-border">
                    <img src={logo} alt="Logo" className="w-24 h-16 object-contain" />
                </div>

                {/* System Status */}
                <div className="mx-4 my-3 p-3 rounded-xl bg-green-50 border border-green-100">
                    <div className="flex items-center gap-2">
                        <div className="live-dot w-2 h-2 flex-shrink-0" />
                        <span className="text-xs font-semibold text-green-700">All Systems Operational</span>
                    </div>
                    <div className="text-[11px] text-green-600 mt-1">7 services • 100% uptime</div>
                </div>

                {/* Nav */}
                <nav className="px-3 py-2 flex-1 space-y-1">
                    <div 
                        ref={sidebarRef}
                        onScroll={handleSidebarScroll}
                        className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-5 pb-5"
                    >
                    {navGroups.map((group) => (
                        <div key={group.title} className="space-y-1">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">{group.title}</div>
                            {group.items.reduce((acc: ReactNode[], item) => {
                                if (item.always || (item as any).show) {
                                    acc.push(
                                        <Link key={item.to} to={item.to} className={`sidebar-item ${location.pathname === item.to ? 'active' : ''} ${item.customClass || ''}`}>
                                            <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${location.pathname === item.to && item.customClass ? '' : ''}`} />
                                            <span className="flex-1 text-[13px]">{item.label}</span>
                                        </Link>
                                    );
                                }
                                return acc;
                            }, [])}
                        </div>
                    ))}
                    </div>

                    {isSuperAdmin && (
                        <>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 mt-5">Super Admin</div>
                            <div className="sidebar-item text-amber-600 bg-amber-50 border border-amber-100">
                                <Zap className="w-4 h-4 flex-shrink-0" />
                                <span>Full Control Mode</span>
                                <span className="chip chip-amber">SA</span>
                            </div>
                        </>
                    )}
                </nav>

                {/* Quick Stats */}
                <div className="px-4 py-3 border-t border-border space-y-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Quick Metrics</div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="w-3 h-3" /> CPU</span>
                        <span className="font-semibold text-foreground">{cpu}%</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill bg-blue-400" style={{ width: `${cpu}%` }} /></div>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Database className="w-3 h-3" /> RAM</span>
                        <span className="font-semibold text-foreground">{ram}%</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill bg-violet-400" style={{ width: `${ram}%` }} /></div>
                </div>

                {/* User Profile at Bottom */}
                <div className="px-4 py-4 border-t border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                            {user?.email?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{user?.email}</div>
                            <div className="text-[10px] text-muted-foreground">{isSuperAdmin ? '⚡ Super Admin' : 'Admin'}</div>
                        </div>
                        <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-muted-foreground transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ===== MAIN AREA ===== */}
            <div className="admin-main" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                {/* Top Bar */}
                <div className="admin-topbar justify-end gap-4 relative z-40" style={{ flexShrink: 0 }}>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors w-10 sm:w-auto overflow-hidden"
                        >
                            <Search className="w-4 h-4 flex-shrink-0" />
                            <span className="hidden sm:block text-xs truncate">Quick search users/actions...</span>
                            <kbd className="hidden lg:block text-[10px] px-1.5 py-0.5 rounded bg-background border border-border font-mono flex-shrink-0">⌘K</kbd>
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={() => window.location.reload()}
                            className="relative w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted flex flex-shrink-0 items-center justify-center transition-colors shadow-sm"
                            title="Hard Refresh Dashboard"
                        >
                            <RefreshCcw className="w-4 h-4 text-muted-foreground" />
                        </button>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setNotifOpen(!notifOpen)}
                                className="relative w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
                            >
                                <Bell className="w-4 h-4 text-muted-foreground" />
                                {totalNotifs > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                                        {totalNotifs}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {notifOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-80 bg-white border border-border shadow-2xl rounded-2xl overflow-hidden z-50">
                                        <div className="p-3 border-b border-border bg-muted/30 flex justify-between items-center">
                                            <span className="font-bold text-sm">Notifications</span>
                                            {totalNotifs > 0 && <span className="chip chip-amber">{totalNotifs} Action(s) Required</span>}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {/* Approvals */}
                                            {pendingActions.map((pa: any) => (
                                                <div key={pa.id} className="p-3 border-b border-border bg-amber-50 hover:bg-amber-100 transition-colors">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex gap-2">
                                                            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5" />
                                                            <div>
                                                                <div className="text-sm font-semibold text-amber-900">{pa.action_type}</div>
                                                                <div className="text-xs text-amber-700 mt-0.5">Authorization required.</div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleApprove(pa.id)}
                                                            className="px-2 py-1 bg-amber-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-amber-700"
                                                        >
                                                            Approve
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Recent Logs */}
                                            {auditLogs.map((log: any) => (
                                                <div key={log.id} className="p-3 border-b border-border hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-start gap-2">
                                                        <Activity className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0 inline mr-2" />
                                                        <span className="text-sm font-medium text-foreground">{log.action}</span>
                                                    </div>
                                                    <div className="ml-6 text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(log.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            ))}

                                            {pendingActions.length === 0 && auditLogs.length === 0 && (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    <Bell className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                                    <span className="text-sm">No new notifications</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2 border-t border-border bg-muted/30 text-center">
                                            <Link to="/security" onClick={() => setNotifOpen(false)} className="text-xs text-primary font-medium hover:underline">
                                                View all activity
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Status chip */}
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                            <div className="live-dot w-2 h-2 flex-shrink-0" />
                            Live
                        </div>
                    </div>
                </div>

                {/* Page Content - scrollable independently */}
                <main className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
