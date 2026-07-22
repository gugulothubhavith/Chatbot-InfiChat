import React from "react";
import { cn } from "../../lib/utils";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { Code, ChatTeardropText as MessageSquare, Trash, PushPin as Pin, DotsThree as MoreHorizontal, ShareNetwork as Share2, PencilSimple as Edit3, Archive, TrayArrowUp as ArchiveRestore } from "@phosphor-icons/react";

export interface ChatSession {
  id: string;
  title: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface SidebarSessionsListProps {
  isExpanded: boolean;
  activeTab: 'chats' | 'code';
  setActiveTab: (tab: 'chats' | 'code') => void;
  codeSessions: ChatSession[];
  sortedSessions: ChatSession[];
  currentSessionId?: string;
  renameSessionId: string | null;
  setRenameSessionId: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (val: string) => void;
  handleSaveRename: (id: string) => void;
  menuSessionId: string | null;
  setMenuSessionId: (id: string | null) => void;
  menuPosition: { top: number, left: number, placement: 'bottom' | 'top' } | null;
  setMenuPosition: (pos: { top: number, left: number, placement: 'bottom' | 'top' } | null) => void;
  handleShareSession: (e: React.MouseEvent, session: ChatSession) => void;
  isSharing: boolean;
  handlePinSession: (e: React.MouseEvent, session: ChatSession) => void;
  handleArchiveSession: (e: React.MouseEvent, session: ChatSession) => void;
  handleDeleteSession: (e: React.MouseEvent, id: string) => void;
  isLoading?: boolean;
}

export function SidebarSessionsList({
  isExpanded, activeTab, setActiveTab, codeSessions, sortedSessions, currentSessionId,
  renameSessionId, setRenameSessionId, renameValue, setRenameValue, handleSaveRename,
  menuSessionId, setMenuSessionId, menuPosition, setMenuPosition,
  handleShareSession, isSharing, handlePinSession, handleArchiveSession, handleDeleteSession,
  isLoading
}: SidebarSessionsListProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div data-lenis-prevent="true" className="flex-1 overflow-x-hidden overflow-y-auto space-y-1 px-4 pb-4 custom-scrollbar">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent">
            <div className="h-4 w-4 bg-gray-500/20 rounded-md shrink-0"></div>
            <div className="h-4 bg-gray-500/20 rounded-md w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex-1 overflow-x-hidden overflow-y-auto space-y-0.5 px-4 pb-4 transition-opacity duration-200",
      isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="sticky top-0 z-10 pt-2 pb-2 mb-2 -mx-1 px-1 flex items-center gap-4 whitespace-nowrap flex-shrink-0" style={{ background: 'var(--color-bg-secondary)' }}>
        <button 
          onClick={() => setActiveTab('chats')} 
          className={cn("text-xs font-bold uppercase tracking-wider transition-colors pb-1", activeTab === 'chats' ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] border-b-2 border-transparent")}
        >
          Your Chats
        </button>
        <button 
          onClick={() => setActiveTab('code')} 
          className={cn("text-xs font-bold uppercase tracking-wider transition-colors pb-1", activeTab === 'code' ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] border-b-2 border-transparent")}
        >
          Your Code
        </button>
      </div>
      
      {activeTab === 'code' ? (
        codeSessions.length === 0 ? (
           <div className="py-8 text-center px-2">
               <Code className="h-8 w-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-secondary)' }} />
               <p className="text-xs font-medium opacity-60" style={{ color: 'var(--color-text-secondary)' }}>InfiBuild Studio History</p>
               <p className="text-[10px] opacity-40 mt-1" style={{ color: 'var(--color-text-secondary)' }}>Your code generation sessions will appear here.</p>
           </div>
        ) : (
           codeSessions.map(session => (
             <Link 
               key={session.id} 
               to={`/code?session_id=${session.id}`}
               className={cn(
                 "group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative cursor-pointer outline-none border border-transparent press-scale",
                 location.search.includes(session.id)
                   ? "bg-[var(--color-accent-transparent)] text-[var(--color-accent)] border-[var(--color-accent-transparent-heavy)]"
                   : "hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
               )}
             >
               <div className="flex items-center gap-3 truncate">
                 <Code className={cn(
                   "h-4 w-4 shrink-0 transition-colors",
                   location.search.includes(session.id) ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]"
                 )} />
                 <span className="truncate">{session.title}</span>
               </div>
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                 <button
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     handleDeleteSession(e, session.id);
                   }}
                   className="p-1 rounded-md hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:text-red-400 transition-colors"
                 >
                   <Trash className="h-3.5 w-3.5" />
                 </button>
               </div>
             </Link>
           ))
        )
      ) : (
        sortedSessions
        .reduce((acc: React.ReactNode[], session) => {
          if (!session.is_archived) {
            acc.push(
          <div
            key={session.id}
            className={cn(
              "group relative flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 border border-transparent pr-16 press-scale",
              currentSessionId === session.id ? "bg-[var(--color-surface-active)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            )}
            onClick={() => renameSessionId !== session.id && navigate(`/${session.id}`)}
          >
            <MessageSquare className="h-3.5 w-3.5 opacity-70 flex-shrink-0" />
            <div className="flex-1 truncate text-xs font-medium">
              {renameSessionId === session.id ? (
                <div className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleSaveRename(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(session.id);
                      if (e.key === "Escape") setRenameSessionId(null);
                    }}
                    className="flex-1 border rounded-lg px-1.5 py-0.5 outline-none text-xs"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="truncate">{session.title}</span>
                  {session.is_pinned && <Pin className="h-2.5 w-2.5 fill-current text-gray-500 opacity-70" />}
                </div>
              )}
            </div>

            <div className="absolute right-2 flex items-center gap-1 pl-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (menuSessionId === session.id) {
                    setMenuSessionId(null);
                    setMenuPosition(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    // 220px is roughly the height of the menu
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const placement = spaceBelow > 220 ? 'bottom' : 'top';
                    // if bottom: render below the button (+4px space)
                    // if top: render above the button (-4px space from rect.top)
                    setMenuPosition({
                      top: placement === 'bottom' ? rect.bottom + 4 : rect.top - 4,
                      left: rect.right, // Align right edge
                      placement
                    });
                    setMenuSessionId(session.id);
                  }
                }}
                className={cn(
                  "p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-all",
                  menuSessionId === session.id ? "opacity-100 bg-gray-100 dark:bg-gray-800" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {/* Options Menu rendered via portal */}
              {menuSessionId === session.id && menuPosition && createPortal(
                <>
                  <div className="fixed inset-0 z-[199]" onClick={(e) => { e.stopPropagation(); setMenuSessionId(null); setMenuPosition(null); }} />
                  <div
                    className="fixed w-48 z-[200] py-1.5 rounded-xl glass-heavy animate-scale-in"
                    style={{
                      border: '1px solid var(--color-border)',
                      boxShadow: 'var(--shadow-xl)',
                      ...(menuPosition.placement === 'bottom'
                        ? { top: `${menuPosition.top}px`, left: `${menuPosition.left - 192}px` }
                        : { bottom: `${window.innerHeight - menuPosition.top}px`, left: `${menuPosition.left - 192}px` })
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => { handleShareSession(e, session); setMenuPosition(null); }}
                      disabled={isSharing}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      {isSharing ? (
                        <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                      {isSharing ? "Sharing..." : "Share"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setRenameSessionId(session.id); setRenameValue(session.title); setMenuPosition(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 press-scale" style={{ color: 'var(--color-text-primary)' }}>
                      <Edit3 className="w-[14px] h-[14px]" /> Rename
                    </button>
                    <button onClick={(e) => { handlePinSession(e, session); setMenuPosition(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 press-scale" style={{ color: 'var(--color-text-primary)' }}>
                      <Pin className={cn("h-4 w-4", session.is_pinned && "fill-current")} style={{ color: session.is_pinned ? 'var(--color-accent)' : 'inherit' }} />
                      {session.is_pinned ? "Unpin chat" : "Pin chat"}
                    </button>
                    <button onClick={(e) => { handleArchiveSession(e, session); setMenuPosition(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 press-scale" style={{ color: 'var(--color-text-primary)' }}>
                      {session.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      {session.is_archived ? "Unarchive" : "Archive"}
                    </button>
                    <hr style={{ borderColor: 'var(--color-border)' }} className="my-1" />
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(e, session.id); setMenuSessionId(null); setMenuPosition(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 press-scale" style={{ color: 'var(--color-error)' }}>
                      <Trash className="w-[14px] h-[14px]" weight="fill" /> Delete
                    </button>
                  </div>
                </>,
                document.body
              )}
            </div>
          </div>
        );
          }
          return acc;
        }, [])
      )}
    </div>
  );
}
