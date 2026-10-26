import React, { memo } from 'react';

export const SVGGlobals = memo(() => (
  <svg id="svg-globals" width="0" height="0" className="absolute top-0 left-0 pointer-events-none">
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
  <div className="absolute top-0 left-0 w-[32px] h-[32px] origin-center -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
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
  <div className="absolute top-0 left-0 w-6 h-6 origin-center -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center">
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" filter="url(#shadow-sm)">
      <circle cx="50" cy="50" r="46" fill="url(#grad-ball)" stroke="#1e293b" strokeWidth="3" />
      {/* Costuras hexagonales desde el pentágono central */}
      <line x1="50" y1="26" x2="50" y2="8" stroke="#334155" strokeWidth="2.5" />
      <line x1="72" y1="42" x2="90" y2="34" stroke="#334155" strokeWidth="2.5" />
      <line x1="64" y1="68" x2="77" y2="85" stroke="#334155" strokeWidth="2.5" />
      <line x1="36" y1="68" x2="23" y2="85" stroke="#334155" strokeWidth="2.5" />
      <line x1="28" y1="42" x2="10" y2="34" stroke="#334155" strokeWidth="2.5" />
      {/* Pentágono central */}
      <polygon points="50,26 72,42 64,68 36,68 28,42" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
      {/* Paneles perimetrales */}
      <path d="M36,7 L50,12 L64,7 A46,46 0 0,0 36,7 Z" fill="#0f172a" />
      <path d="M88,26 L84,40 L94,48 A46,46 0 0,0 88,26 Z" fill="#0f172a" />
      <path d="M83,81 L70,80 L65,92 A46,46 0 0,0 83,81 Z" fill="#0f172a" />
      <path d="M17,81 L30,80 L35,92 A46,46 0 0,1 17,81 Z" fill="#0f172a" />
      <path d="M12,26 L16,40 L6,48 A46,46 0 0,1 12,26 Z" fill="#0f172a" />
      {/* Brillo superior 3D */}
      <ellipse cx="38" cy="24" rx="14" ry="7" fill="rgba(255,255,255,0.45)" transform="rotate(-20 38 24)" />
    </svg>
  </div>
));

export const TokenCone = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-[26px] h-[26px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-md)">
    {/* Base cuadrada/octogonal en perspectiva */}
    <polygon points="8,78 50,66 92,78 50,92" fill="#9a3412" stroke="#7c2d12" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="12,76 50,65 88,76 50,88" fill="#ea580c" />
    {/* Cuerpo cónico con relieve */}
    <path d="M 22 76 L 44 12 C 46 9, 54 9, 56 12 L 78 76 Q 50 84 22 76 Z" fill="url(#grad-cone)" />
    {/* Franja reflectante / relieve */}
    <path d="M 33 44 Q 50 49 67 44 L 64 34 Q 50 38 36 34 Z" fill="rgba(255,255,255,0.35)" />
    {/* Brillo lateral */}
    <path d="M 46 15 L 28 73" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
    {/* Punta superior */}
    <ellipse cx="50" cy="12" rx="6" ry="2.5" fill="#7c2d12" />
  </svg>
));

export const TokenPole = memo(() => (
  <svg viewBox="0 0 20 56" className="absolute top-0 left-0 w-[16px] h-[48px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-md)">
    {/* Base redonda negra pesada + punta metálica */}
    <ellipse cx="10" cy="50" rx="8" ry="3.5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
    <ellipse cx="10" cy="48.5" rx="5.5" ry="2" fill="#1e293b" />
    <rect x="9" y="45" width="2" height="5" fill="#94a3b8" />
    {/* Cuerpo de la pica amarilla */}
    <rect x="8" y="3" width="4" height="44" rx="2" fill="url(#grad-pole)" stroke="#ca8a04" strokeWidth="0.6" />
    {/* Capuchón superior rojo/naranja */}
    <rect x="7.8" y="2" width="4.4" height="4" rx="1.5" fill="#ef4444" />
  </svg>
));

