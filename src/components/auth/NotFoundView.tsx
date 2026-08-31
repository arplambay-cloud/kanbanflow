import React from 'react';
import { Compass } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      {/* Subtle Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mb-6 shadow-xl">
          <Compass className="w-8 h-8 text-slate-500 animate-spin-slow" />
        </div>

        <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase mb-2">
          404 Error
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
          The requested URL was not found on this server. Please check the URL or return to the homepage.
        </p>

        <div className="mt-8">
          <a
            href="/"
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 shadow-sm inline-block"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};
