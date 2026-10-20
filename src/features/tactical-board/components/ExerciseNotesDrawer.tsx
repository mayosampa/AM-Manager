import React from 'react';
import { X, FileText, FileDown, Save, Loader2, Sparkles } from 'lucide-react';

export interface ExerciseMetaState {
  id?: string;
  createdAt?: number;
  title: string;
  category: string;
  duration: number;
  modality: 'F7' | 'F11' | 'Universal';
  notes: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  meta: ExerciseMetaState;
  onChangeMeta: React.Dispatch<React.SetStateAction<ExerciseMetaState>>;
  categories: string[];
  onExportPDF: () => void;
  isPdfLoading: boolean;
  onSaveToLibrary: () => void;
  isSaving: boolean;
}

const QUICK_SECTIONS = [
  { label: '+ Objetivo', snippet: 'OBJETIVO:\n• ' },
  { label: '+ Desarrollo', snippet: 'DESARROLLO:\n• ' },
  { label: '+ Reglas', snippet: 'REGLAS Y CONDICIONANTES:\n• ' },
  { label: '+ Espacio', snippet: 'ESPACIO Y TIEMPO:\n• ' },
  { label: '+ Variantes', snippet: 'VARIANTES:\n• ' },
];

export function ExerciseNotesDrawer({
  isOpen,
  onClose,
  meta,
  onChangeMeta,
  categories,
  onExportPDF,
  isPdfLoading,
  onSaveToLibrary,
  isSaving,
}: Props) {
  if (!isOpen) return null;

  const appendSnippet = (snippet: string) => {
    onChangeMeta(prev => {
      const current = prev.notes || '';
      const prefix = current.trim().length > 0 ? `${current.replace(/\s+$/, '')}\n\n` : '';
      return { ...prev, notes: `${prefix}${snippet}` };
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[140] w-full sm:w-[400px] bg-[#0A0A0A]/95 backdrop-blur-xl border-l border-[#1F1F1F] shadow-[0_0_50px_rgba(0,0,0,0.75)] flex flex-col animate-in slide-in-from-right duration-200 pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1F1F] bg-[#050505]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#161616] border border-[#333333] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#EDEDED]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Notas y Explicación
            </h3>
            <p className="text-[11px] text-[#888888]">
              Se incluirán al descargar el PDF y guardar
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#111111] transition-colors"
          title="Cerrar panel de notas"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-1.5">
            Título del Ejercicio
          </label>
          <input
            type="text"
            value={meta.title}
            onChange={e => onChangeMeta(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ej: Posesión 4v4+3 con transición ofensiva"
            className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#525252]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-1.5">
              Categoría
            </label>
            <select
              value={meta.category}
              onChange={e => onChangeMeta(prev => ({ ...prev, category: e.target.value }))}
              className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-[#525252]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-1.5">
              Duración (min)
            </label>
            <input
              type="number"
              min={1}
              value={meta.duration}
              onChange={e => onChangeMeta(prev => ({ ...prev, duration: Math.max(1, Number(e.target.value) || 1) }))}
              className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#525252]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-1.5">
            Modalidad
          </label>
          <div className="flex bg-[#111111] border border-[#1F1F1F] rounded-md p-1">
            {(['Universal', 'F7', 'F11'] as const).map(mod => (
              <button
                key={mod}
                type="button"
                onClick={() => onChangeMeta(prev => ({ ...prev, modality: mod }))}
                className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-colors ${
                  meta.modality === mod
                    ? 'bg-[#EDEDED] text-[#0A0A0A] shadow'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                {mod === 'Universal' ? 'Universal' : mod}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider">
              Explicación / Notas del Ejercicio
            </label>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Visible en el PDF
            </span>
          </div>

          {/* Quick section chips */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_SECTIONS.map(sec => (
              <button
                key={sec.label}
                type="button"
                onClick={() => appendSnippet(sec.snippet)}
                className="px-2 py-1 text-[10px] font-bold bg-[#111111] hover:bg-[#1A1A1A] text-[#888888] hover:text-white border border-[#1F1F1F] rounded-md transition-colors"
              >
                {sec.label}
              </button>
            ))}
          </div>

          <textarea
            value={meta.notes}
            onChange={e => onChangeMeta(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Explica aquí el desarrollo del ejercicio, objetivos tácticos, reglas de provocación, dimensiones del espacio, número de toques o variantes..."
            className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md p-3.5 text-sm text-white leading-relaxed focus:outline-none focus:border-[#525252] resize-y min-h-[210px]"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[#1F1F1F] bg-[#050505]/80 flex flex-col gap-2">
        <button
          type="button"
          onClick={onExportPDF}
          disabled={isPdfLoading}
          className="w-full py-2.5 px-4 rounded-md bg-[#111111] hover:bg-[#1A1A1A] border border-[#333333] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isPdfLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#EDEDED]" />
          ) : (
            <FileDown className="w-4 h-4 text-[#EDEDED]" />
          )}
          <span>{isPdfLoading ? 'Generando PDF…' : 'Descargar PDF con Notas'}</span>
        </button>

        <button
          type="button"
          onClick={onSaveToLibrary}
          disabled={!meta.title.trim() || meta.duration < 1 || isSaving}
          className="w-full py-2.5 px-4 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={!meta.title.trim() ? 'Escribe un título para guardar en la biblioteca' : 'Guardar ejercicio en la biblioteca'}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Guardar en Biblioteca</span>
        </button>
      </div>
    </div>
  );
}