export const TokenGoal = memo(() => {
  const uid = React.useMemo(() => Math.random().toString(36).substring(2, 9), []);
  
  return (
    <svg 
      viewBox="0 0 90 40" 
      className="absolute top-0 left-0 w-[90px] h-[40px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible"
    >
      <defs>
        <pattern id={`net-${uid}`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.7"/>
        </pattern>
      </defs>

      <g>
        <rect x="0" y="0" width="90" height="40" fill="transparent" pointerEvents="all" />
        <rect x="4" y="5" width="82" height="30" fill="rgba(255,255,255,0.06)" pointerEvents="none" />
        <rect x="4" y="5" width="82" height="30" fill={`url(#net-${uid})`} pointerEvents="none" />
        <path 
          d="M 4 35 L 4 5 L 86 5 L 86 35" 
          fill="none" 
          stroke="#cbd5e1" 
          strokeWidth="2.2" 
          strokeLinecap="square" 
          pointerEvents="none"
        />
        <line x1="4" y1="35" x2="10" y2="5" stroke="rgba(203,213,225,0.5)" strokeWidth="1.2" pointerEvents="none" />
        <line x1="86" y1="35" x2="80" y2="5" stroke="rgba(203,213,225,0.5)" strokeWidth="1.2" pointerEvents="none" />
        <line x1="2" y1="39" x2="88" y2="39" stroke="rgba(0,0,0,0.25)" strokeWidth="4" strokeLinecap="round" pointerEvents="none" />
        <circle cx="4" cy="39" r="2.5" fill="rgba(0,0,0,0.25)" pointerEvents="none" />
        <circle cx="86" cy="39" r="2.5" fill="rgba(0,0,0,0.25)" pointerEvents="none" />
        <line x1="2" y1="35" x2="88" y2="35" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" pointerEvents="none" />
        <line x1="2" y1="34" x2="88" y2="34" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
        <circle cx="4" cy="35" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" pointerEvents="none" />
        <circle cx="86" cy="35" r="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" pointerEvents="none" />
      </g>
    </svg>
  );
});

export const TokenLadder = memo(() => (
  <svg viewBox="0 0 100 300" className="absolute top-0 left-0 w-[40px] h-[128px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    {/* Cintas laterales negras/rojas de nylon */}
    <rect x="18" y="8" width="7" height="284" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
    <rect x="75" y="8" width="7" height="284" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
    {/* Peldaños planos amarillos */}
    {[24, 66, 108, 150, 192, 234, 274].map(y => (
      <g key={y}>
        <rect x="19" y={y} width="62" height="8" rx="2" fill="#eab308" />
        <rect x="21" y={y + 1} width="58" height="4" rx="1" fill="#fef08a" />
      </g>
    ))}
  </svg>
));

export const TokenRing = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-[32px] h-[32px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1d4ed8" strokeWidth="10" />
    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="7" />
    <circle cx="50" cy="50" r="41.5" fill="transparent" stroke="#93c5fd" strokeWidth="2" strokeOpacity="0.8" />
  </svg>
));

export const TokenHurdleHigh = memo(() => (
  <svg viewBox="0 0 48 30" className="absolute top-0 left-0 w-[42px] h-[26px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-md)">
    {/* Patas de apoyo en perspectiva */}
    <path d="M 4 27 L 10 22 L 15 26" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 44 27 L 38 22 L 33 26" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {/* Montantes verticales altos y barra transversal */}
    <path d="M 10 24 L 10 6 C 10 3.5, 12 2, 15 2 L 33 2 C 36 2, 38 3.5, 38 6 L 38 24" fill="none" stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Franjas blancas de visibilidad en barra superior */}
    <line x1="16" y1="2" x2="20" y2="2" stroke="#ffffff" strokeWidth="3.5" />
    <line x1="28" y1="2" x2="32" y2="2" stroke="#ffffff" strokeWidth="3.5" />
    {/* Barra intermedia de refuerzo */}
    <line x1="10" y1="14" x2="38" y2="14" stroke="#e11d48" strokeWidth="2" strokeDasharray="3,2" />
  </svg>
));

