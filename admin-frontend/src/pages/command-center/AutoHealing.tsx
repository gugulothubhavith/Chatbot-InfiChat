import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Server, RefreshCcw, Terminal, Play, CheckCircle, XCircle, AlertTriangle, Wrench } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface TermLine {
    text: string;
    color?: string;
}

export default function AutoHealing() {
    const { token } = useAuth();
    const [health, setHealth] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const [termLines, setTermLines] = useState<TermLine[]>([
        { text: '╔══════════════════════════════════════════╗', color: '#3b82f6' },
        { text: '║  AUTO-HEAL DAEMON v3.0 — Diagnostics     ║', color: '#3b82f6' },
        { text: '╚══════════════════════════════════════════╝', color: '#3b82f6' },
        { text: '' },
        { text: 'Waiting for diagnostic scan...', color: '#94a3b8' },
    ]);
    const termRef = useRef<HTMLDivElement>(null);

    const addLine = (line: TermLine) => setTermLines(prev => [...prev, line]);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, [termLines]);

    const fetchHealth = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } });
            setHealth(res.data);
            return res.data;
        } catch (err) { console.error(err); return null; }
    };

    useEffect(() => { fetchHealth(); }, [token]);
    useEffect(() => { const i = setInterval(fetchHealth, 15000); return () => clearInterval(i); }, [token]);

    const runDiagnostics = useCallback(async () => {
        if (scanning) return;
        setScanning(true);

        addLine({ text: '' });
        addLine({ text: '$ autoheal --scan --verbose --repair', color: '#10b981' });
        addLine({ text: '[*] Starting comprehensive diagnostics...', color: '#eab308' });
        await sleep(500);

        // Step 1: Health check
        addLine({ text: '' });
        addLine({ text: '─── Phase 1: Service Health Probe ───', color: '#3b82f6' });
        await sleep(300);

        const h = await fetchHealth();
        if (h) {
            for (const [name, svc] of Object.entries(h.services || {})) {
                await sleep(400);
                const s = (svc as any).status;
                if (s === 'healthy') {
                    addLine({ text: `  ✓ ${name.padEnd(15)} HEALTHY`, color: '#10b981' });
                } else {
                    addLine({ text: `  ✗ ${name.padEnd(15)} ${s?.toUpperCase()} — Attempting repair...`, color: '#ef4444' });
                    await sleep(800);
                    // Attempt restart
                    try {
                        await axios.post(`${API}/admin/system/restart-service`, { service: name }, { headers: { Authorization: `Bearer ${token}` } });
                        addLine({ text: `    └─ Restart signal sent to '${name}'`, color: '#eab308' });
                    } catch (err: any) {
                        addLine({ text: `    └─ Repair requires Super Admin: ${err.response?.data?.detail || 'Access denied'}`, color: '#f97316' });
                    }
                }
            }

            // Step 2: Hardware
            addLine({ text: '' });
            addLine({ text: '─── Phase 2: Hardware Diagnostics ───', color: '#3b82f6' });
            await sleep(300);
            addLine({ text: `  CPU Usage:    ${h.hardware?.cpu_percent}%`, color: h.hardware?.cpu_percent > 80 ? '#ef4444' : '#10b981' });
            addLine({ text: `  RAM Usage:    ${h.hardware?.ram_percent}%`, color: h.hardware?.ram_percent > 80 ? '#ef4444' : '#10b981' });
            await sleep(300);

            if (h.hardware?.cpu_percent > 80) {
                addLine({ text: '  ⚠ HIGH CPU — Recommending load balancing', color: '#f97316' });
            }
            if (h.hardware?.ram_percent > 80) {
                addLine({ text: '  ⚠ HIGH RAM — Recommending cache flush', color: '#f97316' });
            }

            // Step 3: Network
            addLine({ text: '' });
            addLine({ text: '─── Phase 3: Network Connectivity ───', color: '#3b82f6' });
            await sleep(300);
            try {
                const pingStart = Date.now();
                await axios.get(`${API}/health`);
                const latency = Date.now() - pingStart;
                addLine({ text: `  ✓ Backend API    ${latency}ms latency`, color: latency > 500 ? '#f97316' : '#10b981' });
            } catch {
                addLine({ text: `  ✗ Backend API    UNREACHABLE`, color: '#ef4444' });
            }
        }

        addLine({ text: '' });
        addLine({ text: '═══════════════════════════════════════', color: '#3b82f6' });
        addLine({ text: '  Diagnostic scan complete.', color: '#3b82f6' });
        addLine({ text: '═══════════════════════════════════════', color: '#3b82f6' });
        addLine({ text: 'root@autoheal:~# █', color: '#10b981' });

        setScanning(false);
    }, [token, scanning]);

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Wrench className="w-7 h-7 text-teal-500" /> Auto-Healing Diagnostics Terminal
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Self-repairing infrastructure with live terminal diagnostics & auto-restart.
                        </p>
                    </div>
                    <m.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={runDiagnostics} disabled={scanning}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-teal-500/20">
                        {scanning ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {scanning ? 'Scanning...' : 'Run Diagnostics'}
                    </m.button>
                </div>

                {/* Live Service Status */}
                {health && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(health.services || {}).map(([name, svc]: [string, any]) => (
                            <m.div key={name} whileHover={{ scale: 1.03 }} className="p-3 rounded-xl border text-center"
                                style={{
                                    borderColor: svc.status === 'healthy' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                                    background: svc.status === 'healthy' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                                }}>
                                {svc.status === 'healthy' ? <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-500" /> : <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />}
                                <div className="text-sm font-bold capitalize">{name}</div>
                                <div className="text-[10px] uppercase font-bold" style={{ color: svc.status === 'healthy' ? '#10b981' : '#ef4444' }}>{svc.status}</div>
                            </m.div>
                        ))}
                    </div>
                )}

                {/* Terminal Emulator */}
                <div className="rounded-xl overflow-hidden border border-slate-700" style={{ background: '#0d1117' }}>
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700" style={{ background: '#161b22' }}>
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-xs text-slate-400 font-mono ml-2">root@autoheal — diagnostics</span>
                        <div className="flex-1"></div>
                        <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div ref={termRef} className="p-4 font-mono text-xs overflow-y-auto custom-scrollbar" style={{ maxHeight: 400, lineHeight: 1.8 }}>
                        {termLines.map((line, i) => (
                            <div key={i} style={{ color: line.color || '#c9d1d9' }}>
                                {line.text || '\u00A0'}
                            </div>
                        ))}
                        {scanning && (
                            <m.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-teal-400">▊</m.span>
                        )}
                    </div>
                </div>
            </m.div>
        </Layout>
    );
}
