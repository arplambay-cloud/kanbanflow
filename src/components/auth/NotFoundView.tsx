import React, { useState } from 'react';
import {
  Ghost,
  Sparkles,
  Coffee,
  Radio,
  Zap,
  RefreshCw,
  Cat,
  Bot,
  Gamepad2,
  Cookie,
} from 'lucide-react';

const FUNNY_MESSAGES = [
  {
    icon: Ghost,
    title: 'Nothing to see here...',
    desc: "You've wandered into the digital void. There are no secret projects, no tasks, just ghosts and good vibes.",
    badge: 'CLASSIFIED VOID',
  },
  {
    icon: Coffee,
    title: 'Why are you even here?',
    desc: "There is literally nothing for you to do here. Close this tab, stretch your legs, and go grab a cup of chai or coffee ☕.",
    badge: 'BREAK TIME',
  },
  {
    icon: Bot,
    title: 'Beep Boop. Move along, human.',
    desc: "Our AI guards detected unauthorized curiosity. Act natural, smile at the camera, and slowly close this window.",
    badge: 'SECURITY LVL: 999',
  },
  {
    icon: Radio,
    title: 'Static Noise & Cosmic Echoes',
    desc: 'You reached frequency 404.7 MHz. Transmitting high-frequency cat memes to outer space. Please stand by.',
    badge: 'RADIO STATIC',
  },
  {
    icon: Cat,
    title: 'A wild cat is sleeping on the servers',
    desc: "We can't let you in right now because waking the cat violates company policy. Try again never.",
    badge: 'CAT NAP PROTOCOL',
  },
  {
    icon: Zap,
    title: 'Quantum Portal Closed',
    desc: 'This dimensional coordinate has expired. Any further attempts to explore may result in unexpected spaghetti code.',
    badge: 'QUANTUM BLOCKED',
  },
  {
    icon: Cookie,
    title: 'Here, have a virtual cookie 🍪',
    desc: "You didn't find what you were looking for, but you found a delicious cookie. Take it and go on with your day.",
    badge: 'SNACK BREAK',
  },
  {
    icon: Gamepad2,
    title: 'You have entered an empty level',
    desc: 'The game developers haven\'t built anything here yet. Press Alt+F4 or find another quest.',
    badge: 'LEVEL 0',
  },
];

export const NotFoundView: React.FC = () => {
  // Random message on initial page load / refresh
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * FUNNY_MESSAGES.length)
  );
  const [isRotating, setIsRotating] = useState(false);

  const current = FUNNY_MESSAGES[index];
  const Icon = current.icon;

  const handleNextMessage = () => {
    setIsRotating(true);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % FUNNY_MESSAGES.length);
      setIsRotating(false);
    }, 200);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden text-slate-200">
      {/* Ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* Animated Icon Card */}
        <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/10 group cursor-pointer transition-transform hover:scale-105" onClick={handleNextMessage}>
          <Icon className={`w-10 h-10 text-indigo-400 transition-all duration-300 ${isRotating ? 'scale-75 rotate-180 opacity-50' : 'scale-100 rotate-0 opacity-100'}`} />
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono font-bold tracking-wider text-indigo-400 uppercase mb-4">
          <Sparkles className="w-3 h-3" />
          <span>{current.badge}</span>
        </span>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3 transition-opacity duration-200">
          {current.title}
        </h1>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mb-8 transition-opacity duration-200">
          {current.desc}
        </p>

        {/* Fun Interactive Button */}
        <button
          type="button"
          onClick={handleNextMessage}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 hover:border-slate-700 shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
          <span>Poke the Void (Next Message)</span>
        </button>

        {/* Footer subtle note */}
        <div className="mt-12 text-[11px] text-slate-600 font-mono">
          <span>Coordinates: [0.000, 0.000] • Status: Idle</span>
        </div>
      </div>
    </div>
  );
};

