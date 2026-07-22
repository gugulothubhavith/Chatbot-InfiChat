import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/Layout';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, RefreshCcw, Siren, Lock, Unlock, Users, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const DEFCON_LEVELS = [
    { level: 5, label: 'NORMAL OPS', color: '#10b981', bg: 'rgba(16,185,129,0.1)', desc: 'All systems nominal. Standard operations.' },
    { level: 4, label: 'INCREASED READINESS', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', desc: 'Elevated monitoring. Above-normal activity detected.' },
    { level: 3, label: 'ROUND-THE-CLOCK WATCH', color: '#eab308', bg: 'rgba(234,179,8,0.1)', desc: 'Force readiness above normal. All hands on deck.' },
    { level: 2, label: 'CRITICAL THREAT', color: '#f97316', bg: 'rgba(249,115,22,0.1)', desc: 'Next step to nuclear. Imminent hostile action.' },
    { level: 1, label: 'MAXIMUM FORCE', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', desc: 'Maximum readiness. All resources mobilized. Emergency lockdown.' },
];

// CRT scanline overlay
function CRTOverlay() {
    return (
        <div className="fixed inset-0 pointer-events-none z-50" style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)',
            mixBlendMode: 'multiply',
        }} />
    );
}

// Pulsing red border
function EmergencyBorder({ active }: { active: boolean }) {
    if (!active) return null;
    return (
        <m.div
            className="fixed inset-0 pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{ boxShadow: 'inset 0 0 80px rgba(239,68,68,0.6), inset 0 0 200px rgba(239,68,68,0.2)' }}
        />
    );
}

export default function DefconControls() {
    const { token } = useAuth();
    const [currentLevel, setCurrentLevel] = useState(5);
    const [pendingActions, setPendingActions] = useState<any[]>([]);
    const [feedback, setFeedback] = useState('');
    const [confirming, setConfirming] = useState<number | null>(null);
    const [sirenActive, setSirenActive] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);

    const fetchPending = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/admin-security/two-person/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingActions(res.data || []);
        } catch { setPendingActions([]); }
    };

    useEffect(() => { fetchPending(); }, [token]);

    // Web Audio API siren
    const toggleSiren = useCallback(() => {
        if (sirenActive) {
            oscillatorRef.current?.stop();
            oscillatorRef.current = null;
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
            setSirenActive(false);
            return;
        }
        try {
            const ctx = new AudioContext();
            audioCtxRef.current = ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            // Siren sweep
            const sweepUp = () => {
                osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
                osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.0);
                if (audioCtxRef.current?.state === 'running') setTimeout(sweepUp, 1000);
            };
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            oscillatorRef.current = osc;
            sweepUp();
            setSirenActive(true);
        } catch { /* Audio not supported */ }
    }, [sirenActive]);

    useEffect(() => {
        return () => {
            oscillatorRef.current?.stop();
            audioCtxRef.current?.close();
        };
    }, []);

    const activateLevel = async (level: number) => {
        if (level <= 2 && confirming !== level) {
            setConfirming(level);
            setFeedback(`⚠️ DEFCON ${level} requires TWO-PERSON AUTHORIZATION. Click again to confirm.`);
            return;
        }
        setConfirming(null);

        try {
            if (level <= 2) {
                await axios.post(`${API}/admin-security/kill-switch`, {
                    level,
                    action: level === 1 ? 'FULL_LOCKDOWN' : 'ELEVATED_THREAT'
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            setCurrentLevel(level);
            setFeedback(`DEFCON ${level} ACTIVATED — ${DEFCON_LEVELS.find(d => d.level === level)?.label}`);
            if (level === 1 && !sirenActive) toggleSiren();
            if (level > 2 && sirenActive) toggleSiren();
        } catch (err: any) {
            setFeedback(err.response?.data?.detail || 'Authorization failed');
        }
    };

    const isEmergency = currentLevel <= 2;
    const currentDef = DEFCON_LEVELS.find(d => d.level === currentLevel)!;

    return (
        <Layout>
            {isEmergency && <CRTOverlay />}
            <EmergencyBorder active={currentLevel === 1} />

            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <AlertTriangle className="w-7 h-7" style={{ color: currentDef.color }} /> DEFCON Response System
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Emergency lockdown with two-person authorization & audio-visual alerts.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isEmergency && (
                            <button onClick={toggleSiren} className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-bold text-red-500 transition-colors">
                                {sirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                {sirenActive ? 'Mute Siren' : 'Sound Siren'}
                            </button>
                        )}
                        <button onClick={fetchPending} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                            <RefreshCcw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {feedback && (
                    <m.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg text-sm font-bold border"
                        style={{ background: currentDef.bg, borderColor: currentDef.color + '40', color: currentDef.color }}>
                        {feedback}
                    </m.div>
                )}

                {/* Current DEFCON Status */}
                <m.div
                    className="admin-card p-6 text-center border-2 overflow-hidden relative"
                    style={{ borderColor: currentDef.color + '50', background: currentDef.bg }}
                    animate={currentLevel === 1 ? { scale: [1, 1.005, 1] } : {}}
                    transition={currentLevel === 1 ? { repeat: Infinity, duration: 1.0 } : {}}
                >
                    {currentLevel === 1 && (
                        <div className="absolute inset-0 pointer-events-none" style={{
                            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(239,68,68,0.03) 3px, rgba(239,68,68,0.03) 4px)',
                        }} />
                    )}
                    <div className="text-8xl font-black mb-2" style={{ color: currentDef.color, textShadow: `0 0 40px ${currentDef.color}40` }}>
                        {currentLevel}
                    </div>
                    <div className="text-xl font-black uppercase tracking-widest" style={{ color: currentDef.color }}>
                        DEFCON {currentLevel} — {currentDef.label}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">{currentDef.desc}</div>
                </m.div>

                {/* DEFCON Level Buttons */}
                <div className="grid grid-cols-5 gap-3">
                    {DEFCON_LEVELS.map(def => (
                        <m.button
                            key={def.level}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => activateLevel(def.level)}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${currentLevel === def.level ? 'shadow-lg' : 'opacity-60 hover:opacity-100'}`}
                            style={{
                                borderColor: currentLevel === def.level ? def.color : def.color + '30',
                                background: currentLevel === def.level ? def.bg : 'transparent',
                                boxShadow: currentLevel === def.level ? `0 0 20px ${def.color}20` : 'none',
                            }}
                        >
                            <div className="text-2xl font-black" style={{ color: def.color }}>{def.level}</div>
                            <div className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: def.color }}>
                                {def.label.split(' ')[0]}
                            </div>
                        </m.button>
                    ))}
                </div>

                {/* Pending Actions */}
                <div className="admin-card">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                        <Users className="w-5 h-5 text-amber-400" /> Pending Two-Person Authorizations ({pendingActions.length})
                    </h3>
                    {pendingActions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No pending authorization requests.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingActions.map((pa: any) => (
                                <div key={pa.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                                    <div>
                                        <div className="font-bold text-sm">{pa.action_type}</div>
                                        <div className="text-xs text-muted-foreground">{pa.requested_by} • {new Date(pa.created_at).toLocaleString()}</div>
                                    </div>
                                    <button className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                        Approve
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </m.div>
        </Layout>
    );
}
