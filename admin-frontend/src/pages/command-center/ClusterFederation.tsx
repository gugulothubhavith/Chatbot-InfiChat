import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Globe, RefreshCcw, Activity, Server, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const REGIONS = [
    { id: 'primary', name: 'Primary Cluster', location: 'Local Docker', icon: '🏠', isPrimary: true },
    { id: 'us-east', name: 'US-East', location: 'Virginia', icon: '🇺🇸', isPrimary: false },
    { id: 'eu-west', name: 'EU-West', location: 'Frankfurt', icon: '🇪🇺', isPrimary: false },
    { id: 'ap-south', name: 'AP-South', location: 'Mumbai', icon: '🇮🇳', isPrimary: false },
];

export default function ClusterFederation() {
    const { token } = useAuth();
    const [health, setHealth] = useState<any>(null);
    const [globalHealth, setGlobalHealth] = useState<any>(null);

    const fetchHealth = async () => {
        if (!token) return;
        try {
            const [sysRes, globalRes] = await Promise.all([
                axios.get(`${API}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API}/health`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setHealth(sysRes.data);
            setGlobalHealth(globalRes.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchHealth(); }, [token]);
    useEffect(() => {
        const interval = setInterval(fetchHealth, 15000);
        return () => clearInterval(interval);
    }, [token]);

    return (
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                            <Globe className="w-7 h-7 text-blue-500" /> Multi-Region Cluster Federation
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Primary cluster health from <code>/admin/system/health</code>. Secondary regions ready for deployment.
                        </p>
                    </div>
                    <button onClick={fetchHealth} className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-bold transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                {/* Region Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {REGIONS.map(region => {
                        const isActive = region.isPrimary;
                        return (
                            <div key={region.id} className={`admin-card p-5 ${isActive ? 'border-emerald-500/30' : 'border-border opacity-60'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{region.icon}</span>
                                        <div>
                                            <h4 className="font-bold">{region.name}</h4>
                                            <div className="text-xs text-muted-foreground">{region.location}</div>
                                        </div>
                                    </div>
                                    {isActive ? (
                                        <span className="chip chip-green">ACTIVE</span>
                                    ) : (
                                        <span className="chip chip-gray">STANDBY</span>
                                    )}
                                </div>

                                {isActive && health ? (
                                    <div className="space-y-3">
                                        {/* Service statuses */}
                                        {Object.entries(health.services || {}).map(([name, svc]: [string, any]) => (
                                            <div key={name} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Server className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm capitalize">{name}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {svc.status === 'healthy' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                                    <span className="text-xs font-bold">{svc.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Hardware */}
                                        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                                            <div className="text-center p-2 bg-muted/20 rounded">
                                                <div className="font-bold">{health.hardware?.cpu_percent}%</div>
                                                <div className="text-[10px] text-muted-foreground">CPU</div>
                                            </div>
                                            <div className="text-center p-2 bg-muted/20 rounded">
                                                <div className="font-bold">{health.hardware?.ram_percent}%</div>
                                                <div className="text-[10px] text-muted-foreground">RAM</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : !isActive ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm">
                                        Region not deployed. Click to provision.
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {/* Federation Status */}
                {globalHealth && (
                    <div className="admin-card">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                            <Activity className="w-5 h-5 text-blue-400" /> Federation Health Summary
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 bg-muted/20 rounded-lg text-center">
                                <div className="text-xl font-black">{globalHealth.status?.toUpperCase()}</div>
                                <div className="text-xs text-muted-foreground">Global Status</div>
                            </div>
                            <div className={`p-3 rounded-lg text-center ${globalHealth.database === 'connected' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                <div className="text-xl font-black">{globalHealth.database}</div>
                                <div className="text-xs text-muted-foreground">Database</div>
                            </div>
                            <div className={`p-3 rounded-lg text-center ${globalHealth.redis === 'connected' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                <div className="text-xl font-black">{globalHealth.redis}</div>
                                <div className="text-xs text-muted-foreground">Redis</div>
                            </div>
                        </div>
                    </div>
                )}
            </m.div>
        </Layout>
    );
}
