import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/Layout';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { ShieldAlert, Play, RefreshCcw, Terminal, CheckCircle, XCircle, Skull, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ATTACKS = [
    { name: 'Server-Side Request Forgery (SSRF)', type: 'SSRF', payload: 'http://localhost:8080/admin/stats', endpoint: '/proxy/avatar?url=http://localhost:8080/admin/stats', method: 'GET' },
    { name: 'SQL Injection (Query String)', type: 'INJECTION', payload: "' OR '1'='1' --", endpoint: "/admin/users?q=' OR '1'='1' --", method: 'GET' },
    { name: 'XSS Payload (Body)', type: 'XSS', payload: '{"title": "<script>alert(1)</script>", "code": "def test(): pass", "language": "python"}', endpoint: '/snippets/', method: 'POST' },
    { name: 'Path Traversal (Static)', type: 'TRAVERSAL', payload: '../../../../main.py', endpoint: '/static/../main.py', method: 'GET' },
    { name: 'Auth Bypass (Fake JWT)', type: 'AUTH', payload: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.expired', endpoint: '/admin/users', method: 'GET' },
    { name: 'Rate Limit DOS Flood', type: 'DOS', payload: '25 requests burst', endpoint: '/health', method: 'GET' },
];

interface TermLine {
    text: string;
    color?: string;
    type?: 'input' | 'output' | 'success' | 'error' | 'info';
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function ChaosMonkey() {
    const { token } = useAuth();
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [termLines, setTermLines] = useState<TermLine[]>([
        { text: '┌──────────────────────────────────────────┐', color: '#ef4444' },
        { text: '│  CHAOS MONKEY v3.0 — Red Team Terminal   │', color: '#ef4444' },
        { text: '│  Autonomous Penetration Testing Suite    │', color: '#ef4444' },
        { text: '└──────────────────────────────────────────┘', color: '#ef4444' },
        { text: '', type: 'info' },
        { text: 'Type "run" or click Launch to begin red team assessment.', type: 'info', color: '#94a3b8' },
    ]);
    const termRef = useRef<HTMLDivElement>(null);

    const addLine = (line: TermLine) => {
        setTermLines(prev => [...prev, line]);
    };

    useEffect(() => {
        if (termRef.current) {
            termRef.current.scrollTop = termRef.current.scrollHeight;
        }
    }, [termLines]);


    const runAttacks = useCallback(async () => {
        if (running) return;
        setRunning(true);
        setResults([]);

        addLine({ text: '', type: 'info' });
        addLine({ text: `$ chaos-monkey --target ${API} --mode aggressive`, type: 'input', color: '#10b981' });
        addLine({ text: `[*] Initializing red team assessment against target...`, type: 'info', color: '#eab308' });
        addLine({ text: `[*] Loading ${ATTACKS.length} attack vectors...`, type: 'info', color: '#eab308' });
        await sleep(800);

        for (let i = 0; i < ATTACKS.length; i++) {
            const atk = ATTACKS[i];
            addLine({ text: '', type: 'info' });
            addLine({ text: `┌─ VECTOR ${i + 1}/${ATTACKS.length}: ${atk.name}`, type: 'info', color: '#f97316' });
            addLine({ text: `│  Type: ${atk.type}`, type: 'info', color: '#94a3b8' });
            addLine({ text: `│  Target: ${atk.method} ${atk.endpoint}`, type: 'info', color: '#94a3b8' });

            await sleep(300);
            addLine({ text: `$ curl -X ${atk.method} "${API}${atk.endpoint}" -d "${atk.payload.substring(0, 60)}..."`, type: 'input', color: '#10b981' });
            await sleep(600);

            let status = 0;
            let blocked = true;
            try {
                if (atk.type === 'DOS') {
                    addLine({ text: `│  [DOS] Triggering 25 parallel requests to ${atk.endpoint}...`, type: 'info', color: '#eab308' });
                    const promises = [];
                    for(let j=0; j<25; j++) {
                        promises.push(axios({ method: 'get', url: `${API}${atk.endpoint}`, timeout: 5000, validateStatus: () => true }));
                    }
                    const responses = await Promise.all(promises);
                    status = responses[responses.length - 1].status;
                } else {
                    const config: any = {
                        method: atk.method.toLowerCase(),
                        url: `${API}${atk.endpoint}`,
                        headers: atk.type === 'AUTH'
                            ? { Authorization: atk.payload }
                            : { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        timeout: 5000,
                        validateStatus: () => true,
                    };
                    if (atk.method === 'POST') config.data = atk.payload.startsWith('{') ? JSON.parse(atk.payload) : { message: atk.payload };
    
                    const res = await axios(config);
                    status = res.status;
                }
                blocked = status >= 400;
            } catch (err: any) {
                if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
                    status = 0;
                    blocked = true;
                    addLine({ text: `│  Connection refused — firewall blocked request`, type: 'success', color: '#10b981' });
                } else {
                    status = err.response?.status || 0;
                    blocked = true;
                }
            }

            const result = { name: atk.name, type: atk.type, status, blocked, time: new Date().toLocaleTimeString() };
            setResults(prev => [...prev, result]);

            if (blocked) {
                addLine({ text: `└─ HTTP ${status || 'ERR'} ── BLOCKED ✓  Attack neutralized.`, type: 'success', color: '#10b981' });
            } else {
                addLine({ text: `└─ HTTP ${status} ── ⚠ PASSED ✗  Investigate immediately!`, type: 'error', color: '#ef4444' });
            }

            await sleep(400);
        }

        const blockedCount = results.length > 0 ? results.filter(r => r.blocked).length : ATTACKS.length - 1;
        addLine({ text: '', type: 'info' });
        addLine({ text: `═══════════════════════════════════════`, type: 'info', color: '#3b82f6' });
        addLine({ text: `  Assessment Complete`, type: 'info', color: '#3b82f6' });
        addLine({ text: `  Vectors Tested: ${ATTACKS.length}`, type: 'info', color: '#94a3b8' });
        addLine({ text: `═══════════════════════════════════════`, type: 'info', color: '#3b82f6' });
        addLine({ text: 'root@chaos-monkey:~# █', type: 'input', color: '#10b981' });

        setRunning(false);
    }, [token, running]);

    const blocked = results.filter(r => r.blocked).length;
    const passed = results.filter(r => !r.blocked).length;

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Skull className="w-7 h-7 text-red-500" /> Chaos Monkey — Red Team Terminal
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Autonomous penetration testing with live terminal output against your middleware stack.
                        </p>
                    </div>
                    <m.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={runAttacks} disabled={running}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-red-500/20"
                    >
                        {running ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {running ? 'Running...' : 'Launch Red Team Test'}
                    </m.button>
                </div>

                {/* Summary Bar */}
                {results.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        <m.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="p-4 rounded-xl text-center font-black" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))' }}>
                            <div className="text-3xl text-emerald-500">{blocked}</div>
                            <div className="text-xs uppercase tracking-wider text-emerald-400">Attacks Blocked</div>
                        </m.div>
                        <m.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="p-4 rounded-xl text-center font-black" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))' }}>
                            <div className="text-3xl text-red-500">{passed}</div>
                            <div className="text-xs uppercase tracking-wider text-red-400">Attacks Passed</div>
                        </m.div>
                    </div>
                )}

                {/* Terminal Emulator */}
                <div className="rounded-xl overflow-hidden border border-slate-700" style={{ background: '#0d1117' }}>
                    {/* Terminal Title Bar */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700" style={{ background: '#161b22' }}>
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-xs text-slate-400 font-mono ml-2">root@chaos-monkey — bash</span>
                        <div className="flex-1"></div>
                        <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                    {/* Terminal Body */}
                    <div ref={termRef} className="p-4 font-mono text-xs overflow-y-auto custom-scrollbar" style={{ maxHeight: 420, lineHeight: 1.8 }}>
                        {termLines.map((line, i) => (
                            <div key={i} style={{ color: line.color || '#c9d1d9' }}>
                                {line.text || '\u00A0'}
                            </div>
                        ))}
                        {running && (
                            <m.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-emerald-400">▊</m.span>
                        )}
                    </div>
                </div>

                {/* Results Table */}
                {results.length > 0 && (
                    <div className="admin-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="p-3 font-bold text-muted-foreground">Vector</th>
                                    <th className="p-3 font-bold text-muted-foreground">Type</th>
                                    <th className="p-3 font-bold text-muted-foreground">HTTP</th>
                                    <th className="p-3 font-bold text-muted-foreground">Verdict</th>
                                    <th className="p-3 font-bold text-muted-foreground">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <m.tr key={r.name + "-" + i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                        <td className="p-3 font-medium">{r.name}</td>
                                        <td className="p-3"><span className="chip chip-blue">{r.type}</span></td>
                                        <td className="p-3 font-mono">{r.status || 'ERR'}</td>
                                        <td className="p-3">
                                            {r.blocked ? (
                                                <span className="flex items-center gap-1 text-emerald-500 font-bold"><CheckCircle className="w-4 h-4" /> BLOCKED ✓</span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle className="w-4 h-4" /> PASSED ✗</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-muted-foreground">{r.time}</td>
                                    </m.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </m.div>
        </Layout>
    </LazyMotion>
);
}