export const TokenHurdleLow = memo(() => (
  <svg viewBox="0 0 48 20" className="absolute top-0 left-0 w-[42px] h-[18px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    {/* Patas de apoyo */}
    <path d="M 4 18 L 10 14 L 15 17" fill="none" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 44 18 L 38 14 L 33 17" fill="none" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    {/* Arco bajo */}
    <path d="M 10 15 L 10 7 C 10 5, 12 4, 15 4 L 33 4 C 36 4, 38 5, 38 7 L 38 15" fill="none" stroke="#fb923c" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="19" y1="4" x2="29" y2="4" stroke="#fef08a" strokeWidth="3.5" />
  </svg>
));

export const TokenDummy = memo(() => (
  <svg viewBox="0 0 100 110" className="absolute top-0 left-0 w-[34px] h-[42px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-heavy)">
    {/* Base de apoyo con muelles/pinchos */}
    <ellipse cx="50" cy="98" rx="34" ry="8" fill="#0f172a" stroke="#334155" strokeWidth="2" />
    <rect x="36" y="84" width="6" height="14" rx="2" fill="#64748b" />
    <rect x="58" y="84" width="6" height="14" rx="2" fill="#64748b" />
    {/* Cuerpo del maniquí de barrera (pecho, hombros y cabeza) */}
    <path
      d="M 28 84 L 24 44 C 24 34, 30 30, 39 29 L 39 25 C 34 23, 33 12, 40 7 C 45 3, 55 3, 60 7 C 67 12, 66 23, 61 25 L 61 29 C 70 30, 76 34, 76 44 L 72 84 Z"
      fill="#ef4444"
      stroke="#b91c1c"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Malla / nervaduras internas del maniquí */}
    <path d="M 32 42 L 68 42 M 34 56 L 66 56 M 35 70 L 65 70 M 50 30 L 50 82" stroke="#fca5a5" strokeWidth="2" strokeOpacity="0.55" strokeLinecap="round" />
    {/* Contorno de brillo superior */}
    <path d="M 42 10 C 47 7, 53 7, 58 10" stroke="#fecaca" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
));

export const TokenPoleGround = memo(() => (
  <svg viewBox="0 0 56 12" className="absolute top-0 left-0 w-[52px] h-[10px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    {/* Cuerpo de la pica tumbada */}
    <rect x="4" y="3.5" width="48" height="5" rx="2.5" fill="url(#grad-pole)" stroke="#ca8a04" strokeWidth="0.8" />
    {/* Topes de goma en ambos extremos */}
    <rect x="2" y="2.8" width="5" height="6.4" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="0.6" />
    <rect x="49" y="2.8" width="5" height="6.4" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="0.6" />
  </svg>
));

export const TokenFlatCone = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-[24px] h-[24px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    {/* Sombra / base circular ancha de la setilla */}
    <ellipse cx="50" cy="64" rx="44" ry="22" fill="#c2410c" />
    {/* Cuerpo cónico truncado (chino/setilla) */}
    <path d="M 6,64 L 28,36 C 34,30 66,30 72,36 L 94,64 C 82,78 18,78 6,64 Z" fill="url(#grad-cone)" stroke="#fb923c" strokeWidth="1.5" />
    {/* Agujero central superior */}
    <ellipse cx="50" cy="36" rx="18" ry="8" fill="#7c2d12" stroke="#fdba74" strokeWidth="1.5" />
    <ellipse cx="50" cy="37" rx="11" ry="4.5" fill="#0f172a" />
  </svg>
));

