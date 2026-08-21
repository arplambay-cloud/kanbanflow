import React from 'react';

interface StatusPillProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const normalized = status.toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = '#64748b';

  if (normalized.includes('done') || normalized.includes('complete')) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    dotColor = '#10b981';
  } else if (normalized.includes('progress') || normalized.includes('review') || normalized.includes('doing')) {
    colorClasses = 'bg-brand-50 text-brand-700 border-brand-200/80';
    dotColor = '#7839e6';
  } else if (normalized.includes('to do') || normalized.includes('backlog') || normalized.includes('todo')) {
    colorClasses = 'bg-slate-100 text-slate-700 border-slate-200/80';
    dotColor = '#64748b';
  } else if (normalized.includes('block') || normalized.includes('urgent')) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
    dotColor = '#ef4444';
  }

  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${colorClasses} ${sizeClasses[size]} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span className="truncate">{status}</span>
    </span>
  );
};
