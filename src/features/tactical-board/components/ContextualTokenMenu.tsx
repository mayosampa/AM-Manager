import React from 'react';
import { Copy, Trash2, Palette } from 'lucide-react';
import { BoardToken } from '../../../types';

interface Props {
  token: BoardToken;
  onDuplicate: () => void;
  onDelete: () => void;
  onColorChange?: () => void;
}

export function ContextualTokenMenu({ token, onDuplicate, onDelete, onColorChange }: Props) {
  const getBoxSize = () => {
    switch (token.type) {
      case 'ladder': return { w: 40, h: 128 };
      case 'goal': return { w: 90, h: 40 };
      case 'hurdle': return { w: 48, h: 32 };
      case 'dummy': return { w: 40, h: 48 };
      case 'pole': return { w: 24, h: 48 };
      case 'pole-ground': return { w: 128, h: 32 };
      case 'cone': return { w: 32, h: 32 };
      case 'flat-cone': return { w: 32, h: 32 };
      case 'ball': return { w: 24, h: 24 };
      case 'medicine-ball': return { w: 32, h: 32 };
      case 'ring': return { w: 40, h: 40 };
      default: return { w: 32, h: 32 };
    }
  };

  const scale = token.scale || 1;
  const box = getBoxSize();
  const offsetPx = (box.h / 2) * scale + 50;

  // Posicionamos el menú centrado por encima del token (respetando su altura y escala)
  const style: React.CSSProperties = {
    left: `${token.position.x}%`,
    top: `calc(${token.position.y}% - ${offsetPx}px)`,
    transform: 'translateX(-50%)'
  };

  return (
    <div 
      id="contextual-token-menu"
      data-export-exclude="true"
      className="absolute z-[60] flex items-center gap-1 p-1 bg-[#0A0A0C]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-opacity duration-200 animate-in fade-in zoom-in-95 pointer-events-auto"
      style={style}
    >
      {onColorChange && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onColorChange();
          }}
          className="p-2 hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-white rounded-lg transition-colors"
          title="Cambiar Color"
        >
          <Palette className="w-4 h-4" />
        </button>
      )}

      {onColorChange && <div className="w-px h-4 bg-[#2A2A2E] mx-1" />}

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="p-2 hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-white rounded-lg transition-colors"
        title="Duplicar (D)"
      >
        <Copy className="w-4 h-4" />
      </button>
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-2 hover:bg-[#FF4B4B]/20 text-[#E63939] hover:text-[#FF4B4B] rounded-lg transition-colors"
        title="Eliminar (Supr)"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
