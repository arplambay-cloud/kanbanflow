import React from 'react';
import { Priority } from '../../types';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  size = 'md',
}) => {
  const configs = {
    low: {
      label: 'Low',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: ArrowDown,
      iconColor: 'text-slate-500',
    },
    medium: {
      label: 'Medium',
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: ArrowUp,
      iconColor: 'text-blue-500',
    },
    high: {
      label: 'High',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
    },
    urgent: {
      label: 'Urgent',
      bg: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
      icon: AlertCircle,
      iconColor: 'text-rose-600',
    },
  };

  const config = configs[priority] || configs.medium;
  const Icon = config.icon;

  const sizeClass =
    size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${config.bg} ${sizeClass}`}
    >
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
