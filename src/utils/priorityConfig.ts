import { LucideIcon, ArrowDown, ArrowUp, AlertTriangle, AlertCircle } from 'lucide-react';
import { Priority } from '../types';

export interface PriorityStyleConfig {
  label: string;
  badge: string;
  buttonSelected: string;
  buttonUnselected: string;
  icon: LucideIcon;
  iconColor: string;
  accentColor: string;
}

export const PRIORITY_CONFIG: Record<Priority, PriorityStyleConfig> = {
  low: {
    label: 'Low',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    buttonSelected: 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-800',
    buttonUnselected: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80',
    icon: ArrowDown,
    iconColor: 'text-slate-500',
    accentColor: '#64748b',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    buttonSelected: 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600',
    buttonUnselected: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80',
    icon: ArrowUp,
    iconColor: 'text-blue-500',
    accentColor: '#2563eb',
  },
  high: {
    label: 'High',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    buttonSelected: 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-600',
    buttonUnselected: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    accentColor: '#d97706',
  },
  urgent: {
    label: 'Urgent',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    buttonSelected: 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-600',
    buttonUnselected: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80',
    icon: AlertCircle,
    iconColor: 'text-rose-600',
    accentColor: '#e11d48',
  },
};