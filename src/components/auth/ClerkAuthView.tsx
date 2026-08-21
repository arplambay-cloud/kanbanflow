import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/react';
import { Kanban, ShieldCheck, Zap, Users, Sparkles } from 'lucide-react';

export const ClerkAuthView: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Kanban className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            Kanban<span className="text-brand-400">Flow</span>
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
          Collaborative team workspace with real-time boards, tasks, and member management.
        </p>
      </div>

      {/* Clerk Embedded Component */}
      <div className="z-10 shadow-2xl rounded-2xl overflow-hidden animate-fade-in min-h-[400px] flex items-center justify-center">
        {isSignUp ? (
          <SignUp fallbackRedirectUrl="/" />
        ) : (
          <SignIn fallbackRedirectUrl="/" />
        )}
      </div>

      {/* Toggle Sign In / Sign Up */}
      <div className="mt-4 z-10">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs sm:text-sm text-slate-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};
