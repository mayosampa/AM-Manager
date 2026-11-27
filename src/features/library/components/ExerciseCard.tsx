import React from 'react';
import {
  BookmarkPlus, Check, Edit2, Eye, FileDown, FileText, Film,
  Globe, Loader2, Lock, Paintbrush, Trash2, Users, Video, Ruler
} from 'lucide-react';
import { Exercise } from '../../../context/SessionContext';
import { getOrRenderExerciseThumbnail } from '../../../services/tacticalThumbnail';

interface ExerciseCardProps {
  key?: React.Key;
  exercise: Exercise;
  variant: 'private' | 'community';
  categoryLabel: string;
  categoryBadgeClass: string;
  isExportingVideo: boolean;
  exportProgress: number;
  isBusyVideo: boolean;
  isExportingPdf: boolean;
  isCloning?: boolean;
  isCloned?: boolean;
  onPreview: () => void;
  onOpenInBoard: () => void;
  onExportVideo: () => void;
  onExportPdf: () => void;
  onCloneToPrivate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleShare?: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  variant,
  categoryLabel,
  categoryBadgeClass,
  isExportingVideo,
  exportProgress,
  isBusyVideo,
  isExportingPdf,
  isCloning,
  isCloned,
  onPreview,
  onOpenInBoard,
  onExportVideo,
  onExportPdf,
  onCloneToPrivate,
  onEdit,
  onDelete,
  onToggleShare,
}) => {
  const thumbUrl = getOrRenderExerciseThumbnail(exercise);
  const framesCount = exercise.scenes?.length || exercise.frames?.length || 0;
  const hasAnimation = framesCount > 1;
  const duration = exercise.duration || exercise.durationMin;
  const formatBadge = exercise.format || (exercise.modality && exercise.modality !== 'Universal' ? exercise.modality : 'Ambos');
  const summaryText = exercise.description || exercise.notes || '';

  return (
    <article className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all">
      {/* Miniatura visual del campo (aspect 105:68) */}
      <button
        type="button"
        onClick={onPreview}
        className="relative w-full aspect-[105/68] bg-[#14532d] overflow-hidden border-b border-slate-200 cursor-pointer text-left shrink-0"
        title="Previsualizar diagrama y animación"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={exercise.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#15803d]/90 text-white/80 text-[11px] font-medium gap-1">
            <Paintbrush className="w-4 h-4" />
            <span>Sin diagrama guardado</span>
          </div>
        )}

        {/* Badges superiores sobre la miniatura */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1.5 pointer-events-none">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shadow-xs ${
              exercise.isCommunityOfficial
                ? 'bg-emerald-600/95 text-white'
                : exercise.isSharedToCommunity
                ? 'bg-blue-600/95 text-white'
                : 'bg-slate-900/80 text-white'
            }`}
          >
            {exercise.isCommunityOfficial ? (
              <>
                <Globe className="w-2.5 h-2.5" />
                <span>Oficial AM</span>
              </>
            ) : exercise.isSharedToCommunity ? (
              <>
                <Globe className="w-2.5 h-2.5" />
                <span>Compartido</span>
              </>
            ) : (
              <>
                <Lock className="w-2.5 h-2.5" />
                <span>Privado</span>
              </>
            )}
          </span>

          <div className="flex items-center gap-1">
            {hasAnimation && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-emerald-300 text-[10px] font-mono font-semibold">
                <Film className="w-2.5 h-2.5" />
                {framesCount}f
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-white/95 text-slate-800 text-[10px] font-mono font-bold shadow-xs">
              {formatBadge}
            </span>
          </div>
        </div>

        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="px-2.5 py-1 rounded-md bg-white/95 text-slate-900 text-[11px] font-semibold shadow-sm flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-[#059669]" />
            Vista previa
          </span>
        </div>
      </button>

      {/* Cuerpo de metadatos */}
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${categoryBadgeClass}`}>
            {categoryLabel}
          </span>
          {duration && (
            <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              {duration}&apos;
            </span>
          )}
        </div>

        <h3 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2">{exercise.title || 'Sin Título'}</h3>

        {(exercise.dimensions || exercise.playersCount) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
            {exercise.dimensions && (
              <span className="inline-flex items-center gap-1">
                <Ruler className="w-3 h-3 text-slate-400" />
                {exercise.dimensions}
              </span>
            )}
            {exercise.playersCount && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                {exercise.playersCount}
              </span>
            )}
          </div>
        )}

        {summaryText && (
          <p className="text-[12px] text-slate-600 line-clamp-2 flex items-start gap-1.5 leading-relaxed">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{summaryText}</span>
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
          <span className="text-[10.5px] font-medium text-slate-400 truncate">
            {exercise.authorName || (variant === 'private' ? 'Tu biblioteca privada' : 'AM Manager · Metodología')}
          </span>
          {variant === 'private' && onToggleShare && !exercise.isCommunityOfficial && (
            <button
              type="button"
              onClick={onToggleShare}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                exercise.isSharedToCommunity
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title={
                exercise.isSharedToCommunity
                  ? 'Visible en Biblioteca Común (clic para volver a solo privado)'
                  : 'Compartir voluntariamente en Biblioteca Común'
              }
            >
              <Globe className="w-2.5 h-2.5" />
              <span>{exercise.isSharedToCommunity ? 'Compartido' : 'Compartir'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Botonera inferior */}
      {variant === 'community' ? (
        <div className="border-t border-slate-200 bg-slate-50 p-2 space-y-1.5">
          {onCloneToPrivate && (
            <button
              type="button"
              onClick={onCloneToPrivate}
              disabled={isCloning}
              className={`w-full h-8 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isCloned
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-[#059669] hover:bg-[#047857] text-white shadow-xs'
              }`}
            >
              {isCloning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isCloned ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5" />
              )}
              <span>{isCloned ? 'Guardado en Mis Ejercicios' : 'Guardar en Mis Ejercicios'}</span>
            </button>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onOpenInBoard}
              className="h-8 px-2 rounded-md bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Abrir directamente en la Pizarra Táctica"
            >
              <Paintbrush className="w-3 h-3 text-[#059669]" />
              <span>Pizarra</span>
            </button>
            <button
              type="button"
              onClick={onExportVideo}
              disabled={!hasAnimation || isBusyVideo}
              className="h-8 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-45 cursor-pointer"
              title="Exportar animación a vídeo .MP4"
            >
              {isExportingVideo ? (
                <Loader2 className="w-3 h-3 animate-spin text-[#059669]" />
              ) : (
                <Video className="w-3 h-3 text-[#059669]" />
              )}
              <span>{isExportingVideo ? `${exportProgress}%` : 'MP4'}</span>
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="h-8 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-45 cursor-pointer"
              title="Descargar ficha en PDF"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3 h-3 animate-spin text-[#059669]" />
              ) : (
                <FileDown className="w-3 h-3 text-slate-600" />
              )}
              <span>PDF</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onOpenInBoard}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-slate-600 hover:text-[#059669] hover:bg-emerald-50/70 transition-colors border-r border-slate-200 cursor-pointer"
            title="Abrir en Pizarra Táctica"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">Pizarra</span>
          </button>
          <button
            type="button"
            onClick={onExportVideo}
            disabled={!hasAnimation || isBusyVideo}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-slate-600 hover:text-[#059669] hover:bg-slate-100 transition-colors border-r border-slate-200 disabled:opacity-40 cursor-pointer"
            title={hasAnimation ? 'Exportar vídeo .MP4' : 'Requiere 2+ fotogramas'}
          >
            {isExportingVideo ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                <span className="text-[9px] font-mono font-bold text-[#059669]">{exportProgress}%</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">MP4</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border-r border-slate-200 disabled:opacity-40 cursor-pointer"
            title="Descargar PDF"
          >
            {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-semibold">PDF</span>
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex flex-col items-center justify-center gap-0.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border-r border-slate-200 cursor-pointer"
              title="Editar detalles"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">Editar</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex flex-col items-center justify-center gap-0.5 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Eliminar ejercicio"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">Borrar</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
};
