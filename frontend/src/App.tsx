import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { LazyMotion, domAnimation } from 'framer-motion';
import { useState, useEffect, lazy, Suspense } from "react";
import { Warning as AlertTriangle, Warning, CheckCircle, Radio, XCircle } from "@phosphor-icons/react";
import { cn } from "./lib/utils";
import { ToastProvider } from "./components/ui/Toast";

// Eager: primary route
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Sidebar from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { ScrollProvider } from "./components/ScrollProvider";
import { List } from "@phosphor-icons/react";

// Lazy: secondary routes (code-split)
const CodeAgent = lazy(() => import("./pages/CodeAgent"));
const RAG = lazy(() => import("./pages/RAG"));
const ImageGen = lazy(() => import("./pages/ImageGen"));
const Snippets = lazy(() => import("./pages/Snippets"));
const SharedChatView = lazy(() => import("./pages/SharedChatView"));
const Admin = lazy(() => import("./pages/Admin"));

// Minimal loading fallback
function PageLoader() {
    return (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[var(--color-text-tertiary)]">Loading...</span>
            </div>
        </div>
    );
}


function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { token } = useAuth();
    return token ? <>{children}</> : <Navigate to="/login" />;
}

// Admin route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
    const { token, user } = useAuth();

    if (!token) return <Navigate to="/login" />;
    if (user?.role !== "admin") return <Navigate to="/" />; // Redirect non-admins to home

    return <>{children}</>;
}

// Layout with sidebar
function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { token, user, logout } = useAuth();
    const isAdmin = user?.role === "admin";
    const [liveBroadcasts, setLiveBroadcasts] = useState<any[]>([]);

    useEffect(() => {
        if (!token) return;
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
        const wsUrl = API_URL.replace('http', 'ws') + '/ws/broadcast';
        let ws: WebSocket;

        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                // Permission filter
                if (data.target_role === 'super_admin' && !isAdmin) return;

                if (data.type === 'SYNC_ACTIVE_BROADCASTS') {
                    setLiveBroadcasts(data.broadcasts.filter((b: any) =>
                        !(b.target_role === 'super_admin' && !isAdmin)
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
                            sender: 'System Protocol',
                            target_role: data.target_role
                        };
                        setLiveBroadcasts(prev => [...prev, resolvedData]);
                        setTimeout(() => {
                            setLiveBroadcasts(prev => prev.filter(b => b.id !== resolvedData.id));
                        }, 5000);
                    }
                }
            };
        } catch (e) {
            console.error("Failed to connect to broadcast websocket");
        }

        return () => {
            if (ws) ws.close();
        };
    }, [token, isAdmin]);

    return (
        <ScrollProvider>
            <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                <button 
                  className="md:hidden fixed top-4 right-4 z-40 p-2 rounded-xl glass-heavy shadow-lg transition-transform hover:scale-105 active:scale-95 text-[var(--color-text-primary)]"
                  style={{ border: '1px solid var(--color-border)' }}
                  onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
                  aria-label="Toggle mobile menu"
                >
                  <List className="h-5 w-5" weight="light" />
                </button>
            
            {/* Global Broadcast Toasts */}
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none w-full max-w-lg px-4 flex flex-col gap-3">
                {liveBroadcasts.map(broadcast => (
                    <div key={broadcast.id} className="pointer-events-auto p-4 rounded-xl shadow-2xl flex items-start gap-4 border transition-all"
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
                        {broadcast.priority === 'critical' ? <Warning className="w-6 h-6 shrink-0 mt-0.5" weight="fill" /> :
                            broadcast.priority === 'warning' ? <Warning className="w-6 h-6 shrink-0 mt-0.5" weight="fill" /> :
                                broadcast.message?.startsWith('Resolved:') ? <CheckCircle className="w-6 h-6 shrink-0 mt-0.5" weight="fill" /> :
                                    <Radio className="w-6 h-6 shrink-0 mt-0.5" weight="bold" />}

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
                            <XCircle className="w-5 h-5" weight="fill" />
                        </button>
                    </div>
                ))}
            </div>

            <Sidebar />
            <main id="scroll-wrapper" className="flex-1 overflow-y-auto relative">
                <div id="scroll-content">
                    {children}
                </div>
            </main>
        </div>
        </ScrollProvider>
    );
}

