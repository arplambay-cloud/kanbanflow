import React from 'react';

export const NotFoundView: React.FC = () => {
  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden text-slate-100">
      {/* Subtle Ambient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-sm flex flex-col items-center animate-fade-in">
        {/* Favicon / Brand Logo */}
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 p-2.5 flex items-center justify-center mb-5 shadow-2xl shadow-indigo-500/20">
          <img
            src="/favicon.svg"
            alt="KanbanFlow"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Project Name */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
          Kanban<span className="text-indigo-400">Flow</span>
        </h1>
      </div>
    </div>
  );
};


