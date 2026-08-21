import React from 'react';
import { Priority } from '../../types';
import { PRIORITY_CONFIG } from '../../utils/priorityConfig';

interface PriorityBadgeProps {
  priority: Priority;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  size = 'md',
  className = '',
}) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const Icon = config.icon;

  const sizeClass =
    size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${config.badge} ${sizeClass} ${className}`}
    >
      {showIcon && <Icon className={`w-3 h-3 shrink-0 ${config.iconColor}`} />}
      <span>{config.label}</span>
    </span>
  );
};
