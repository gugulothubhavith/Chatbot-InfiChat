import React, { useState } from "react";
import { cn, formatNameFromEmail } from "../../lib/utils";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/useAuth";
import { ProfileAvatar } from "../ProfileAvatar";
import { DotsThree as MoreHorizontal, Gear as Settings, SignOut as LogOut } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

interface SidebarUserMenuProps {
  isExpanded: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function SidebarUserMenu({ isExpanded, setIsSettingsOpen }: SidebarUserMenuProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="mt-auto px-4 pb-4 pt-2 relative" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div
        className="flex items-center h-12 cursor-pointer rounded-xl transition-all duration-200 px-0 relative group press-scale"
        onClick={(e) => {
          e.stopPropagation();
          setShowProfileMenu(!showProfileMenu);
        }}
      >
        {/* Stationary Avatar (Fixed at 16px left) */}
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center relative">
          <ProfileAvatar user={user} imgError={imgError} setImgError={setImgError} />
        </div>

        {/* Expanded Profile Info (Fades in) */}
        <div className={cn(
          "flex-1 ml-3 flex items-center justify-between overflow-hidden transition-all duration-300",
          isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
        )}>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-sm font-semibold truncate pr-2" style={{ color: 'var(--color-text-primary)' }}>{formatNameFromEmail(user?.email || 'gugulothubhavith2005@gmail.com')}</p>
          </div>
          <MoreHorizontal className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
        </div>
      </div>

      {/* Profile Menu Popup (rendered via portal to avoid sidebar overflow clipping) */}
      {showProfileMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[199]" onClick={() => setShowProfileMenu(false)} />
          <div
            className="fixed z-[200] w-56 rounded-2xl py-2 animate-scale-in glass-heavy"
            style={{ bottom: '70px', left: isExpanded ? '16px' : '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-2 mb-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Account</p>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{formatNameFromEmail(user?.email || 'gugulothubhavith2005@gmail.com')}</p>
              <p className="text-xs truncate opacity-70 mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{user?.email || 'gugulothubhavith2005@gmail.com'}</p>
            </div>
            <button onClick={() => { setIsSettingsOpen(true); setShowProfileMenu(false); }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors duration-100 press-scale" style={{ color: 'var(--color-text-primary)' }}>
              <Settings className="h-4 w-4" /> Settings
            </button>
            <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors duration-100 press-scale" style={{ color: 'var(--color-error)' }}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
