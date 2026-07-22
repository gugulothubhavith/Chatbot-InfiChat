import React, { useState, useEffect, useMemo } from "react";
import { cn, formatNameFromEmail } from "../lib/utils";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import { Logo } from "./Logo";
import { ProfileAvatar } from "./ProfileAvatar";
import { SettingsModal } from "./SettingsModal";
import { SidebarUserMenu } from "./sidebar/SidebarUserMenu";
import { SidebarSessionsList, ChatSession } from "./sidebar/SidebarSessionsList";
import { toast } from "sonner";
import {
  NotePencil as SquarePen,
  Gear as Settings,
  SignOut as LogOut,
  User as UserIcon,
  SidebarSimple as PanelLeft,
  ChatTeardropText as MessageSquare,
  Code,
  Trash as Trash2,
  DotsThree as MoreHorizontal,
  ShareNetwork as Share2,
  PencilSimple as Edit3,
  PushPin as Pin,
  Archive,
  TrayArrowUp as ArchiveRestore,
  Info,
  X,
  MagnifyingGlass as SearchIcon,
  ChatTeardropText as ChatIcon,
} from "@phosphor-icons/react";




export default function Sidebar() {
  const { logout, user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: currentSessionId } = useParams<{ sessionId?: string }>();

  // Layout State
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return localStorage.getItem("sidebarExpanded") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("sidebarExpanded", String(isExpanded));
  }, [isExpanded]);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [codeSessions, setCodeSessions] = useState<ChatSession[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number, left: number, placement: 'bottom' | 'top' } | null>(null);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Mobile menu event listener
  useEffect(() => {
    const handleToggle = () => setIsExpanded(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  // Re-load sessions if token changes
  useEffect(() => {
    if (token) {
      loadSessions();
    }
  }, [token, location.pathname]);

  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'code'>('chats');

  // Derived & Sorted Sessions
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [sessions]);

  // Grouped & Filtered Sessions for Search
  const groupedFilteredSessions = useMemo(() => {
    const filtered = sortedSessions.filter(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const now = new Date();
    const groups: Record<string, ChatSession[]> = {
      "Today": [],
      "Yesterday": [],
      "Previous 7 Days": [],
      "Previous 30 Days": [],
      "Older": []
    };

    filtered.forEach(session => {
      const updated = new Date(session.updated_at);
      const diffTime = now.getTime() - updated.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0 && now.getDate() === updated.getDate()) {
        groups["Today"].push(session);
      } else if (diffDays === 1 || (diffDays === 0 && now.getDate() !== updated.getDate())) {
        groups["Yesterday"].push(session);
      } else if (diffDays < 7) {
        groups["Previous 7 Days"].push(session);
      } else if (diffDays < 30) {
        groups["Previous 30 Days"].push(session);
      } else {
        groups["Older"].push(session);
      }
    });

    return groups;
  }, [sortedSessions, searchQuery]);

  // --- Effects & Data Loading ---

  useEffect(() => {
    const handleClickOutside = () => {
      setShowProfileMenu(false);
      setMenuSessionId(null);
      setMenuPosition(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        return;
      }
      // Keyboard shortcuts (Ctrl/Cmd)
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/');
      } else if (e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [navigate]);

  const loadSessions = async () => {
    if (!token) return;
    try {
      const [res, codeRes] = await Promise.all([
        axios.get("/chat/sessions", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/chat/sessions?workspace=code", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSessions(res.data);
      setCodeSessions(codeRes.data);
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleArchiveSession = async (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await axios.patch(`/chat/sessions/${session.id}`,
        { is_archived: !session.is_archived },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadSessions();
      setMenuSessionId(null);
    } catch (err) {
      console.error("Failed to archive session", err);
    }
  };

  const handlePinSession = async (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await axios.patch(`/chat/sessions/${session.id}`,
        { is_pinned: !session.is_pinned },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadSessions();
      setMenuSessionId(null);
    } catch (err) {
      console.error("Failed to pin session", err);
    }
  };

  const handleRenameSession = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setRenameSessionId(session.id);
    setRenameValue(session.title);
    setMenuSessionId(null);
  };

  const handleSaveRename = async (sessionId: string) => {
    if (!renameValue.trim()) {
      setRenameSessionId(null);
      return;
    }
    if (!token) return;
    try {
      await axios.patch(`/chat/sessions/${sessionId}`,
        { title: renameValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadSessions();
      setRenameSessionId(null);
    } catch (err) {
      console.error("Failed to rename session", err);
    }
  };

  const handleShareSession = async (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setIsSharing(true);
    try {
      if (!token) return;
      const res = await axios.post(`/chat/sessions/${session.id}/share`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { share_token } = res.data;
      const url = `${window.location.origin}/share/${share_token}`;

      if (navigator.share) {
        await navigator.share({
          title: session.title,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Share link copied to clipboard!");
      }
      setMenuSessionId(null);
    } catch (err) {
      console.error("Failed to share session", err);
    } finally {
      setIsSharing(false);
    }
  };





  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!token) return;
    toast("Are you sure you want to delete this chat? This cannot be undone.", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await axios.delete(`/chat/sessions/${sessionId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            loadSessions();
            if (currentSessionId === sessionId) {
              navigate("/");
            }
            toast.success("Chat deleted");
          } catch (err) {
            toast.error("Failed to delete session");
          }
        },
      },
    });
  };

  useEffect(() => {
    loadSessions();
    const handleChatUpdated = () => loadSessions();
    window.addEventListener("chat-updated", handleChatUpdated);
    return () => window.removeEventListener("chat-updated", handleChatUpdated);
  }, [token, location.pathname]);

  // --- Actions ---

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const minimalNavItems = [
    { name: "New Chat", onClick: () => { window.dispatchEvent(new Event('reset-chat')); navigate('/'); }, icon: SquarePen },
    { name: "Chat", path: "/", icon: ChatIcon },
    { name: "Search Chats", onClick: () => setIsSearchOpen(true), icon: SearchIcon },
    { name: "InfiBuild Studio", path: "/code", icon: Code },
    ...(user?.role === "admin" ? [{ name: "Admin Panel", path: "/admin", icon: Settings }] : []),
  ];

  const fullNavItems = [
    { name: "New chat", onClick: () => { window.dispatchEvent(new Event('reset-chat')); navigate('/'); }, icon: SquarePen },
    { name: "Chat", path: "/", icon: ChatIcon },
    { name: "Search Chats", onClick: () => setIsSearchOpen(true), icon: SearchIcon },
    { name: "InfiBuild Studio", path: "/code", icon: Code },
    ...(user?.role === "admin" ? [{ name: "Admin Panel", path: "/admin", icon: Settings }] : []),
  ];

  const activeModule = fullNavItems.find(item => item.path && item.path !== "/" && location.pathname.startsWith(item.path))?.path || "/";


  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsExpanded(false)}
      />
      <div
        className={cn(
          "fixed md:relative flex flex-col h-screen z-50 overflow-hidden transition-all duration-300",
          isExpanded ? "w-72 translate-x-0" : "w-[72px] -translate-x-full md:translate-x-0"
        )}
        style={{
          background: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
      {/* --- UNIFIED HEADER --- */}
      <div className="px-4 pt-6 pb-2 mb-8 flex-shrink-0">
        <div className="flex items-center">
          {/* Stationary Icon Container (Fixed at 16px left) */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <button
              onClick={() => setIsExpanded(true)}
              disabled={isExpanded}
              className={cn(
                "h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-200 relative outline-none focus:outline-none focus-visible:outline-none focus:ring-0",
                !isExpanded ? "group cursor-pointer" : "cursor-default"
              )}
              aria-label={isExpanded ? "Menu expanded" : "Expand menu"}
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            >
              <div className={cn(
                "absolute inset-0 flex items-center justify-center transition-all duration-300",
                !isExpanded && "group-hover:opacity-0 group-hover:scale-90"
              )}>
                <Logo iconOnly iconSize={28} />
              </div>
              {!isExpanded && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-90 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100" style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                  <PanelLeft className="h-6 w-6" style={{ color: 'var(--color-text-secondary)' }} strokeWidth={1.5} />
                </div>
              )}
            </button>
          </div>

          {/* Expanded-only Header Content (Fades in) */}
          <div
            className={cn(
              "flex-1 flex items-center justify-between ml-2 overflow-hidden transition-all duration-300",
              isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            )}
          >
            <div className="flex-shrink-0">
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 px-2 transition-colors duration-150 press-scale rounded-lg outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
              style={{ color: 'var(--color-text-tertiary)' }}
              title="Collapse Menu"
              aria-label="Collapse Menu"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* --- NAVIGATION CONTENT --- */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <nav className="px-4 space-y-1 pb-4">
          {(isExpanded ? fullNavItems : minimalNavItems).map((item) => {
            const isActive = item.path ? (location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path))) : false;
            const Icon = item.icon;

            const content = (
              <div className="flex items-center w-full h-full">
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                  <Icon className={cn("h-5 w-5", isActive && "text-gray-900 dark:text-white")} strokeWidth={1.5} />
                </div>
                <div className={cn(
                  "flex-1 ml-2 transition-opacity duration-300 whitespace-nowrap overflow-hidden",
                  isExpanded ? "opacity-100" : "opacity-0 w-0"
                )}>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
              </div>
            );

            const className = cn(
              "flex items-center rounded-xl transition-all duration-200 group relative w-full h-10 outline-none border-none press-scale",
            );

            const style = {
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              background: isActive ? 'var(--color-surface-active)' : 'transparent',
            };

            if ('onClick' in item) {
              return (
                <button key={item.name} onClick={item.onClick} className={`${className} text-left`} style={style}>
                  {content}
                </button>
              );
            }

            return (
              <Link key={item.name} to={item.path!} className={className} style={style}>
                {content}
              </Link>
            );
          })}
        </nav>

        <SidebarSessionsList
          isExpanded={isExpanded}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          codeSessions={codeSessions}
          sortedSessions={sortedSessions}
          currentSessionId={currentSessionId}
          renameSessionId={renameSessionId}
          setRenameSessionId={setRenameSessionId}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          handleSaveRename={handleSaveRename}
          menuSessionId={menuSessionId}
          setMenuSessionId={setMenuSessionId}
          menuPosition={menuPosition}
          setMenuPosition={setMenuPosition}
          handleShareSession={handleShareSession}
          isSharing={isSharing}
          handlePinSession={handlePinSession}
          handleArchiveSession={handleArchiveSession}
          handleDeleteSession={handleDeleteSession}
          isLoading={isLoadingSessions}
        />
      </div>

      <SidebarUserMenu 
        isExpanded={isExpanded} 
        setIsSettingsOpen={setIsSettingsOpen} 
      />

      {/* Overlays */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in" style={{ background: 'oklch(0 0 0 / 0.5)', backdropFilter: 'blur(8px)' }} onClick={() => setIsSearchOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden animate-scale-in glass-heavy" style={{ border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--color-surface-hover)' }}>
                <SearchIcon className="h-5 w-5" style={{ color: 'var(--color-text-tertiary)' }} />
                <input autoFocus placeholder="Search titles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none flex-1" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }} />
                <button onClick={() => setIsSearchOpen(false)} className="press-scale"><X className="h-5 w-5" style={{ color: 'var(--color-text-tertiary)' }} /></button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto space-y-2">
                {/* New Chat Button (matches ChatGPT style) */}
                {!searchQuery && (
                  <button
                    onClick={() => { window.dispatchEvent(new Event('reset-chat')); navigate("/"); setIsSearchOpen(false); }}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#212121] text-gray-900 dark:text-white transition-all group"
                  >
                    <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-[#424242] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform shadow-sm">
                      <SquarePen className="h-4 w-4" />
                    </div>
                    <div className="flex-1 truncate text-left">
                      <p className="font-semibold text-sm truncate">New chat</p>
                    </div>
                  </button>
                )}

                {/* Grouped Results */}
                {Object.entries(groupedFilteredSessions).map(([group, groupSessions]) => (
                  groupSessions.length > 0 && (
                    <div key={group} className="mt-5 first:mt-2">
                      <div className="px-4 mb-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{group}</span>
                      </div>
                      <div className="space-y-1">
                        {groupSessions.map(session => (
                          <button
                            key={session.id}
                            onClick={() => { navigate(`/${session.id}`); setIsSearchOpen(false); setSearchQuery(""); }}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#424242] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all text-left group"
                          >
                            <div className="h-9 w-9 rounded-full bg-gray-50 dark:bg-[#424242] flex items-center justify-center group-hover:bg-white dark:group-hover:bg-[#212121] transition-colors shadow-sm">
                              <ChatIcon className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex-1 truncate">
                              <p className="font-semibold text-sm truncate">{session.title}</p>
                            </div>
                            {session.is_pinned && (
                              <div className="h-6 w-6 rounded-lg bg-gray-100 dark:bg-[#424242] flex items-center justify-center">
                                <Pin className="h-3 w-3 fill-current text-gray-400" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ))}

                {/* No Results Fallback */}
                {searchQuery && Object.values(groupedFilteredSessions).every(g => g.length === 0) && (
                  <div className="py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="h-16 w-16 bg-gray-50 dark:bg-[#212121] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <SearchIcon className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                    </div>
                    <h3 className="text-gray-900 dark:text-white font-bold mb-1">No matches found</h3>
                    <p className="text-sm text-gray-400">Try searching for keywords in your titles</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
    </>
  );
}
