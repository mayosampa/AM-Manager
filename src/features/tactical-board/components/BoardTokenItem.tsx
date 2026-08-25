import React from 'react';
import { BoardToken } from '../../../types';
import { RotateCw, X } from 'lucide-react';

interface Props {
  key?: React.Key;
  token: BoardToken;
  isSelected: boolean;
  isAnimating?: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onRotateStart?: (e: React.PointerEvent, id: string) => void;
  onDelete?: (id: string) => void;
}

export function BoardTokenItem({ token, isSelected, isAnimating = false, onPointerDown, onRotateStart, onDelete }: Props) {
  const transitionClass = isAnimating ? 'transition-all duration-[1500ms] ease-in-out' : '';

  const renderContent = () => {
    if (token.type === 'cone') {
      return (
        <div className="absolute w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-l-transparent border-r-transparent border-b-red-500 drop-shadow-md origin-bottom -translate-x-1/2 -translate-y-full" />
      );
    }
    if (token.type === 'pole') {
      return (
        <div className="absolute w-1.5 h-8 bg-yellow-400 shadow-md origin-center -translate-x-1/2 -translate-y-1/2" />
      );
    }
    if (token.type === 'mini-goal') {
      return (
        <div className="absolute w-12 h-6 border-t-4 border-l-4 border-r-4 border-white/80 bg-white/10 shadow-md origin-center -translate-x-1/2 -translate-y-1/2" />
      );
    }
    if (token.type === 'ladder') {
      return (
        <div className="absolute w-20 h-6 border-2 border-yellow-400 flex justify-between px-1 shadow-md origin-center -translate-x-1/2 -translate-y-1/2">
          {[1,2,3,4,5].map(i => <div key={i} className="w-0.5 h-full bg-yellow-400" />)}
        </div>
      );
    }
    if (token.type === 'ring') {
      return (
        <div className="absolute w-8 h-8 border-4 border-[#3b82f6] rounded-full shadow-md origin-center -translate-x-1/2 -translate-y-1/2" />
      );
    }
    if (token.type === 'hurdle') {
      return (
        <div className="absolute w-10 h-4 border-x-4 border-t-4 border-b-0 border-[#f43f5e] shadow-md origin-center -translate-x-1/2 -translate-y-1/2" />
      );
    }
    if (token.type === 'ball') {
      return (
        <div className="absolute w-6 h-6 origin-center -translate-x-1/2 -translate-y-1/2">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md pointer-events-none">
            <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#121215" strokeWidth="3"/>
            {/* Center Black Pentagon */}
            <polygon points="50,22 75,40 65,68 35,68 25,40" fill="#121215" stroke="#121215" strokeLinejoin="round" strokeWidth="2"/>
            {/* Seam lines radiating outwards */}
            <line x1="50" y1="22" x2="50" y2="2" stroke="#121215" strokeWidth="3" strokeLinecap="round"/>
            <line x1="75" y1="40" x2="95" y2="35" stroke="#121215" strokeWidth="3" strokeLinecap="round"/>
            <line x1="65" y1="68" x2="80" y2="88" stroke="#121215" strokeWidth="3" strokeLinecap="round"/>
            <line x1="35" y1="68" x2="20" y2="88" stroke="#121215" strokeWidth="3" strokeLinecap="round"/>
            <line x1="25" y1="40" x2="5" y2="35" stroke="#121215" strokeWidth="3" strokeLinecap="round"/>
            {/* Outer cut-off black shapes to create the illusion of spherical pentagons */}
            <path d="M50,2 L65,8 A48,48 0 0,0 35,8 Z" fill="#121215"/>
            <path d="M95,35 L96,55 A48,48 0 0,0 85,15 Z" fill="#121215"/>
            <path d="M80,88 L65,95 A48,48 0 0,0 93,75 Z" fill="#121215"/>
            <path d="M20,88 L5,75 A48,48 0 0,0 35,95 Z" fill="#121215"/>
            <path d="M5,35 L15,15 A48,48 0 0,0 4,55 Z" fill="#121215"/>
          </svg>
        </div>
      );
    }

    const isHome = token.team === 'home';
    const bgColor = token.color ? '' : (isHome ? 'bg-[#f43f5e]' : 'bg-[#3b82f6]');
    const customStyle = token.color ? { backgroundColor: token.color } : {};
    const textColor = 'text-white';
    const borderColor = 'border-white/20';

    return (
      <div className={`absolute origin-center -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1`}>
        <div 
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shadow-xl ${bgColor} ${textColor} ${borderColor}`}
          style={customStyle}
        >
          {token.label}
        </div>
        {token.playerName && (
          <span className="text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
            {token.playerName.split(' ')[0]}
          </span>
        )}
      </div>
    );
  };

  // Determinar tamaño aproximado de bounding box para cada token para que quede bien el marco
  const getBoxSize = () => {
    switch (token.type) {
      case 'ladder': return { w: 88, h: 32 };
      case 'mini-goal': return { w: 56, h: 32 };
      case 'hurdle': return { w: 48, h: 24 };
      case 'pole': return { w: 16, h: 40 };
      case 'cone': return { w: 24, h: 24 };
      case 'ball': return { w: 28, h: 28 };
      default: return { w: 40, h: 40 }; // ring, player
    }
  };

  const box = getBoxSize();

  return (
    <div
      id={`token-${token.id}`}
      className={`absolute z-10 touch-none select-none cursor-grab active:cursor-grabbing origin-center group pointer-events-auto ${transitionClass}`}
      style={{ left: `${token.position.x}%`, top: `${token.position.y}%`, transform: `rotate(${token.rotation || 0}deg)` }}
      onPointerDown={(e) => onPointerDown(e, token.id)}
    >
      <div className="relative flex items-center justify-center w-0 h-0">
        {/* Render child shape */}
        {renderContent()}

        {/* Selected Bounding Box & Transformation Controls */}
        <div 
          className={`absolute border border-dashed border-[#FF4B4B] pointer-events-none transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ width: box.w, height: box.h, transform: 'translate(-50%, -50%)' }}
        >
          {/* Top Rotation Handle Line */}
          <div className="absolute -top-8 left-1/2 w-px h-8 bg-[#FF4B4B]" />
          {/* Top Rotation Handle Dot */}
          <div 
            className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#121215] border-2 border-[#FF4B4B] rounded-full pointer-events-auto cursor-crosshair flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (onRotateStart) onRotateStart(e, token.id);
            }}
          >
            <RotateCw className="w-4 h-4 text-[#FF4B4B]" />
          </div>

          {/* Delete Button Handle */}
          <div 
            className="absolute -top-3 -right-3 w-6 h-6 bg-[#FF4B4B] border-2 border-[#121215] rounded-full pointer-events-auto cursor-pointer flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-20"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(token.id);
            }}
          >
            <X className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
