import React from 'react';

interface StatusPillProps {
  status: 'done' | 'inprogress' | 'todo' | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const norm = status.toLowerCase();

  let isDone = norm.includes('done') || norm.includes('completed');
  let isInProgress = norm.includes('progress') || norm.includes('review');
  let label = status;

  if (isDone) {
    label = 'Done';
  } else if (isInProgress) {
    label = norm.includes('review') ? 'Review' : 'In Progress';
  } else {
    label = 'To Do';
  }

  const styles = isDone
    ? {
        bg: 'bg-[#DCECC3] text-[#3E6B2A] border-[#C7DCAB]',
        dot: 'bg-[#3E6B2A]',
      }
    : isInProgress
    ? {
        bg: 'bg-[#DCEAF0] text-[#276170] border-[#C3DBE5]',
        dot: 'bg-[#276170]',
      }
    : {
        bg: 'bg-[#ECE8DC] text-[#6D695E] border-[#DED9CC]',
        dot: 'bg-[#6D695E]',
      };

  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-tight ${styles.bg} ${sizeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
      <span>{label}</span>
    </span>
  );
};
