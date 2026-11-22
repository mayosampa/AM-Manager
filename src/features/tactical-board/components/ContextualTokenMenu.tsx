import React from 'react';
import { Copy, Trash2, Palette, Type } from 'lucide-react';
import { BoardToken } from '../../../types';
import { MATERIAL_BASE_SIZES } from '../constants';

interface Props {
  token: BoardToken;
  onDuplicate: () => void;
  onDelete: () => void;
  onColorChange?: () => void;
  onEdit?: () => void;
}

export function ContextualTokenMenu({ token, onDuplicate, onDelete, onColorChange, onEdit }: Props) {
  const getBoxSize = () => {
    if (token.type === 'text') {
      const lineCount = Math.max(1, (token.label || '').split('\n').length);
      return { w: token.width || 220, h: Math.max(52, lineCount * 22 + 28) };
    }
    return MATERIAL_BASE_SIZES[token.type] || { w: 32, h: 32 };
  };

  const scale = token.scale || 1;
  const box = getBoxSize();
  
  // El borde superior del tirador de rotación está a (box.h / 2 + 8 + 28) = box.h / 2 + 36 px del centro (sin escalar).
  // Multiplicamos esto por el scale para saber cuánto ocupa físicamente, y le sumamos 35px de margen de seguridad (Gap obligatorio).
  const offsetPx = (box.h / 2 + 36) * scale + 35;

  // top: y% menos la distancia calculada. Usamos translate(-50%, -100%) para que la parte INFERIOR del menú quede en ese punto.
  const style: React.CSSProperties = {
    left: `${token.position.x}%`,
    top: `calc(${token.position.y}% - ${offsetPx}px)`,
    transform: 'translate(-50%, -100%)'
  };

  return (
    <div 
      id="contextual-token-menu"
      data-export-exclude="true"
      className="absolute z-[60] flex items-center gap-1 p-1 bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-md shadow-md transition-opacity duration-200 animate-in fade-in zoom-in-95 pointer-events-auto"
      style={style}
    >
      {token.type === 'text' && (onEdit || onColorChange) ? (
        <button 
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onEdit) onEdit();
            else if (onColorChange) onColorChange();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg transition-colors text-xs font-semibold"
          title="Editar Texto y Formato"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Editar Texto</span>
        </button>
      ) : onColorChange ? (
        <button 
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onColorChange();
          }}
          className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          title="Cambiar Color"
        >
          <Palette className="w-4 h-4" />
        </button>
      ) : null}

      {(onColorChange || onEdit) && <div className="w-px h-4 bg-slate-200 mx-1" />}

      <button 
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDuplicate();
        }}
        className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
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
        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
        title="Eliminar (Supr)"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
