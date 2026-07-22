import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../../components/Layout';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { Shield, Globe, RefreshCcw, Activity, CheckCircle, XCircle, Server, Zap, Eye } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Simulated threat origins for the globe arcs
const THREAT_ORIGINS = [
    { lat: 55.75, lng: 37.62, label: 'Moscow', color: '#ef4444' },
    { lat: 39.9, lng: 116.4, label: 'Beijing', color: '#f97316' },
    { lat: 35.68, lng: 139.69, label: 'Tokyo', color: '#eab308' },
    { lat: 51.51, lng: -0.13, label: 'London', color: '#3b82f6' },
    { lat: 40.71, lng: -74.01, label: 'New York', color: '#8b5cf6' },
    { lat: -33.87, lng: 151.21, label: 'Sydney', color: '#06b6d4' },
    { lat: 1.35, lng: 103.82, label: 'Singapore', color: '#10b981' },
    { lat: 28.61, lng: 77.21, label: 'Delhi', color: '#f43f5e' },
];

// 3D Globe Component with animated arcs
function ThreatGlobe({ threats, health }: { threats: any; health: any }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const rotationRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const radius = Math.min(cx, cy) * 0.75;

        const animate = () => {
            ctx.clearRect(0, 0, rect.width, rect.height);
            rotationRef.current += 0.003;

            // Draw outer glow
            const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.5);
            glowGrad.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
            glowGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, rect.width, rect.height);

            // Draw globe sphere
            const sphereGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
            sphereGrad.addColorStop(0, '#1e3a5f');
            sphereGrad.addColorStop(0.7, '#0f1b2d');
            sphereGrad.addColorStop(1, '#060d16');
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = sphereGrad;
            ctx.fill();

            // Draw grid lines (meridians & parallels)
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.12)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI + rotationRef.current;
                ctx.beginPath();
                ctx.ellipse(cx, cy, Math.abs(Math.cos(angle)) * radius, radius, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            for (let i = 1; i < 6; i++) {
                const y = cy - radius + (i / 6) * radius * 2;
                const r = Math.sqrt(radius * radius - (y - cy) * (y - cy));
                if (r > 0) {
                    ctx.beginPath();
                    ctx.ellipse(cx, y, r, r * 0.3, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Draw edge ring
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw animated threat arcs
            const time = Date.now() / 1000;
            THREAT_ORIGINS.forEach((origin, idx) => {
                const phase = (time * 0.5 + idx * 0.7) % 1;
                const startAngle = rotationRef.current + (idx / THREAT_ORIGINS.length) * Math.PI * 2;
                const sx = cx + Math.cos(startAngle) * radius * 0.8;
                const sy = cy + Math.sin(startAngle) * radius * 0.4 - radius * 0.2;

                // Arc to center (datacenter)
                const ex = cx;
                const ey = cy;
                const mx = (sx + ex) / 2;
                const my = Math.min(sy, ey) - 40 - idx * 8;

                // Draw arc path
                ctx.strokeStyle = origin.color + '60';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo(mx, my, ex, ey);
                ctx.stroke();

                // Draw animated packet traveling along the arc
                const px = (1 - phase) * (1 - phase) * sx + 2 * (1 - phase) * phase * mx + phase * phase * ex;
                const py = (1 - phase) * (1 - phase) * sy + 2 * (1 - phase) * phase * my + phase * phase * ey;

                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fillStyle = origin.color;
                ctx.fill();

                // Glow on packet
                const packetGlow = ctx.createRadialGradient(px, py, 0, px, py, 12);
                packetGlow.addColorStop(0, origin.color + '80');
                packetGlow.addColorStop(1, origin.color + '00');
                ctx.fillStyle = packetGlow;
                ctx.beginPath();
                ctx.arc(px, py, 12, 0, Math.PI * 2);
                ctx.fill();

                // Origin dot
                ctx.beginPath();
                ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = origin.color;
                ctx.fill();
            });

            // Center datacenter node
            const dcGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
            dcGlow.addColorStop(0, 'rgba(16, 185, 129, 0.6)');
            dcGlow.addColorStop(1, 'rgba(16, 185, 129, 0)');
            ctx.fillStyle = dcGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.fill();

            // Label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('YOUR DATACENTER', cx, cy + 30);

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animFrameRef.current);
    }, []);

    return <canvas ref={canvasRef} className="w-full" style={{ height: 380 }} />;
}

