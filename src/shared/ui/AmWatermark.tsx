import React from 'react';

interface AmWatermarkProps {
  className?: string;
}

/**
 * Marca de agua geométrica gigante del monograma "AM" para fondos claros editoriales
 * (patrón QuintaAmarilla Editorial Light).
 */
export const AmWatermark: React.FC<AmWatermarkProps> = ({
  className = 'w-[420px] h-[420px] opacity-[0.045] text-slate-900',
}) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 512 512"
      fill="none"
      className={`pointer-events-none select-none -rotate-6 ${className}`}
    >
      {/* Letra A geométrica */}
      <path d="M38 365 L138 146 H188 L242 252 L205 274 L163 190 L86 365 H38 Z" fill="currentColor" />
      <path d="M221 304 L258 282 L302 365 H252 L221 304 Z" fill="currentColor" />
      {/* Trazo central y M geométrica */}
      <path d="M225 146 H273 L296 182 L250 193 L274 216 L246 240 L225 198 V146 Z" fill="currentColor" />
      <path d="M293 259 L307 248 L330 270 L335 244 L350 268 L428 146 H474 V365 H429 V220 L362 325 H338 L293 259 Z" fill="currentColor" />
      {/* Balón y trayectoria táctica */}
      <circle cx="151" cy="310" r="18" stroke="currentColor" strokeWidth="14" fill="none" />
      <path d="M168 305 C208 295 256 268 295 224" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
      <path d="M270 198 L338 183 L325 251 L270 198 Z" fill="currentColor" />
    </svg>
  );
};
