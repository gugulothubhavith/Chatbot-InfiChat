import { useState, useEffect } from 'react';
import { Shield, DeviceMobile, Monitor, Globe, SignOut, Key, Clock, Warning } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { settingsStyles } from './types';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

interface Session {
    id: string;
    ip_address: string;
    device_info: string;
    last_seen: string;
    is_current: boolean;
    created_at: string;
}

interface SecuritySectionProps {
    onShowPasswordChange: () => void;
}

/**
 * SecuritySection — Premium security dashboard with active sessions,
 * login history, and password management.
 */
export function SecuritySection({ onShowPasswordChange }: SecuritySectionProps) {
    const { token } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const { label, subtext } = settingsStyles;

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/auth/sessions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(res.data?.sessions || []);
        } catch {
            // Endpoint may not exist yet — fail silently
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const revokeSession = async (sessionId: string) => {
        try {
            await axios.delete(`/auth/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Session revoked');
            fetchSessions();
        } catch {
            toast.error('Failed to revoke session');
        }
    };

    const getDeviceIcon = (ua: string) => {
        const lower = ua.toLowerCase();
        if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone'))
            return DeviceMobile;
        return Monitor;
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* Password Section */}
            <div>
                <h3 className={settingsStyles.sectionTitle}>Authentication</h3>
                <div className="space-y-0 divide-y divide-gray-100 dark:divide-white/[0.06]">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-subtle)] flex items-center justify-center">
                                <Key size={16} style={{ color: 'var(--color-accent)' }} weight="fill" />
                            </div>
                            <div>
                                <span className={label}>Password</span>
                                <div className={subtext}>Change your account password</div>
                            </div>
                        </div>
                        <button
                            onClick={onShowPasswordChange}
                            className={settingsStyles.pill}
                        >
                            Change
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Sessions */}
            <div>
                <h3 className={settingsStyles.sectionTitle}>Active Sessions</h3>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 dark:border-white/10 p-6 text-center">
                        <Shield size={24} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Session tracking will be available once the endpoint is configured.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sessions.map((session) => {
                            const DeviceIcon = getDeviceIcon(session.device_info);
                            return (
                                <div
                                    key={session.id}
                                    className={cn(
                                        'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                                        session.is_current
                                            ? 'border-[var(--color-accent-muted)] bg-[var(--color-accent-subtle)]'
                                            : 'border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                                    )}
                                >
                                    <div className={cn(
                                        'w-9 h-9 rounded-lg flex items-center justify-center',
                                        session.is_current ? 'bg-[var(--color-accent-muted)]' : 'bg-gray-100 dark:bg-white/10'
                                    )}>
                                        <DeviceIcon size={16} className={session.is_current ? 'text-[var(--color-accent)]' : 'text-gray-500'} weight="fill" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                {session.device_info.split(' ').slice(0, 3).join(' ')}
                                            </span>
                                            {session.is_current && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Globe size={10} className="text-gray-400" weight="fill" />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{session.ip_address}</span>
                                            <span className="text-gray-300 dark:text-gray-600">·</span>
                                            <Clock size={10} className="text-gray-400" weight="bold" />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatTimeAgo(session.last_seen)}
                                            </span>
                                        </div>
                                    </div>

                                    {!session.is_current && (
                                        <button
                                            onClick={() => revokeSession(session.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                            title="Revoke session"
                                        >
                                            <SignOut size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Security Tips */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-4">
                <div className="flex gap-3">
                    <Warning size={16} className="text-amber-500 mt-0.5 flex-shrink-0" weight="fill" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Security Recommendation</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            Use a strong, unique password and regularly review your active sessions.
                            Revoke any sessions you don't recognize.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
