import { User as UserIcon } from "@phosphor-icons/react";

interface ProfileAvatarProps {
  user: any;
  imgError: boolean;
  setImgError: (error: boolean) => void;
  className?: string;
}

export function ProfileAvatar({ user, imgError, setImgError, className }: ProfileAvatarProps) {
  return (
    <div className={`h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-xs border-2 border-white dark:border-[#0B1120] hover:ring-2 hover:ring-orange-500/50 transition-all overflow-hidden flex-shrink-0 ${className}`}>
      {user?.picture && !imgError ? (
        <img
          src={user.picture}
          alt="Profile"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        user?.email?.substring(0, 2).toUpperCase() || <UserIcon className="h-5 w-5" weight="bold" />
      )}
    </div>
  );
}
