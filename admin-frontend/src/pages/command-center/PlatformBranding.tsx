import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Palette, Save, RefreshCcw, Upload, Eye } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function PlatformBranding() {
    const { token } = useAuth();
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    // Branding state
    const [platformName, setPlatformName] = useState('InfiChat');
    const [primaryColor, setPrimaryColor] = useState('#3b82f6');
    const [accentColor, setAccentColor] = useState('#8b5cf6');
    const [nickname, setNickname] = useState('');

    const fetchSettings = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(res.data);
            if (res.data.nickname) setNickname(res.data.nickname);
            if (res.data.accentColor && res.data.accentColor !== 'default') setAccentColor(res.data.accentColor);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSettings(); }, [token]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post(`${API}/settings`, {
                nickname,
                accentColor: accentColor
            }, { headers: { Authorization: `Bearer ${token}` } });
            setFeedback('Branding saved successfully!');
        } catch (err: any) {
            setFeedback(err.response?.data?.detail || 'Save failed');
        }
        setSaving(false);
    };

    // Load from localStorage for platform-specific branding
    useEffect(() => {
        const stored = localStorage.getItem('platform_branding');
        if (stored) {
            const data = JSON.parse(stored);
            if (data.platformName) setPlatformName(data.platformName);
            if (data.primaryColor) setPrimaryColor(data.primaryColor);
        }
    }, []);

    const saveBranding = () => {
        localStorage.setItem('platform_branding', JSON.stringify({ platformName, primaryColor, accentColor }));
        handleSave();
    };

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                        <Palette className="w-7 h-7 text-pink-500" /> Platform White-Labeling Studio
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Customize platform branding. Colors and nickname sync to <code>/settings</code> API.
                    </p>
                </div>

                {feedback && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-500 text-sm">{feedback}</div>}

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Branding Form */}
                        <div className="admin-card border-pink-500/20">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                                <Palette className="w-5 h-5 text-pink-400" /> Brand Configuration
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-1 block">Platform Name</label>
                                    <input type="text" value={platformName} onChange={(e) => setPlatformName(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-pink-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-1 block">AI Nickname (Persona)</label>
                                    <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                                        placeholder="e.g. Nova, Atlas, Jarvis..."
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-pink-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold mb-1 block">Primary Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="w-10 h-10 rounded border-none cursor-pointer" />
                                            <span className="font-mono text-xs">{primaryColor}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold mb-1 block">Accent Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                                                className="w-10 h-10 rounded border-none cursor-pointer" />
                                            <span className="font-mono text-xs">{accentColor}</span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={saveBranding} disabled={saving}
                                    className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                    {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Saving...' : 'Save Branding'}
                                </button>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="admin-card">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                                <Eye className="w-5 h-5 text-blue-400" /> Live Preview
                            </h3>
                            <div className="p-6 rounded-xl border-2 border-border bg-muted/10" style={{ borderColor: primaryColor + '40' }}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                                        {platformName.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg" style={{ color: primaryColor }}>{platformName}</div>
                                        <div className="text-xs text-muted-foreground">Powered by AI</div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg border border-border bg-background">
                                    <div className="text-sm text-muted-foreground">Hello! I'm <strong>{nickname || 'your AI assistant'}</strong>. How can I help you today?</div>
                                </div>
                                <div className="mt-3 p-2 rounded-lg text-white text-sm text-center font-bold"
                                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
                                    Send Message
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </m.div>
        </Layout>
    </LazyMotion>
);
}
