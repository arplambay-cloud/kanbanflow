import React from 'react';
import { Priority } from '../../types';

interface PriorityTagProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export const PriorityTag: React.FC<PriorityTagProps> = ({
  priority,
  size = 'md',
}) => {
  const configs = {
    low: {
      label: 'Low',
      bg: 'bg-[#ECE8DC] text-[#6D695E] border-[#DED9CC]',
    },
    medium: {
      label: 'Medium',
      bg: 'bg-[#ECE8DC] text-[#1D2739] border-[#DED9CC]',
    },
    high: {
      label: 'High',
      bg: 'bg-[#F4DDD5] text-[#BF503D] border-[#EAC9C0] font-bold',
    },
    urgent: {
      label: 'Urgent',
      bg: 'bg-[#F4DDD5] text-[#BF503D] border-[#EAC9C0] font-bold',
    },
  };

  const config = configs[priority] || configs.medium;
  const sizeClass =
    size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-control border uppercase tracking-wider font-semibold ${config.bg} ${sizeClass}`}
    >
      {config.label}
    </span>
  );
};
