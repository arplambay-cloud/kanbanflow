import React from 'react';
import { User } from '../../types';

interface UserAvatarProps {
  user?: User;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showRole?: boolean;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showName = false,
  showRole = false,
  className = '',
}) => {
  if (!user) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-[#ECE8DC] text-[#6D695E] font-medium text-xs ring-1 ring-[#DED9CC] ${
          size === 'xs'
            ? 'w-5 h-5 text-[10px]'
            : size === 'sm'
            ? 'w-7 h-7 text-xs'
            : size === 'md'
            ? 'w-8 h-8 text-xs'
            : size === 'lg'
            ? 'w-10 h-10 text-sm'
            : 'w-14 h-14 text-base'
        } ${className}`}
        title="Unassigned"
      >
        —
      </div>
    );
  }

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-base',
  };

  const initials =
    user.initials ||
    user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Circular mint surface with dark green text initials */}
      <div
        className={`shrink-0 rounded-full bg-[#DCECC3] text-[#3E6B2A] font-bold flex items-center justify-center ring-1 ring-[#DED9CC] shadow-subtle ${sizeClasses[size]}`}
        title={user.name}
      >
        {initials}
      </div>

      {(showName || showRole) && (
        <div className="flex flex-col min-w-0">
          {showName && (
            <span className="text-sm font-semibold text-[#1D2739] truncate">
              {user.name}
            </span>
          )}
          {showRole && (
            <span className="text-xs text-[#646C78] truncate">
              {user.jobTitle || user.role}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
