import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        onClick={onCancel}
      >
        <div
          className="w-full max-w-sm bg-white rounded-2xl shadow-floating border border-slate-200 p-5 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmVariant === 'danger'
                  ? 'bg-rose-50 text-rose-600 border border-rose-100'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              }`}
            >
              {confirmVariant === 'danger' ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900">{title}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-all ${
                confirmVariant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
