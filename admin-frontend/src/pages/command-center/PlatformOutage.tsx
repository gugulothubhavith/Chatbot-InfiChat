import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, AlertTriangle, Power, Save, Radio, CheckCircle, Activity, Globe, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Layout from '../../components/Layout';

const calculateETA = (minutes: number) => {
    if (minutes === 0) return 'TBD';
    const now = new Date();
    const future = new Date(now.getTime() + minutes * 60000);
    return future.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function PlatformOutage() {
    const { token } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [message, setMessage] = useState('The platform is currently offline for critical maintenance.');
    const [eta, setEta] = useState('--:--:--');
    const [offsetMinutes, setOffsetMinutes] = useState(60);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (!token) return;
        const fetchStatus = async () => {
            try {
                const res = await axios.get(`${API_URL}/admin/system/maintenance`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setEnabled(res.data.enabled);
                setMessage(res.data.message);
                setEta(res.data.eta || '--:--:--');
                setLoading(false);
            } catch (err) {
                console.error("Failed to load maintenance status");
                setLoading(false);
            }
        };
        fetchStatus();
    }, [token]);

    const handleSave = async () => {
        setSaving(true);
        setFeedback('');
        try {
            const res = await axios.post(`${API_URL}/admin/system/maintenance`, {
                enabled,
                message,
                eta
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data.status === 'success') {
                setFeedback(enabled ? 'Maintenance Mode ACTIVATED.' : 'Maintenance Mode DEACTIVATED.');
                setTimeout(() => setFeedback(''), 5000);
            }
        } catch (err: any) {
            setFeedback(`Error: ${err.response?.data?.detail || err.message}`);
        } finally {
            setSaving(false);
        }
    };


    const handleOffsetChange = (min: number) => {
        setOffsetMinutes(min);
        setEta(calculateETA(min));
    };

    const addMinutes = (min: number) => {
        const newTotal = offsetMinutes + min;
        handleOffsetChange(Math.min(newTotal, 480));
    };

    if (loading) return <div className="p-8">Loading configuration...</div>;

    return (
        <Layout>
            <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="w-8 h-8 text-red-500" />
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Global Platform Outage (Maintenance)</h1>
            </div>

            <p className="text-muted-foreground mb-8">
                This master control switch physically powers down the entire consumer frontend globally. 
                When activated, any user without Command Center access will instantly be redirected 
                and locked into a "System Offline" maintenance screen.
            </p>

            <div className={`admin-card transition-all duration-500 ${enabled ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)] bg-red-500/5' : ''}`}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-border pb-3">
                    <Power className={`w-5 h-5 ${enabled ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} /> Master Maintenance Switch
                </h3>
                
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Toggle Control */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center p-6 bg-background rounded-xl border border-border shadow-inner">
                        <div className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-widest text-center">System Power Status</div>
                        
                        <button
                            onClick={() => setEnabled(!enabled)}
                            className={`relative w-24 h-12 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${enabled ? 'bg-red-500 focus:ring-red-500' : 'bg-green-500 focus:ring-green-500'}`}
                        >
                            <span className={`absolute left-1 top-1 w-10 h-10 bg-white rounded-full transition-transform duration-300 shadow-md ${enabled ? 'translate-x-12' : 'translate-x-0'}`} />
                        </button>
                        
                        <div className={`mt-4 font-black tracking-widest text-lg ${enabled ? 'text-red-500' : 'text-green-500'}`}>
                            {enabled ? 'OFFLINE' : 'ONLINE'}
                        </div>
                    </div>

                    {/* Form Controls */}
                    <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                Public Facing Maintenance Message
                            </label>
                            <textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={4}
                                disabled={saving}
                                className="w-full bg-background border border-border rounded-lg text-sm p-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-medium"
                                placeholder="E.g., The system is currently undergoing scheduled maintenance..."
                            />
                            <p className="text-xs text-muted-foreground">This message will be prominently displayed over the lock screen for all affected active users.</p>
                        </div>

                        <div className="space-y-4 p-4 bg-background border border-border rounded-xl shadow-inner group/eta">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    Estimated Restoration Time (ETA)
                                </label>
                                <div className="text-xl font-black text-blue-500 font-mono tracking-tighter">
                                    {eta}
                                </div>
                            </div>

                            {/* Relative Slider */}
                            <div className="space-y-3">
                                <input 
                                    type="range"
                                    min="0"
                                    max="480"
                                    step="15"
                                    value={offsetMinutes}
                                    onChange={(e) => handleOffsetChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-1">
                                    <span>TBD</span>
                                    <span>2h</span>
                                    <span>4h</span>
                                    <span>6h</span>
                                    <span>8h</span>
                                </div>
                            </div>

                            {/* Presets */}
                            <div className="flex flex-wrap gap-2">
                                {[15, 30, 60, 120, 240].map((min) => (
                                    <button
                                        key={min}
                                        onClick={() => addMinutes(min)}
                                        className="px-3 py-1.5 rounded-md border border-border bg-background hover:border-blue-500 hover:text-blue-500 transition-all text-[10px] font-bold"
                                    >
                                        +{min >= 60 ? `${min/60}h` : `${min}m`}
                                    </button>
                                ))}
                                <button
                                    onClick={() => { setOffsetMinutes(0); setEta('TBD'); }}
                                    className="px-3 py-1.5 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all text-[10px] font-bold ml-auto"
                                >
                                    RESET (TBD)
                                </button>
                            </div>

                            <div className="pt-2">
                                <input 
                                    type="text"
                                    value={eta}
                                    onChange={(e) => setEta(e.target.value)}
                                    disabled={saving}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-lg text-[11px] p-2 focus:outline-none focus:border-blue-500 font-mono text-muted-foreground"
                                    placeholder="Manual Override (e.g., TBD, 4:00 PM)"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 italic">Slide to adjust relative time or click presets to add duration. Manual override supported.</p>
                        </div>

                        <div className="pt-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                            {feedback ? (
                                <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${feedback.includes('Error') ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'bg-green-500/10 text-green-500 border border-green-500/30'}`}>
                                    {feedback.includes('Error') ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    {feedback}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-1">
                                    <Activity className="w-4 h-4" /> Changes apply instantly to all live connections via WebSocket.
                                </div>
                            )}

                            <button 
                                onClick={handleSave} 
                                disabled={saving}
                                className={`w-full md:w-auto px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {saving ? (
                                    <Radio className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Globe className="w-4 h-4" />
                                )}
                                {saving ? 'Dispatching Protocol...' : enabled ? 'Drop Master Switch (Execute Outage)' : 'Restore Platform (Bring Online)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Advanced Live Preview - Mission Control Monitor Style */}
            <div className="mt-12 group">
                <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                        <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
                        Live Endpoint Status: {enabled ? 'CRITICAL LOCKDOWN' : 'OPERATIONAL'}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground opacity-50">
                        MONITOR_ID: FE-OUTAGE-01 // RENDER_MODE: CRT_EMULATION
                    </div>
                </div>

                <div className={`relative rounded-3xl overflow-hidden border-8 border-slate-900 shadow-2xl transition-all duration-700 ${enabled ? 'ring-4 ring-red-500/30' : 'ring-4 ring-slate-800/10'}`}>
                    {/* Screen Glass Effect */}
                    <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-tr from-white/5 to-transparent opacity-20" />
                    <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
                    
                    {/* CRT Scanline Effect */}
                    <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.03] overflow-hidden">
                        {[...Array(40)].map((_, i) => (
                            <div key={i} className="h-px w-full bg-white mb-[3px]" />
                        ))}
                    </div>

                    <div className="bg-[#050505] min-h-[400px] p-8 md:p-16 flex flex-col items-center justify-center text-center relative">
                        {/* Background Pulsing HUD Element */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000 ${enabled ? 'bg-red-500/10' : 'bg-blue-500/5'}`} />

                        <div className="relative z-10 space-y-8 max-w-2xl">
                            <div className="relative inline-block group-hover:scale-110 transition-transform duration-500">
                                <AlertTriangle className={`w-20 h-20 mx-auto transition-colors duration-500 ${enabled ? 'text-red-500 animate-pulse' : 'text-gray-800'}`} />
                                {enabled && (
                                    <div className="absolute inset-0 -z-10 bg-red-500 blur-2xl opacity-20 scale-150 animate-pulse" />
                                )}
                            </div>

                            <div className="space-y-4">
                                <h2 className={`text-4xl md:text-6xl font-black tracking-tighter transition-all duration-500 ${enabled ? 'text-white' : 'text-gray-800'}`}>
                                    {enabled ? 'SYSTEM ' : 'PORTAL '}
                                    <span className={enabled ? 'text-red-500 underline decoration-red-500/30 underline-offset-8' : 'text-gray-800'}>
                                        {enabled ? 'OFFLINE' : 'ONLINE'}
                                    </span>
                                </h2>
                                
                                <div className={`flex items-center justify-center gap-4 transition-opacity duration-500 ${enabled ? 'opacity-100' : 'opacity-20'}`}>
                                    <div className="h-px w-12 bg-red-500/50" />
                                    <div className="text-[10px] font-mono font-bold text-red-500 tracking-[0.3em] uppercase">Security Protocol 99-X</div>
                                    <div className="h-px w-12 bg-red-500/50" />
                                </div>
                            </div>

                            <div className={`p-6 rounded-2xl border transition-all duration-700 ${enabled ? 'bg-red-500/5 border-red-500/30' : 'bg-gray-900/10 border-gray-800'}`}>
                                <p className={`text-lg md:text-xl font-medium leading-relaxed italic transition-colors duration-500 ${enabled ? 'text-gray-300' : 'text-gray-800'}`}>
                                    "{message}"
                                </p>
                            </div>

                            <div className={`flex flex-col items-center gap-4 transition-all duration-700 ${enabled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-gray-800">
                                        RESTO_ETA: {eta}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-gray-800">
                                        SEC_LEVEL: ALPHA-6
                                    </div>
                                </div>
                                <p className="text-[10px] max-w-sm text-gray-500 uppercase tracking-widest leading-loose">
                                    This terminal session is automatically refreshing. Status monitor is active. 
                                    Do not attempt to bypass this protocol.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monitor Controls (Visual Detail) */}
                <div className="flex justify-center gap-12 mt-4 px-8 opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <div className="w-6 h-1 bg-slate-800 rounded-full" />
                    </div>
                    <div className="flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        <div className="w-6 h-1 bg-slate-800 rounded-full" />
                    </div>
                    <div className="flex gap-1.5 items-center">
                        <div className="w-3 h-3 rounded-full border border-slate-700 flex items-center justify-center">
                            <div className="w-1 h-1 bg-slate-700 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </Layout>
    );
}

