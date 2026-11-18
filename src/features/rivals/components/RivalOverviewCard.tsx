import React from 'react';
import { ArrowRight, Calendar, FileDown, ShieldCheck, Clock } from 'lucide-react';
import { RivalIntelligenceProfile } from '../../../services/rivalAnalyticsHelper';

interface RivalOverviewCardProps {
  profile: RivalIntelligenceProfile;
  onSelectRival: (rivalId: string) => void;
  onExportPdf: (profile: RivalIntelligenceProfile) => void;
}

const RESULT_CHIP: Record<'W' | 'D' | 'L', string> = {
  W: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
  D: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
  L: 'bg-rose-500/15 border-rose-500/35 text-rose-300',
};

const OUTCOME_LETTER: Record<'W' | 'D' | 'L', string> = {
  W: 'V',
  D: 'E',
  L: 'D',
};

export const RivalOverviewCard: React.FC<RivalOverviewCardProps> = ({
  profile,
  onSelectRival,
  onExportPdf,
}) => {
  const { rival, standing, h2hMatches, nextFixture, hasTacticalReport } = profile;
  const scouting = rival.scouting;

  return (
    <article className="bg-[#0A0A0A] border border-[#1F1F1F] hover:border-[#303030] rounded-lg p-4 flex flex-col justify-between gap-3.5 transition-colors">
      {/* Cabecera: Posición + Nombre + Balance Liga */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-8 h-8 rounded-md border flex items-center justify-center font-mono text-[12px] font-bold shrink-0 ${
                standing
                  ? standing.pos <= 3
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                    : 'bg-[#121212] border-[#262626] text-[#EDEDED]'
                  : 'bg-[#0E0E0E] border-[#1F1F1F] text-[#525252]'
              }`}
            >
              {standing ? `${standing.pos}º` : '—'}
            </span>
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-[#EDEDED] truncate">{rival.name}</h3>
              <p className="text-[11px] font-mono text-[#737373] truncate">
                {standing
                  ? `${standing.pts} pts · ${standing.pg}G-${standing.pe}E-${standing.pp}P · GF ${standing.gf}:${standing.gc}`
                  : rival.stadium || 'Sin datos de clasificación'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium shrink-0 ${
              hasTacticalReport
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-[#121212] border-[#242424] text-[#737373]'
            }`}
          >
            {hasTacticalReport ? (
              <>
                <ShieldCheck className="w-3 h-3" /> Con Informe
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" /> Pendiente
              </>
            )}
          </span>
        </div>

        {/* Bloque H2H */}
        <div className="bg-[#050505] border border-[#171717] rounded-md px-3 py-2 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#666666]">
            Enfrentamientos Directos (H2H)
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {h2hMatches.map((m, idx) => (
              <span
                key={m.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-medium ${RESULT_CHIP[m.outcome]}`}
              >
                <span className="opacity-75">{idx === 0 ? 'Ida' : idx === 1 ? 'Vuelta' : `P${idx + 1}`}:</span>
                <span className="font-bold">{OUTCOME_LETTER[m.outcome]}</span>
                <span>
                  {m.myScore}-{m.rivalScore}
                </span>
                <span className="opacity-70">({m.condition === 'Visitante' ? 'V' : 'L'})</span>
              </span>
            ))}
            {nextFixture && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#111111] border border-[#262626] text-[10px] font-mono text-[#A1A1AA]">
                <Calendar className="w-2.5 h-2.5 text-[#737373]" />
                <span>
                  Próx: {nextFixture.formattedShortDate} ({nextFixture.condition === 'Visitante' ? 'V' : 'L'}
                  {nextFixture.jornada ? ` · J${nextFixture.jornada}` : ''})
                </span>
              </span>
            )}
            {h2hMatches.length === 0 && !nextFixture && (
              <span className="text-[11px] text-[#525252]">Sin cruces registrados en liga ni historial</span>
            )}
          </div>
        </div>

        {/* Estado del Informe Táctico */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
          {hasTacticalReport ? (
            <>
              <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] font-mono text-[10px] font-medium text-[#EDEDED]">
                {scouting.baseFormation || '1-4-4-2'}
              </span>
              {scouting.playingStyle && (
                <span className="px-2 py-0.5 rounded bg-[#111111] border border-[#222222] text-[10px] text-[#A1A1AA]">
                  {scouting.playingStyle}
                </span>
              )}
              {scouting.defensivePhase?.blockHeight && (
                <span className="px-2 py-0.5 rounded bg-[#111111] border border-[#222222] text-[10px] text-[#888888]">
                  {scouting.defensivePhase.blockHeight}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-[#525252] italic">Sin informe táctico redactado aún</span>
          )}
        </div>
      </div>

      {/* Pie de tarjeta */}
      <div className="pt-2.5 border-t border-[#161616] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectRival(rival.id)}
          className="flex-1 h-8 px-3 rounded-md bg-[#121212] hover:bg-[#1B1B1B] border border-[#262626] text-[#EDEDED] text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Abrir Informe Táctico</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#888888]" />
        </button>
        <button
          type="button"
          onClick={() => onExportPdf(profile)}
          title={`Exportar PDF de ${rival.name}`}
          className="h-8 px-2.5 rounded-md bg-[#0D0D0D] hover:bg-[#171717] border border-[#262626] text-[#A1A1AA] hover:text-[#EDEDED] text-[11px] font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
      </div>
    </article>
  );
};
