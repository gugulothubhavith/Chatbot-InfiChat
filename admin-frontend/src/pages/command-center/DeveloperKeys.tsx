import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import { Key, Plus, Trash2, Copy, RefreshCcw, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function DeveloperKeys() {
    const { token } = useAuth();
    const [keys, setKeys] = useState<any[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyScope, setNewKeyScope] = useState('read');
    const [generatedKey, setGeneratedKey] = useState('');
    const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
    const [feedback, setFeedback] = useState('');

    // Load keys from localStorage (client-side key management)
    useEffect(() => {
        const stored = localStorage.getItem('dev_api_keys');
        if (stored) setKeys(JSON.parse(stored));
    }, []);

    const saveKeys = (updated: any[]) => {
        setKeys(updated);
        localStorage.setItem('dev_api_keys', JSON.stringify(updated));
    };

    const generateKey = () => {
        if (!newKeyName.trim()) { setFeedback('Please enter a key name.'); return; }

        // Generate a cryptographically strong key
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const key = 'ik_' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 48);

        const newEntry = {
            name: newKeyName.trim(),
            key: key,
            scope: newKeyScope,
            createdAt: new Date().toISOString(),
            lastUsed: null,
            requestCount: 0,
        };

        saveKeys([...keys, newEntry]);
        setGeneratedKey(key);
        setNewKeyName('');
        setFeedback(`API Key "${newEntry.name}" generated successfully. Copy it now — it won't be shown again.`);
    };

    const deleteKey = (index: number) => {
        if (!confirm('Delete this API key? This action cannot be undone.')) return;
        const updated = keys.filter((_, i) => i !== index);
        saveKeys(updated);
        setFeedback('API key deleted.');
    };

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setFeedback('API key copied to clipboard!');
        setTimeout(() => setFeedback(''), 2000);
    };

    const toggleVisibility = (key: string) => {
        const updated = new Set(visibleKeys);
        if (updated.has(key)) updated.delete(key);
        else updated.add(key);
        setVisibleKeys(updated);
    };

    return (
<LazyMotion features={domAnimation}>
        <Layout>
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                        <Key className="w-7 h-7 text-amber-500" /> Developer API Key Issuer
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Generate scoped service account keys for external integrations with the InfiChat API.
                    </p>
                </div>

                {feedback && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-500 text-sm">{feedback}</div>
                )}

                {/* Generate Key Form */}
                <div className="admin-card border-amber-500/20">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                        <Plus className="w-5 h-5 text-amber-500" /> Issue New API Key
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Key Name (e.g. CI/CD Pipeline)"
                            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
                        />
                        <select value={newKeyScope} onChange={(e) => setNewKeyScope(e.target.value)}
                            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none">
                            <option value="read">Read Only</option>
                            <option value="write">Read/Write</option>
                            <option value="admin">Full Admin</option>
                        </select>
                        <button onClick={generateKey}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                            Generate Key
                        </button>
                    </div>

                    {generatedKey && (
                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <div className="flex items-center justify-between">
                                <code className="text-xs font-mono text-emerald-400 break-all">{generatedKey}</code>
                                <button onClick={() => copyKey(generatedKey)} className="ml-2 p-2 hover:bg-emerald-500/20 rounded transition">
                                    <Copy className="w-4 h-4 text-emerald-500" />
                                </button>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">⚠ Save this key now. It won't be shown again.</div>
                        </div>
                    )}
                </div>

                {/* Key List */}
                <div className="admin-card">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border pb-3">
                        <Shield className="w-5 h-5 text-blue-400" /> Active API Keys ({keys.length})
                    </h3>
                    {keys.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">No API keys generated yet.</div>
                    ) : (
                        <div className="space-y-3">
                            {keys.map((k) => (
                                <div key={k.key} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{k.name}</span>
                                            <span className={`chip ${k.scope === 'admin' ? 'chip-red' : k.scope === 'write' ? 'chip-amber' : 'chip-blue'}`}>
                                                {k.scope}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="text-xs font-mono text-muted-foreground">
                                                {visibleKeys.has(k.key) ? k.key : k.key.slice(0, 8) + '••••••••••••••••'}
                                            </code>
                                            <button onClick={() => toggleVisibility(k.key)} className="p-1 hover:bg-muted rounded">
                                                {visibleKeys.has(k.key) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            Created: {new Date(k.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => copyKey(k.key)} className="p-2 hover:bg-muted rounded text-blue-400" title="Copy Key">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteKey(i)} className="p-2 hover:bg-red-500/10 rounded text-red-400" title="Delete Key">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </m.div>
        </Layout>
    </LazyMotion>
);
}
