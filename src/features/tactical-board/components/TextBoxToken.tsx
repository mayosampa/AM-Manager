import React, { memo, useState, useRef, useEffect } from 'react';
import { Pencil, Check } from 'lucide-react';
import { BoardToken } from '../../../types';

interface Props {
  token: BoardToken;
  isSelected: boolean;
  isEditing: boolean;
  dynamicWidth?: number;
  dynamicHeight?: number;
  onStartEdit: () => void;
  onSaveEdit: (newText: string) => void;
  onHeightChange?: (h: number) => void;
}

export const TextBoxToken = memo(({
  token,
  isSelected,
  isEditing,
  dynamicWidth,
  dynamicHeight,
  onStartEdit,
  onSaveEdit,
  onHeightChange,
}: Props) => {
  const [draftText, setDraftText] = useState(token.label || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const accentColor = token.color || '#eab308';
  const widthPx = dynamicWidth || token.width || 220;
  const heightPx = dynamicHeight || token.height;
  const fontSizePx = token.fontSize || 13;

  // Sync draft text when token.label updates externally
  useEffect(() => {
    setDraftText(token.label || '');
  }, [token.label]);

  // Focus and select textarea content when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    } else if (!isEditing && textareaRef.current) {
      textareaRef.current.blur();
    }
  }, [isEditing]);

  // Report height changes to parent for bounding box synchronization
  useEffect(() => {
    if (containerRef.current && onHeightChange) {
      const h = containerRef.current.offsetHeight;
      if (h > 0) onHeightChange(h);
    }
  });

  const handleCommit = () => {
    onSaveEdit(draftText);
  };

  const rowsCount = Math.max(2, Math.min(8, (draftText || '').split('\n').length));

  return (
    <div
      ref={containerRef}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isEditing) {
          onStartEdit();
        }
      }}
      className={`absolute top-0 left-0 origin-center -translate-x-1/2 -translate-y-1/2 px-3.5 py-2.5 rounded-lg bg-[#0A0A0C]/92 backdrop-blur-md border shadow-xl flex flex-col gap-1 transition-shadow touch-none ${
        isEditing
          ? 'z-30 select-text cursor-default'
          : 'select-none cursor-grab active:cursor-grabbing group/textbox'
      } ${isSelected ? 'ring-1' : 'hover:border-white/40'}`}
      style={{
        width: `${widthPx}px`,
        height: heightPx ? `${heightPx}px` : undefined,
        minHeight: heightPx ? undefined : '56px',
        borderColor: accentColor,
        boxShadow: isEditing
          ? `0 0 0 2px ${accentColor}55, 0 14px 28px rgba(0,0,0,0.6)`
          : isSelected
          ? `0 0 0 1px ${accentColor}60, 0 12px 24px -4px rgba(0,0,0,0.6)`
          : '0 6px 16px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* Top Header Strip (Always initiates drag when not clicking the edit button) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-0.5 shrink-0 select-none cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: accentColor }} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isEditing ? 'text-emerald-400' : 'text-[#A1A1AA]'}`}>
            {isEditing ? 'Editando Nota' : 'Nota Táctica'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isEditing && isSelected && (
            <span className="text-[9px] text-[#A1A1AA] italic opacity-85 pointer-events-none hidden sm:inline">
              Doble clic para escribir
            </span>
          )}
          <button
            type="button"
            data-export-exclude="true"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) {
                handleCommit();
              } else {
                onStartEdit();
              }
            }}
            className={`h-5 px-1.5 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer pointer-events-auto ${
              isEditing
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white'
            }`}
            title={isEditing ? 'Guardar texto (Esc)' : 'Escribir en la nota'}
          >
            {isEditing ? (
              <>
                <Check className="w-2.5 h-2.5" />
                <span>Listo</span>
              </>
            ) : (
              <>
                <Pencil className="w-2.5 h-2.5" />
                <span>Editar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Textarea body: pointer-events-none while isEditing === false so dragging works from ANY point on the card */}
      <textarea
        ref={textareaRef}
        value={draftText}
        readOnly={!isEditing}
        tabIndex={isEditing ? 0 : -1}
        onChange={(e) => setDraftText(e.target.value)}
        onPointerDown={(e) => {
          if (isEditing) {
            e.stopPropagation();
          }
        }}
        onClick={(e) => {
          if (isEditing) {
            e.stopPropagation();
          }
        }}
        onBlur={() => {
          if (isEditing) {
            handleCommit();
          }
        }}
        onKeyDown={(e) => {
          if (!isEditing) return;
          e.stopPropagation();
          if (e.key === 'Escape') {
            e.preventDefault();
            handleCommit();
          } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleCommit();
          }
        }}
        rows={rowsCount}
        className={`w-full bg-transparent text-white font-medium leading-relaxed outline-none resize-none p-0 custom-scrollbar flex-1 ${
          isEditing
            ? 'pointer-events-auto select-text cursor-text'
            : 'pointer-events-none select-none cursor-grab overflow-hidden'
        }`}
        style={{ fontSize: `${fontSizePx}px` }}
        placeholder="Escribe una nota táctica... (doble clic)"
      />
    </div>
  );
});
