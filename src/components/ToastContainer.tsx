import React from 'react';
import { useGameStore } from '../store/gameStore';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGameStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
        };

        const borderColors = {
          success: 'border-emerald-500/40 bg-emerald-950/80',
          error: 'border-rose-500/40 bg-rose-950/80',
          warning: 'border-amber-500/40 bg-amber-950/80',
          info: 'border-cyan-500/40 bg-slate-900/90',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-lg border backdrop-blur-md shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
              borderColors[toast.type]
            }`}
          >
            <div className="flex items-center gap-2.5">
              {icons[toast.type]}
              <span className="text-sm font-medium text-slate-100">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition p-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
