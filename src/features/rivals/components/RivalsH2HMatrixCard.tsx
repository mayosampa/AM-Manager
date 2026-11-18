import React from 'react';
import { BarChart3, Calendar, ChevronRight } from 'lucide-react';
import { RivalEncounterSlot, RivalIntelligenceProfile } from '../../../services/rivalAnalyticsHelper';

interface RivalsH2HMatrixCardProps {
  profiles: RivalIntelligenceProfile[];
  maxGoals: number;
  onSelectRival: (rivalId: string) => void;
}

const OUTCOME_META: Record<'W' | 'D' | 'L', { letter: string; cls: string }> = {
  W: {
    letter: 'V',
    cls: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
  },
  D: {
    letter: 'E',
    cls: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
  },
  L: {
    letter: 'D',
    cls: 'bg-rose-500/15 border-rose-500/35 text-rose-300',
  },
};

const EncounterBadge: React.FC<{ slot: RivalEncounterSlot | null; label: string }> = ({ slot, label }) => {
  if (!slot) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0F0F0F] border border-[#1E1E1E] text-[10px] font-mono text-[#525252]">
        <span className="text-[#404040]">{label}:</span> —
      </span>
    );
  }

  const condShort = slot.condition === 'Visitante' ? 'V' : 'L';
  if (slot.status === 'played' && slot.outcome) {
    const meta = OUTCOME_META[slot.outcome];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono font-medium whitespace-nowrap ${meta.cls}`}
        title={`${label} (${slot.date} · ${slot.condition})`}
      >
        <span className="font-bold">{meta.letter}</span>
        <span>
          {slot.myScore}-{slot.rivalScore}
        </span>
        <span className="opacity-70">({condShort})</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#141414] border border-[#262626] text-[10px] font-mono text-[#A1A1AA] whitespace-nowrap"
      title={`${label} pendiente · ${slot.date} (${slot.condition})`}
    >
      <Calendar className="w-2.5 h-2.5 text-[#737373]" />
      <span>{slot.formattedShortDate}</span>
      <span className="text-[#666666]">({condShort})</span>
    </span>
  );
};

export const RivalsH2HMatrixCard: React.FC<RivalsH2HMatrixCardProps> = ({
  profiles,
  maxGoals,
  onSelectRival,
}) => {
  const barScaleMax = Math.max(maxGoals, 3);

  return (
    <section className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1A1A1A] flex flex-wrap items-center justify-between gap-2 bg-[#0D0D0D]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#A1A1AA]" />
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#EDEDED]">
            Matriz Comparativa H2H y Goles contra Rivales de Liga
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[#737373]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-400" /> GF (Nuestros goles)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-rose-400" /> GC (Goles rival)
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[#525252]">
            |<span className="text-emerald-300">V</span> Victoria · <span className="text-amber-300">E</span> Empate ·{' '}
            <span className="text-rose-300">D</span> Derrota · Fecha Pendiente
          </span>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="p-8 text-center text-[12px] text-[#666666]">
          No hay clubes que coincidan con el filtro seleccionado.
        </div>
      ) : (
        <div className="divide-y divide-[#161616]">
          {profiles.map(profile => {
            const { rival, standing, h2hSummary, idaSlot, vueltaSlot } = profile;
            const gfWidth = h2hSummary.goalsFor > 0 ? Math.max(8, Math.round((h2hSummary.goalsFor / barScaleMax) * 100)) : 0;
            const gcWidth = h2hSummary.goalsAgainst > 0 ? Math.max(8, Math.round((h2hSummary.goalsAgainst / barScaleMax) * 100)) : 0;

            return (
              <button
                key={rival.id}
                type="button"
                onClick={() => onSelectRival(rival.id)}
                className="w-full text-left px-4 py-2.5 hover:bg-[#111111] transition-colors grid grid-cols-1 lg:grid-cols-12 items-center gap-2.5 lg:gap-4 group cursor-pointer"
              >
                {/* Posición + Nombre + Puntos Liga */}
                <div className="lg:col-span-4 flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-md border flex items-center justify-center font-mono text-[11px] font-semibold shrink-0 ${
                      standing
                        ? standing.pos <= 3
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#121212] border-[#262626] text-[#EDEDED]'
                        : 'bg-[#0E0E0E] border-[#1F1F1F] text-[#525252]'
                    }`}
                  >
                    {standing ? `${standing.pos}º` : '—'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[#EDEDED] truncate group-hover:text-white">
                      {rival.name}
                    </div>
                    <div className="text-[10px] font-mono text-[#737373] truncate">
                      {standing
                        ? `${standing.pts} pts · ${standing.pj} PJ (${standing.pg}G-${standing.pe}E-${standing.pp}P)`
                        : rival.stadium || 'Sin datos de tabla'}
                    </div>
                  </div>
                </div>

                {/* Barras Proporcionales GF vs GC (SVG puro) */}
                <div className="lg:col-span-4 flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <svg viewBox="0 0 100 6" className="w-full h-1.5 rounded overflow-hidden bg-[#151515]" aria-label={`GF ${h2hSummary.goalsFor}`}>
                      <rect x="0" y="0" width={gfWidth} height="6" rx="2" className="fill-emerald-500" />
                    </svg>
                    <svg viewBox="0 0 100 6" className="w-full h-1.5 rounded overflow-hidden bg-[#151515]" aria-label={`GC ${h2hSummary.goalsAgainst}`}>
                      <rect x="0" y="0" width={gcWidth} height="6" rx="2" className="fill-rose-500" />
                    </svg>
                  </div>
                  <div className="w-16 text-right font-mono text-[11px] shrink-0">
                    {h2hSummary.played > 0 ? (
                      <span className="text-[#EDEDED]">
                        <span className="text-emerald-400">{h2hSummary.goalsFor}</span>
                        <span className="text-[#525252] mx-0.5">:</span>
                        <span className="text-rose-400">{h2hSummary.goalsAgainst}</span>
                      </span>
                    ) : (
                      <span className="text-[#525252]">0 : 0</span>
                    )}
                  </div>
                </div>

                {/* Ida / Vuelta Badges + Indicador de apertura */}
                <div className="lg:col-span-4 flex items-center justify-between lg:justify-end gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <EncounterBadge slot={idaSlot} label="Ida" />
                    <EncounterBadge slot={vueltaSlot} label="Vuelta" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#525252] group-hover:text-[#EDEDED] transition-colors shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