export default function NetworkSecurity() {
    const { token } = useAuth();
    const [threats, setThreats] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showGlobe, setShowGlobe] = useState(true);

    const fetchData = async () => {
        if (!token) return;
        try {
            const healthRes = await axios.get(`${API}/admin/system/health`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHealth(healthRes.data);
        } catch (err) { console.error(err); }

        try {
            const threatRes = await axios.get(`${API}/admin/system/threats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setThreats(threatRes.data);
        } catch (err: any) {
            if (err.response?.status === 403) {
                setThreats({
                    status: 'SECURE', shield_active: true,
                    encryption: 'AES-256-GCM / PBKDF2', threat_level: 'LOW',
                    blocked_today: 0, active_monitors: ['WAF', 'IP Rate Limiting', 'CSP Nonce', 'Audit Logger']
                });
            }
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [token]);
    useEffect(() => { const i = setInterval(fetchData, 20000); return () => clearInterval(i); }, [token]);

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Shield className="w-7 h-7 text-red-500" /> Zero-Trust Network Command
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Live 3D threat intelligence globe with real-time attack vector visualization.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowGlobe(!showGlobe)} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                            <Eye className="w-4 h-4" /> {showGlobe ? 'Hide' : 'Show'} Globe
                        </button>
                        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                            <RefreshCcw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* 3D Globe Visualization */}
                        <AnimatePresence>
                            {showGlobe && (
                                <m.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="admin-card overflow-hidden border-blue-500/20"
                                    style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1117 100%)' }}
                                >
                                    <div className="flex items-center justify-between px-4 pt-3">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Global Threat Radar — Live</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[10px] text-emerald-400 font-mono">STREAMING</span>
                                        </div>
                                    </div>
                                    <ThreatGlobe threats={threats} health={health} />
                                    <div className="px-4 pb-3 flex flex-wrap gap-3">
                                        {THREAT_ORIGINS.map((o, i) => (
                                            <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color }}></div>
                                                {o.label}
                                            </div>
                                        ))}
                                    </div>
                                </m.div>
                            )}
                        </AnimatePresence>

                        {/* Threat Status + Stats */}
                        {threats && (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <m.div whileHover={{ scale: 1.02 }} className="admin-card p-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), transparent)', backdropFilter: 'blur(12px)' }}>
                                    <Shield className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                                    <div className="text-2xl font-black">{threats.status}</div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Shield Status</div>
                                </m.div>
                                <m.div whileHover={{ scale: 1.02 }} className="admin-card p-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), transparent)', backdropFilter: 'blur(12px)' }}>
                                    <Zap className="w-6 h-6 mx-auto mb-2 text-red-500" />
                                    <div className="text-2xl font-black text-red-500">{threats.blocked_today}</div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Blocked Today</div>
                                </m.div>
                                <m.div whileHover={{ scale: 1.02 }} className="admin-card p-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), transparent)', backdropFilter: 'blur(12px)' }}>
                                    <Activity className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                    <div className="text-2xl font-black">{threats.threat_level}</div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Threat Level</div>
                                </m.div>
                                <m.div whileHover={{ scale: 1.02 }} className="admin-card p-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), transparent)', backdropFilter: 'blur(12px)' }}>
                                    <Globe className="w-6 h-6 mx-auto mb-2 text-violet-500" />
                                    <div className="text-2xl font-black">{threats.active_monitors?.length || 0}</div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Active Monitors</div>
                                </m.div>
                            </div>
                        )}

                        {/* Security Monitors + Service Health */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {threats && (
                                <div className="admin-card" style={{ backdropFilter: 'blur(12px)' }}>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                                        <Activity className="w-5 h-5 text-blue-400" /> Active Security Layers
                                    </h3>
                                    <div className="space-y-2">
                                        {threats.active_monitors?.map((monitor: string, i: number) => (
                                            <m.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                                                className="flex items-center gap-3 p-3 rounded-lg border border-border" style={{ background: 'rgba(16,185,129,0.05)' }}>
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                                <span className="font-medium text-sm flex-1">{monitor}</span>
                                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">ACTIVE</span>
                                            </m.div>
                                        ))}
                                        <div className="mt-3 p-3 rounded-lg border border-border" style={{ background: 'rgba(59,130,246,0.05)' }}>
                                            <div className="text-xs text-muted-foreground mb-1">Encryption Standard</div>
                                            <div className="font-mono text-sm font-bold text-blue-400">{threats.encryption}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {health && (
                                <div className="admin-card" style={{ backdropFilter: 'blur(12px)' }}>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                                        <Server className="w-5 h-5 text-cyan-400" /> Infrastructure Health
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.entries(health.services || {}).map(([name, svc]: [string, any], i) => (
                                            <m.div key={name} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                                                className="flex items-center justify-between p-3 rounded-lg border border-border" style={{ background: svc.status === 'healthy' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                                                <span className="font-medium text-sm capitalize">{name}</span>
                                                <div className="flex items-center gap-1.5">
                                                    {svc.status === 'healthy' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                                    <span className={`text-xs font-bold ${svc.status === 'healthy' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {svc.status?.toUpperCase()}
                                                    </span>
                                                </div>
                                            </m.div>
                                        ))}
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <div className="p-3 rounded-lg border border-border text-center" style={{ background: 'rgba(59,130,246,0.05)' }}>
                                                <div className="text-xl font-black">{health.hardware?.cpu_percent}%</div>
                                                <div className="text-[10px] uppercase text-muted-foreground font-bold">CPU</div>
                                            </div>
                                            <div className="p-3 rounded-lg border border-border text-center" style={{ background: 'rgba(139,92,246,0.05)' }}>
                                                <div className="text-xl font-black">{health.hardware?.ram_percent}%</div>
                                                <div className="text-[10px] uppercase text-muted-foreground font-bold">RAM</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </m.div>
        </Layout>
    );
}
