import { useState, useEffect } from 'react';
import { Search, Server, Users, ShieldAlert, X, ChevronRight, Activity, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHasPermission, useIsSuperAdmin } from '../hooks/useHasPermission';
import { useAuth } from '../hooks/useAuth';
import { LazyMotion, m, domAnimation, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface CommandPaletteProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export default function CommandPalette({ open, setOpen }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
    const navigate = useNavigate();
    const { token } = useAuth();
    const canManageAdmins = useHasPermission("can_manage_admins");
    const canViewAudit = useHasPermission("can_view_audit_logs");
    const isSuperAdmin = useIsSuperAdmin();

    useEffect(() => {
        const fetchUsers = async () => {
            if (!token || !open) return;
            try {
                const res = await axios.get(`${API_URL}/admin/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRemoteUsers(res.data);
            } catch (e) {
                console.error("Failed fetching users for palette", e);
            }
        };
        fetchUsers();
    }, [token, open]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === 'Escape') {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [setOpen]);

    const staticCommands = [
        { id: 'dashboard', title: 'Dashboard Overview', icon: Server, action: () => navigate('/dashboard') },

        ...(canManageAdmins ? [
            { id: 'gov', title: 'Governance Matrix', icon: Users, action: () => navigate('/governance') },
            { id: 'invite', title: 'Invite New Admin', icon: Users, action: () => navigate('/governance') }
        ] : []),

        ...(canViewAudit ? [
            { id: 'sec', title: 'Security & Audit Logs', icon: ShieldAlert, action: () => navigate('/security') },
            { id: 'kill', title: 'Emergency Kill Switch', icon: ShieldAlert, action: () => navigate('/security') }
        ] : []),

        ...(isSuperAdmin ? [
            { id: 'sys_control', title: 'System Control Panel', icon: Terminal, action: () => navigate('/dashboard') },
            { id: 'cache', title: 'Flush Redis Cache', icon: Server, action: () => navigate('/dashboard') }
        ] : [])
    ];

    const q = query.toLowerCase();

    // 1. Filter static commands
    const filteredCommands = staticCommands.filter(c => c.title.toLowerCase().includes(q));

    // 2. Filter remote users
    const filteredUsers = remoteUsers.reduce((acc, u) => {
        if (u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)) {
            acc.push({
                id: `usr_${u.id}`,
                title: `User: ${u.username} (${u.email})`,
                icon: Users,
                action: () => navigate('/dashboard') // Currently User Registry is in Dashboard
            });
        }
        return acc;
    }, [] as any[]);

    // Only show user search results if there's an actual query to prevent clutter
    const allResults = q.length > 0
        ? [...filteredCommands, ...filteredUsers].slice(0, 10)
        : filteredCommands;

    const handleSelect = (cmd: any) => {
        cmd.action();
        setOpen(false);
        setQuery('');
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex justify-center items-start pt-[15vh]">
                <LazyMotion features={domAnimation}>
                    <m.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="w-full max-w-lg bg-white border border-border rounded-xl overflow-hidden shadow-2xl"
                    >
                        <div className="flex items-center px-4 border-b border-border bg-muted/20">
                            <Search className="w-5 h-5 text-muted-foreground mr-3" />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Type a command or search for users..."
                                className="flex-1 bg-transparent border-0 py-4 outline-none text-foreground placeholder:text-muted-foreground"
                            />
                            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="max-h-[350px] overflow-y-auto p-2 bg-white">
                            {allResults.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">No results found for "{query}".</div>
                            ) : (
                                allResults.map((cmd) => (
                                    <button
                                        key={cmd.id}
                                        onClick={() => handleSelect(cmd)}
                                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 text-left transition-colors group"
                                    >
                                        <div className="flex items-center text-foreground font-medium truncate pr-4">
                                            <cmd.icon className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                            <span className="truncate">{cmd.title}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="bg-muted/30 p-3 text-xs text-muted-foreground border-t border-border flex gap-4">
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded bg-white border border-border font-sans font-medium text-[10px] shadow-sm">esc</kbd>
                                <span>to close palette</span>
                            </div>
                        </div>
                    </m.div>
                </LazyMotion>
            </div>
        </AnimatePresence>
    );
}
