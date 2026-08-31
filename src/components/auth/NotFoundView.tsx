import React, { useState } from 'react';
import {
  Ghost,
  Sparkles,
  Coffee,
  Radio,
  Zap,
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
  // Random message selected on every page load / refresh
  const [index] = useState(() =>
    Math.floor(Math.random() * FUNNY_MESSAGES.length)
  );

  const current = FUNNY_MESSAGES[index];
  const Icon = current.icon;

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden text-slate-200">
      {/* Ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* Animated Icon Card */}
        <div className="w-20 h-20 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/10">
          <Icon className="w-10 h-10 text-indigo-400" />
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono font-bold tracking-wider text-indigo-400 uppercase mb-4">
          <Sparkles className="w-3 h-3" />
          <span>{current.badge}</span>
        </span>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
          {current.title}
        </h1>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mb-6">
          {current.desc}
        </p>

        {/* Footer subtle note */}
        <div className="mt-8 text-[11px] text-slate-600 font-mono">
          <span>Coordinates: [0.000, 0.000] • Status: Idle</span>
        </div>
      </div>
    </div>
  );
};

