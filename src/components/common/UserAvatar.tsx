import React, { useState, useEffect } from 'react';
import { User } from '../../types';

interface UserAvatarProps {
  user?: Partial<User> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showRole?: boolean;
  className?: string;
  /** Show a green presence dot on the avatar. */
  online?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showName = false,
  showRole = false,
  className = '',
  online = false,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.avatar]);

  if (!user) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-500 font-medium text-xs ${
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
        ?
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

  const dotClasses = {
    xs: 'w-1.5 h-1.5 -bottom-px -right-px',
    sm: 'w-2 h-2 -bottom-px -right-px',
    md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
    lg: 'w-3 h-3 -bottom-0.5 -right-0.5',
    xl: 'w-3.5 h-3.5 bottom-0 right-0',
  };

  const safeName = (user.name || 'User').trim() || 'User';
  const initials = safeName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative shrink-0">
        {user.avatar && !imageError ? (
          <img
            src={user.avatar}
            alt={safeName}
            className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white shadow-sm`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center ring-1 ring-indigo-200`}
          >
            {initials}
          </div>
        )}
        {online && (
          <span
            className={`absolute rounded-full bg-emerald-500 ring-2 ring-white ${dotClasses[size]}`}
            title="Online"
            aria-label="Online"
          />
        )}
      </div>

      {(showName || showRole) && (
        <div className="flex flex-col min-w-0">
          {showName && (
            <span className="text-sm font-medium text-slate-800 truncate">
              {safeName}
            </span>
          )}
          {showRole && (
            <span className="text-xs text-slate-500 truncate">
              {user.jobTitle || user.role || 'Member'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
