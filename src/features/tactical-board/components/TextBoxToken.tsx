import React, { memo, useState, useRef, useEffect } from 'react';
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

  if (isEditing) {
    return (
      <div
        ref={containerRef}
        className="absolute top-0 left-0 origin-center -translate-x-1/2 -translate-y-1/2 px-3.5 py-2.5 rounded-lg bg-[#0A0A0C]/95 backdrop-blur-md border shadow-2xl flex flex-col gap-1.5 z-30 select-text"
        style={{
          width: `${widthPx}px`,
          minHeight: heightPx ? `${heightPx}px` : undefined,
          borderColor: accentColor,
          boxShadow: `0 0 0 2px ${accentColor}40, 0 14px 28px rgba(0,0,0,0.6)`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-0.5 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Editando Nota
            </span>
          </div>
          <span className="text-[9px] text-[#A1A1AA]">Esc o clic fuera para guardar</span>
        </div>
        <textarea
          ref={textareaRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              handleCommit();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleCommit();
            }
          }}
          rows={Math.max(2, Math.min(8, (draftText || '').split('\n').length))}
          className="w-full bg-transparent text-white font-medium leading-relaxed outline-none resize-none p-0 custom-scrollbar flex-1"
          style={{ fontSize: `${fontSizePx}px` }}
          placeholder="Escribe aquí las instrucciones tácticas (Enter para nuevo renglón)..."
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      className={`absolute top-0 left-0 origin-center -translate-x-1/2 -translate-y-1/2 px-3.5 py-2.5 rounded-lg bg-[#0A0A0C]/90 backdrop-blur-md border shadow-xl flex flex-col gap-1 transition-all select-none group/textbox ${
        isSelected ? 'ring-1' : 'hover:border-white/40'
      }`}
      style={{
        width: `${widthPx}px`,
        height: heightPx ? `${heightPx}px` : undefined,
        minHeight: heightPx ? undefined : '32px',
        borderColor: accentColor,
        boxShadow: isSelected
          ? `0 0 0 1px ${accentColor}60, 0 12px 24px -4px rgba(0,0,0,0.6)`
          : '0 6px 16px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Strip (PowerPoint Style card header) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-0.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: accentColor }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            Nota Táctica
          </span>
        </div>
        {isSelected && (
          <span className="text-[9px] text-[#71717A] italic opacity-80">Doble clic para editar</span>
        )}
      </div>

      {/* Multiline Text Body */}
      <p
        className="text-white font-medium leading-relaxed whitespace-pre-wrap break-words m-0 drop-shadow-sm flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ fontSize: `${fontSizePx}px` }}
      >
        {token.label ? (
          token.label
        ) : (
          <span className="text-[#71717A] italic text-xs">Escribe una nota táctica... (doble clic)</span>
        )}
      </p>
    </div>
  );
});
