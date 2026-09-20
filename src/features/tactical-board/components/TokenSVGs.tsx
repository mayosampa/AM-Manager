import React, { memo } from 'react';

export const SVGGlobals = memo(() => (
  <svg id="svg-globals" width="0" height="0" className="absolute pointer-events-none">
    <defs>
      {/* Drop Shadows */}
      <filter id="shadow-sm" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.3" />
      </filter>
      <filter id="shadow-md" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
      </filter>
      <filter id="shadow-heavy" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="4" floodOpacity="0.5" />
      </filter>

      {/* Ball Gradient */}
      <radialGradient id="grad-ball" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="80%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#94a3b8" />
      </radialGradient>

      {/* Cone Gradient */}
      <radialGradient id="grad-cone" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="50%" stopColor="#f97316" />
        <stop offset="90%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#c2410c" />
      </radialGradient>

      {/* Pole Gradient */}
      <linearGradient id="grad-pole" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>

      {/* Base Dark Gradient */}
      <radialGradient id="grad-base-dark" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#333" />
        <stop offset="100%" stopColor="#111" />
      </radialGradient>

      {/* Goal Post Gradient */}
      <linearGradient id="grad-goal-post" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>

      <linearGradient id="grad-goal-post-3d" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>

      {/* Player Token Metallic Ring */}
      <radialGradient id="grad-token-ring" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="85%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </radialGradient>

      {/* Goal Net Pattern */}
      <pattern id="net-pattern" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M 4 0 L 0 4 M 0 0 L 4 4" stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.5" />
      </pattern>

      <pattern id="net-pattern-real" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8"/>
      </pattern>
    </defs>
  </svg>
));

export const TokenPlayer = memo(({ color, label, playerName }: { color: string; label: string; playerName?: string }) => (
  <div className="absolute w-8 h-8 origin-center -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" filter="url(#shadow-md)">
      <circle cx="50" cy="50" r="45" fill="url(#grad-token-ring)" />
      <circle cx="50" cy="50" r="43" fill="#1e293b" />
      <circle cx="50" cy="50" r="41" fill="url(#grad-token-ring)" />
      <circle cx="50" cy="50" r="38" fill={color} />
      <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <text x="50" y="55" fontFamily="sans-serif" fontSize="36" fontWeight="bold" fill="#ffffff" textAnchor="middle" dominantBaseline="middle" className="drop-shadow-sm">
        {label}
      </text>
    </svg>
    {playerName && (
      <span className="text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded shadow whitespace-nowrap mt-8 absolute">
        {playerName.split(' ')[0]}
      </span>
    )}
  </div>
));

export const TokenBall = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-6 h-6 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    <circle cx="50" cy="50" r="45" fill="url(#grad-ball)" />
    <polygon points="50,22 75,40 65,68 35,68 25,40" fill="#1e293b" />
    <path d="M50,2 L65,8 L50,22 L35,8 Z" fill="#1e293b" />
    <path d="M95,35 L96,55 L75,40 Z" fill="#1e293b" />
    <path d="M80,88 L65,95 L65,68 Z" fill="#1e293b" />
    <path d="M20,88 L35,95 L35,68 Z" fill="#1e293b" />
    <path d="M5,35 L4,55 L25,40 Z" fill="#1e293b" />
    <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
  </svg>
));

export const TokenCone = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-8 h-8 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-md)">
    <ellipse cx="50" cy="85" rx="40" ry="15" fill="#c2410c" />
    <path d="M 10 85 L 45 20 L 55 20 L 90 85 Z" fill="url(#grad-cone)" />
    <ellipse cx="50" cy="20" rx="5" ry="2" fill="#7c2d12" />
  </svg>
));

export const TokenPole = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-6 h-12 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-md)">
    <ellipse cx="50" cy="80" rx="25" ry="10" fill="url(#grad-base-dark)" />
    <rect x="44" y="10" width="12" height="70" rx="6" fill="url(#grad-pole)" />
    <ellipse cx="50" cy="10" rx="6" ry="3" fill="#fef08a" />
  </svg>
));