function MaintenanceOverlay({ enabled, message, eta }: { enabled: boolean, message: string, eta: string }) {
    if (!enabled) return null;

    return (
        <div className="fixed inset-0 z-[10000] bg-[#050505] flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden">
            {/* Screen Glass Effect */}
            <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-tr from-white/5 to-transparent opacity-20" />
            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />

            {/* CRT Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.04] overflow-hidden">
                {[...Array(100)].map((_, i) => (
                    <div key={i} className="h-px w-full bg-white mb-[4px]" />
                ))}
            </div>

            {/* Background Pulsing HUD Element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full blur-[150px] bg-red-500/10 animate-pulse duration-[4000ms]" />

            <div className="relative z-[40] w-full max-w-4xl text-center space-y-12">
                {/* Header HUD info */}
                <div className="flex items-center justify-center gap-12 text-[10px] font-mono text-red-500/50 uppercase tracking-[0.4em] mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        Live Status: Lockdown
                    </div>
                    <div className="hidden sm:block truncate">Terminal_ID: INFICHAT-CORE-PRIME</div>
                    <div className="hidden sm:block">Channel: Emergency_Broadcast</div>
                </div>

                {/* Primary Alert Icon */}
                <div className="relative inline-block scale-125 md:scale-150">
                    <AlertTriangle className="w-16 h-16 text-red-500 relative animate-pulse" />
                    <div className="absolute inset-0 -z-10 bg-red-500 blur-3xl opacity-30 scale-150 animate-pulse" />
                </div>

                {/* Main Heading */}
                <div className="space-y-4">
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                        SYSTEM <span className="text-red-500">OFFLINE</span>
                    </h1>
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-px w-24 bg-red-500/30" />
                        <div className="text-[10px] font-mono font-bold text-red-500 tracking-[0.3em] uppercase">Protocol Enforcement 99-X</div>
                        <div className="h-px w-24 bg-red-500/30" />
                    </div>
                </div>

                {/* The Message Box */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 md:p-12 backdrop-blur-md relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500/20" />
                    <p className="text-2xl md:text-3xl text-gray-200 font-medium leading-relaxed italic tracking-wide">
                        "{message}"
                    </p>
                </div>

                {/* Diagnostic Footer */}
                <div className="flex flex-col items-center gap-8 pt-6">
                    <div className="flex gap-4 md:gap-8 items-center text-[11px] font-mono text-gray-500">
                        <div className="px-3 py-1 rounded border border-red-500/50 bg-red-500/10 text-red-500">
                            RESTO_ETA: {eta}
                        </div>
                        <div className="px-3 py-1 rounded border border-gray-800 bg-black/50">
                            NODES_CHECK: 100% OK
                        </div>
                        <div className="px-3 py-1 rounded border border-gray-800 bg-black/50">
                            AUTH_BYPASS: DISABLED
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs max-w-lg mx-auto text-gray-400 font-medium uppercase tracking-[0.15em] leading-relaxed opacity-60">
                            Our architecture is undergoing critical state synchronization.
                            The session handshake will automatically proceed when service is restored.
                        </p>
                        <div className="text-[9px] font-mono text-gray-600">
                            checksum: {Math.random().toString(36).substring(7).toUpperCase()} // v3.0.4-CRITICAL-MAINTENANCE
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function App() {
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    const [maintenance, setMaintenance] = useState({ enabled: false, message: "", eta: "--:--:--" });

    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
        const wsUrl = API_URL.replace('http', 'ws') + '/ws/broadcast';
        let ws: WebSocket;

        const connect = () => {
            try {
                ws = new WebSocket(wsUrl);
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'SYNC_ACTIVE_BROADCASTS' && data.maintenance) {
                        setMaintenance(data.maintenance);
                    } else if (data.type === 'MAINTENANCE_MODE') {
                        setMaintenance({
                            enabled: data.enabled,
                            message: data.message,
                            eta: data.eta || "--:--:--"
                        });
                        if (data.enabled === false) {
                            // Optionally refresh to clear any state if needed
                            window.location.reload();
                        }
                    }
                };
                ws.onclose = () => {
                    // Reconnect after 5 seconds if closed
                    setTimeout(connect, 5000);
                };
            } catch (e) {
                console.error("Maintenance Listener failed", e);
                setTimeout(connect, 5000);
            }
        };

        connect();
        return () => {
            if (ws) ws.close();
        };
    }, []);


    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <ThemeProvider>
                <div className="flex flex-col h-screen w-full overflow-hidden">
                    <AuthProvider>
                    <MaintenanceOverlay
                        enabled={maintenance.enabled}
                        message={maintenance.message}
                        eta={maintenance.eta}
                    />
                    <LazyMotion features={domAnimation}>
                    <HashRouter>
                        <CommandPalette />
                        <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/share/:token" element={<SharedChatView />} />

                            <Route
                                path="/:sessionId?"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <ErrorBoundary>
                                                <Chat />
                                            </ErrorBoundary>
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/code"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <CodeAgent />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/rag"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <RAG />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/image"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <ImageGen />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/snippets"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <Snippets />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin"
                                element={
                                    <AdminRoute>
                                        <DashboardLayout>
                                            <Admin />
                                        </DashboardLayout>
                                    </AdminRoute>
                                }
                            />
                        </Routes>
                        </Suspense>
                    </HashRouter>
                    </LazyMotion>
                    </AuthProvider>
                </div>
                <ToastProvider />
            </ThemeProvider>
        </GoogleOAuthProvider>
    );
}

export default App;
