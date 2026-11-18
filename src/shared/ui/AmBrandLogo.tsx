import React, { useState } from 'react';

export interface AmBrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  variant?: 'dark' | 'light';
  className?: string;
}

const SIZE_MAP = {
  sm: {
    box: 'w-9 h-9 rounded-md p-1',
    title: 'text-[13px]',
    badge: 'text-[9px] px-1.5 py-0.5',
    sub: 'text-[10px]',
    layout: 'flex-row items-center gap-2.5',
  },
  md: {
    box: 'w-10 h-10 rounded-lg p-1.5',
    title: 'text-[15px]',
    badge: 'text-[10px] px-1.5 py-0.5',
    sub: 'text-[11px]',
    layout: 'flex-row items-center gap-2.5',
  },
  lg: {
    box: 'w-14 h-14 rounded-lg p-2',
    title: 'text-[18px]',
    badge: 'text-[10px] px-2 py-0.5',
    sub: 'text-[12px]',
    layout: 'flex-col items-center gap-2.5 text-center',
  },
  xl: {
    box: 'w-20 h-20 rounded-lg p-2.5',
    title: 'text-[22px]',
    badge: 'text-[11px] px-2 py-0.5',
    sub: 'text-[12px]',
    layout: 'flex-col items-center gap-3 text-center',
  },
} as const;

export const AmBrandLogo: React.FC<AmBrandLogoProps> = ({
  size = 'md',
  showText = false,
  subtitle,
  variant = 'dark',
  className = '',
}) => {
  const [imgSourceIndex, setImgSourceIndex] = useState(0);
  const sources = ['/am-logo.png', '/logo.png', '/am-logo.svg'];
  const s = SIZE_MAP[size];
  const isLight = variant === 'light';

  return (
    <div className={`inline-flex ${s.layout} select-none ${className}`}>
      <div
        className={`${s.box} bg-[#11141A] border ${
          isLight ? 'border-slate-300' : 'border-[#1E242E]'
        } shadow-sm flex items-center justify-center shrink-0 overflow-hidden`}
      >
        {imgSourceIndex < sources.length ? (
          <img
            src={sources[imgSourceIndex]}
            alt="AM Manager"
            className="w-full h-full object-contain"
            onError={() => setImgSourceIndex(prev => prev + 1)}
          />
        ) : (
          <svg viewBox="0 0 512 512" fill="none" className="w-full h-full">
            <path d="M38 365 L138 146 H188 L242 252 L205 274 L163 190 L86 365 H38 Z" fill="#E51923" />
            <path d="M221 304 L258 282 L302 365 H252 L221 304 Z" fill="#E51923" />
            <path d="M225 146 H273 L296 182 L250 193 L274 216 L246 240 L225 198 V146 Z" fill="#E51923" />
            <path d="M293 259 L307 248 L330 270 L335 244 L350 268 L428 146 H474 V365 H429 V220 L362 325 H338 L293 259 Z" fill="#E51923" />
            <circle cx="151" cy="310" r="16" stroke="#E51923" strokeWidth="11" fill="#0D131A" />
            <path d="M166 306 C206 296 254 270 293 226" stroke="#E51923" strokeWidth="18" strokeLinecap="round" />
            <path d="M270 198 L338 183 L325 251 L270 198 Z" fill="#E51923" />
          </svg>
        )}
      </div>

      {showText && (
        <div className={size === 'lg' || size === 'xl' ? 'flex flex-col items-center' : 'flex flex-col min-w-0'}>
          <div className="flex items-center gap-2">
            <span
              className={`${s.title} font-bold tracking-tight leading-none ${
                isLight ? 'text-slate-900' : 'text-[#EDEDED]'
              }`}
            >
              AM Manager
            </span>
            <span
              className={`${s.badge} font-mono font-semibold uppercase tracking-wider rounded border leading-none ${
                isLight
                  ? 'bg-[#059669]/10 border-[#059669]/30 text-[#059669]'
                  : 'bg-[#059669]/15 border-[#059669]/35 text-emerald-400'
              }`}
            >
              PRO
            </span>
          </div>
          {subtitle && (
            <p
              className={`${s.sub} mt-1.5 leading-snug max-w-xs ${
                isLight ? 'text-slate-600' : 'text-[#888888]'
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