export const TokenGoal = memo(() => {
  // ID único para evitar colisiones de patrones (y mantener estabilidad de Hooks para HMR)
  const uid = React.useMemo(() => Math.random().toString(36).substring(2, 9), []);
  
  return (
    <svg 
      viewBox="0 0 90 40" 
      className="absolute w-[90px] h-[40px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible"
    >
      <defs>
        {/* Malla muy fina y pequeña (cuadrícula ortogonal de 4x4) */}
        <pattern id={`net-${uid}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.7"/>
        </pattern>
      </defs>

      <g>
        {/* 1. Fondo interactivo invisible (Asegura que el drag funcione) */}
        <rect x="0" y="0" width="90" height="40" fill="transparent" pointerEvents="all" />

        {/* 2. Fondo del césped casi transparente */}
        <rect x="4" y="5" width="82" height="30" fill="rgba(255,255,255,0.05)" pointerEvents="none" />
        
        {/* 3. Malla de la red (Fina y repetitiva) */}
        <rect x="4" y="5" width="82" height="30" fill={`url(#net-${uid})`} pointerEvents="none" />

        {/* 4. Marco inferior apoyado en el césped */}
        <path 
          d="M 4 35 L 4 5 L 86 5 L 86 35" 
          fill="none" 
          stroke="#e2e8f0" 
          strokeWidth="2" 
          strokeLinecap="square" 
          pointerEvents="none"
        />

        {/* 5. Sombra del larguero */}
        <line x1="2" y1="39" x2="88" y2="39" stroke="rgba(0,0,0,0.25)" strokeWidth="4" strokeLinecap="round" pointerEvents="none" />
        <circle cx="4" cy="39" r="2.5" fill="rgba(0,0,0,0.25)" pointerEvents="none" />
        <circle cx="86" cy="39" r="2.5" fill="rgba(0,0,0,0.25)" pointerEvents="none" />

        {/* 6. Larguero frontal (Tubo blanco grueso) */}
        <line x1="2" y1="35" x2="88" y2="35" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" pointerEvents="none" />
        <line x1="2" y1="34" x2="88" y2="34" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
        
        {/* 7. Postes verticales (Tapas) */}
        <circle cx="4" cy="35" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" pointerEvents="none" />
        <circle cx="86" cy="35" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" pointerEvents="none" />
      </g>
    </svg>
  );
});

export const TokenLadder = memo(() => (
  <svg viewBox="0 0 100 300" className="absolute w-10 h-32 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    <rect x="20" y="10" width="6" height="280" rx="3" fill="#facc15" />
    <rect x="74" y="10" width="6" height="280" rx="3" fill="#facc15" />
    {[30, 70, 110, 150, 190, 230, 270].map(y => (
      <rect key={y} x="26" y={y} width="48" height="6" rx="2" fill="#fef08a" />
    ))}
  </svg>
));

export const TokenRing = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-10 h-10 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="8" />
    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#93c5fd" strokeWidth="2" strokeOpacity="0.6" />
    <circle cx="50" cy="50" r="37" fill="transparent" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.4" />
  </svg>
));

export const TokenHurdle = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-12 h-8 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-md)">
    <rect x="20" y="20" width="8" height="60" rx="4" fill="url(#grad-base-dark)" />
    <rect x="72" y="20" width="8" height="60" rx="4" fill="url(#grad-base-dark)" />
    <circle cx="24" cy="50" r="5" fill="#cbd5e1" />
    <circle cx="76" cy="50" r="5" fill="#cbd5e1" />
    <rect x="10" y="45" width="80" height="10" rx="5" fill="url(#grad-pole)" />
  </svg>
));

export const TokenDummy = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-10 h-12 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-heavy)">
    <ellipse cx="50" cy="85" rx="35" ry="12" fill="url(#grad-base-dark)" />
    <rect x="46" y="70" width="8" height="15" fill="#475569" />
    <path d="M 30 70 L 35 45 C 35 30, 25 35, 35 20 C 40 10, 60 10, 65 20 C 75 35, 65 30, 65 45 L 70 70 Z" fill="#ef4444" />
    <path d="M 30 70 L 35 45 C 35 30, 25 35, 35 20 C 40 10, 60 10, 65 20 C 75 35, 65 30, 65 45 L 70 70 Z" fill="transparent" stroke="#fca5a5" strokeWidth="2" />
    <path d="M 40 25 C 45 15, 55 15, 60 25" stroke="#fecaca" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6"/>
  </svg>
));

export const TokenPoleGround = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-16 h-4 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    <rect x="10" y="44" width="80" height="12" rx="6" fill="url(#grad-pole)" />
    <ellipse cx="16" cy="50" rx="3" ry="6" fill="#fef08a" />
    <ellipse cx="84" cy="50" rx="3" ry="6" fill="#ca8a04" />
  </svg>
));

export const TokenFlatCone = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-8 h-8 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    <ellipse cx="50" cy="60" rx="45" ry="25" fill="#ea580c" opacity="0.8" />
    <path d="M 10,60 L 35,35 C 40,30 60,30 65,35 L 90,60 Z" fill="url(#grad-cone)" />
    <ellipse cx="50" cy="35" rx="15" ry="5" fill="#111" opacity="0.8" />
  </svg>
));

export const TokenMedicineBall = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute w-8 h-8 origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    <circle cx="50" cy="50" r="45" fill="url(#grad-base-dark)" />
    <circle cx="50" cy="50" r="25" fill="transparent" stroke="#1e293b" strokeWidth="4" />
    <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
  </svg>
));
