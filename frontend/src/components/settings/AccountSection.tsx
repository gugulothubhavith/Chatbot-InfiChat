import { useState, useRef } from 'react';
import { Camera, EnvelopeSimple, User as UserIcon, SignOut, Trash, Crown } from '@phosphor-icons/react';
import { cn, formatNameFromEmail } from '../../lib/utils';
import { settingsStyles } from './types';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

interface AccountSectionProps {
    onClose: () => void;
}

/**
 * AccountSection — Premium account management with avatar upload,
 * profile editing, and account deletion.
 */
export function AccountSection({ onClose }: AccountSectionProps) {
    const { user, token, logout } = useAuth();
    const [avatarHover, setAvatarHover] = useState(false);
    const [imgError, setImgError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            await axios.post('/auth/me/avatar', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Avatar updated');
            // Trigger a refresh
            window.dispatchEvent(new CustomEvent('avatar-updated'));
        } catch {
            toast.error('Failed to upload avatar');
        }
    };

    const handleDeleteAccount = () => {
        toast('Permanently delete your account? All data will be lost.', {
            action: {
                label: 'Delete Account',
                onClick: async () => {
                    try {
                        await axios.delete('/auth/me', {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        toast.success('Account deleted');
                        logout();
                        onClose();
                    } catch {
                        toast.error('Failed to delete account');
                    }
                },
            },
        });
    };

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-6 bg-gradient-to-br from-[var(--color-accent-subtle)] to-transparent">
                <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div
                        className="relative group"
                        onMouseEnter={() => setAvatarHover(true)}
                        onMouseLeave={() => setAvatarHover(false)}
                    >
                        <div className={cn(
                            'w-16 h-16 rounded-2xl overflow-hidden',
                            'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-surface)]',
                            'transition-transform duration-200',
                            avatarHover && 'scale-105'
                        )}>
                            {user?.avatar_url && !imgError ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.email}
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-[var(--color-accent)] flex items-center justify-center">
                                    <span className="text-xl font-bold text-white">
                                        {(user?.email?.[0] || 'U').toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                'absolute inset-0 rounded-2xl flex items-center justify-center',
                                'bg-black/50 text-white transition-opacity',
                                avatarHover ? 'opacity-100' : 'opacity-0'
                            )}
                        >
                            <Camera size={18} weight="fill" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                {formatNameFromEmail(user?.username || user?.email)}
                            </h3>
                            {user?.role === 'admin' && (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                    <Crown size={10} weight="fill" />
                                    Admin
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <EnvelopeSimple size={12} className="text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {user?.email}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Actions */}
            <div>
                <h3 className={settingsStyles.sectionTitle}>Account Actions</h3>
                <div className="space-y-0 divide-y divide-gray-100 dark:divide-white/[0.06]">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                <SignOut size={16} className="text-gray-500" />
                            </div>
                            <div>
                                <span className={settingsStyles.label}>Log out everywhere</span>
                                <div className={settingsStyles.subtext}>Log out of all sessions across all devices.</div>
                            </div>
                        </div>
                        <button
                            onClick={() => toast("Log out of all devices?", { action: { label: "Log out all", onClick: () => { logout(); onClose(); } } })}
                            className="px-3 py-1.5 border border-red-200 dark:border-red-500/30 rounded-full text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                        >
                            Log out all
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                                <Trash size={16} className="text-red-500" weight="fill" />
                            </div>
                            <div>
                                <span className={settingsStyles.label}>Delete account</span>
                                <div className={settingsStyles.subtext}>Permanently delete your account and all data.</div>
                            </div>
                        </div>
                        <button
                            onClick={handleDeleteAccount}
                            className={settingsStyles.dangerPill}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
