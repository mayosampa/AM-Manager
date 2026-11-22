import React from 'react';
import { Copy, Trash2, Palette, Type, Pencil, Minus, Plus } from 'lucide-react';
import { BoardToken } from '../../../types';
import { MATERIAL_BASE_SIZES } from '../constants';

interface Props {
  token: BoardToken;
  onDuplicate: () => void;
  onDelete: () => void;
  onColorChange?: () => void;
  onEdit?: () => void;
  onScaleDelta?: (delta: number) => void;
}

export function ContextualTokenMenu({
  token,
  onDuplicate,
  onDelete,
  onColorChange,
  onEdit,
  onScaleDelta,
}: Props) {
  const getBoxSize = () => {
    if (token.type === 'text') {
      const lineCount = Math.max(1, (token.label || '').split('\n').length);
      return { w: token.width || 220, h: token.height || Math.max(56, lineCount * 22 + 32) };
    }
    return MATERIAL_BASE_SIZES[token.type] || { w: 32, h: 32 };
  };

  const scale = token.scale || 1;
  const box = getBoxSize();

  const offsetPx = (box.h / 2 + 36) * scale + 32;
  const isNearTop = token.position.y < 22;

  const style: React.CSSProperties = isNearTop
    ? {
        left: `${token.position.x}%`,
        top: `calc(${token.position.y}% + ${(box.h / 2 + 18) * scale}px)`,
        transform: 'translate(-50%, 0%)',
      }
    : {
        left: `${token.position.x}%`,
        top: `calc(${token.position.y}% - ${offsetPx}px)`,
        transform: 'translate(-50%, -100%)',
      };

  return (
    <div
      id="contextual-token-menu"
      data-export-exclude="true"
      className="absolute z-[60] flex items-center gap-1 p-1 bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-md shadow-md transition-opacity duration-200 animate-in fade-in zoom-in-95 pointer-events-auto"
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Mini-barra de redimensionado (− / +) */}
      {onScaleDelta && (
        <>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onScaleDelta(-0.15);
            }}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
            title="Reducir tamaño (−)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-500 px-1 select-none">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onScaleDelta(0.15);
            }}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
            title="Aumentar tamaño (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
        </>
      )}

      {/* Botón Editar (Lápiz / Texto / Dorsal / Color) */}
      {token.type === 'text' && (onEdit || onColorChange) ? (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onEdit) onEdit();
            else if (onColorChange) onColorChange();
          }}
          className="flex items-center gap-1 px-2 py-1 hover:bg-emerald-50 text-emerald-700 rounded transition-colors text-xs font-semibold cursor-pointer"
          title="Editar Texto, Tamaño y Color"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Formato</span>
        </button>
      ) : onEdit ? (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="w-7 h-7 flex items-center justify-center hover:bg-emerald-50 text-emerald-700 rounded transition-colors cursor-pointer"
          title="Editar dorsal, nombre o color"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      ) : null}

      {onColorChange && token.type !== 'text' && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onColorChange();
          }}
          className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
          title="Cambiar Color"
        >
          <Palette className="w-3.5 h-3.5" />
        </button>
      )}

      {(onColorChange || onEdit) && <div className="w-px h-4 bg-slate-200 mx-0.5" />}

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDuplicate();
        }}
        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
        title="Duplicar"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="w-7 h-7 flex items-center justify-center hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
        title="Eliminar (Supr)"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
