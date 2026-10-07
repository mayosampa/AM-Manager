import React from 'react';
import { Copy, Trash2, Palette } from 'lucide-react';
import { BoardToken } from '../../../types';
import { MATERIAL_BASE_SIZES } from '../constants';

interface Props {
  token: BoardToken;
  onDuplicate: () => void;
  onDelete: () => void;
  onColorChange?: () => void;
}

export function ContextualTokenMenu({ token, onDuplicate, onDelete, onColorChange }: Props) {
  const getBoxSize = () => MATERIAL_BASE_SIZES[token.type] || { w: 32, h: 32 };

  const scale = token.scale || 1;
  const box = getBoxSize();
  
  // El borde superior del tirador de rotaciÃ³n estÃ¡ a (box.h / 2 + 8 + 28) = box.h / 2 + 36 px del centro (sin escalar).
  // Multiplicamos esto por el scale para saber cuÃ¡nto ocupa fÃ­sicamente, y le sumamos 35px de margen de seguridad (Gap obligatorio).
  const offsetPx = (box.h / 2 + 36) * scale + 35;

  // top: y% menos la distancia calculada. Usamos translate(-50%, -100%) para que la parte INFERIOR del menÃº quede en ese punto.
  const style: React.CSSProperties = {
    left: `${token.position.x}%`,
    top: `calc(${token.position.y}% - ${offsetPx}px)`,
    transform: 'translate(-50%, -100%)'
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
          onPointerDown={(e) => {
            e.preventDefault();
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
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDuplicate();
        }}
        className="p-2 hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-white rounded-lg transition-colors"
        title="Duplicar (D)"
      >
        <Copy className="w-4 h-4" />
      </button>
      
      <button 
        onPointerDown={(e) => {
          e.preventDefault();
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