export const TokenMedicineBall = memo(() => (
  <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-[24px] h-[24px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)">
    {/* Esfera pesada de caucho con textura de agarre */}
    <circle cx="50" cy="50" r="45" fill="url(#grad-base-dark)" stroke="#475569" strokeWidth="3" />
    {/* Costuras curvas técnicas del balón medicinal */}
    <path d="M 18 22 Q 50 40 82 22" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
    <path d="M 18 78 Q 50 60 82 78" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
    {/* Puntos de agarre antideslizante */}
    <circle cx="35" cy="48" r="2.2" fill="#64748b" />
    <circle cx="50" cy="45" r="2.2" fill="#64748b" />
    <circle cx="65" cy="48" r="2.2" fill="#64748b" />
    <circle cx="42" cy="56" r="2.2" fill="#64748b" />
    <circle cx="58" cy="56" r="2.2" fill="#64748b" />
    {/* Indicador de peso */}
    <text x="50" y="30" fontFamily="sans-serif" fontSize="15" fontWeight="900" fill="#f8fafc" textAnchor="middle">5K</text>
  </svg>
));

export const TokenBench = memo(() => (
  <svg viewBox="0 0 56 24" className="absolute top-0 left-0 w-[56px] h-[24px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-md)" width="100%" height="100%">
    {/* Patas metálicas / bases de apoyo */}
    <rect x="4" y="19" width="8" height="4" rx="1" fill="#4b5563" />
    <rect x="44" y="19" width="8" height="4" rx="1" fill="#4b5563" />
    <rect x="6" y="1" width="8" height="4" rx="1" fill="#4b5563" />
    <rect x="42" y="1" width="8" height="4" rx="1" fill="#4b5563" />
    <line x1="8" y1="12" x2="48" y2="12" stroke="#374151" strokeWidth="4" strokeLinecap="round" />
    {/* Acolchado del banco */}
    <rect x="2" y="4" width="52" height="16" rx="4" fill="#1f2937" stroke="#4b5563" strokeWidth="1.2" />
    <rect x="4" y="6" width="48" height="12" rx="2" fill="#374151" />
    {/* Costura central de refuerzo */}
    <line x1="28" y1="6" x2="28" y2="18" stroke="#4b5563" strokeWidth="1" strokeDasharray="2,2" />
    <line x1="6" y1="12" x2="50" y2="12" stroke="#1f2937" strokeWidth="1" strokeOpacity="0.7" />
  </svg>
));

export const TokenDumbbell = memo(() => (
  <svg viewBox="0 0 36 18" className="absolute top-0 left-0 w-[36px] h-[18px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-visible" filter="url(#shadow-sm)" width="100%" height="100%">
    {/* Barra central cromada */}
    <rect x="7" y="7.5" width="22" height="3" rx="1" fill="#9ca3af" />
    <rect x="12" y="7.5" width="12" height="3" fill="#d1d5db" />
    {/* Topes / collarines */}
    <rect x="7" y="6" width="1.5" height="6" rx="0.5" fill="#4b5563" />
    <rect x="27.5" y="6" width="1.5" height="6" rx="0.5" fill="#4b5563" />
    {/* Discos izquierdos */}
    <rect x="1" y="2" width="3.5" height="14" rx="1.5" fill="#1f2937" stroke="#4b5563" strokeWidth="0.8" />
    <rect x="4.5" y="4" width="2.5" height="10" rx="1" fill="#374151" stroke="#4b5563" strokeWidth="0.8" />
    {/* Discos derechos */}
    <rect x="29" y="4" width="2.5" height="10" rx="1" fill="#374151" stroke="#4b5563" strokeWidth="0.8" />
    <rect x="31.5" y="2" width="3.5" height="14" rx="1.5" fill="#1f2937" stroke="#4b5563" strokeWidth="0.8" />
  </svg>
));

export const TokenTextNote = memo(({ text, color }: { text: string; color?: string }) => {
  const accentColor = color || '#eab308';
  return (
    <div
      className="absolute top-0 left-0 origin-center -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#0A0A0C]/90 border-2 shadow-lg whitespace-nowrap flex items-center gap-1.5"
      style={{ borderColor: accentColor }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
      <span className="text-xs font-extrabold text-white tracking-wide drop-shadow">
        {text || 'Nota en campo'}
      </span>
    </div>
  );
});
