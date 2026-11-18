import React from 'react';
import { Calendar, Trophy } from 'lucide-react';
import { RivalHeadToHeadSummary } from '../services/rivalsService';
import { RivalIntelligenceProfile } from '../../../services/rivalAnalyticsHelper';

interface RivalH2HDetailCardProps {
  rivalName: string;
  h2h: RivalHeadToHeadSummary | null;
  profile?: RivalIntelligenceProfile | null;
}

const OUTCOME_STYLE: Record<'W' | 'D' | 'L', { label: string; cls: string }> = {
  W: { label: 'V', cls: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' },
  D: { label: 'E', cls: 'bg-amber-500/15 border-amber-500/35 text-amber-300' },
  L: { label: 'D', cls: 'bg-rose-500/15 border-rose-500/35 text-rose-300' },
};

export const RivalH2HDetailCard: React.FC<RivalH2HDetailCardProps> = ({
  rivalName,
  h2h,
  profile,
}) => {
  const summary = profile?.h2hSummary.played ? profile.h2hSummary : h2h;
  const playedMatches =
    profile && profile.h2hMatches.length > 0
      ? profile.h2hMatches.map(m => ({
          id: m.id,
          date: m.date,
          condition: m.condition,
          myScore: m.myScore,
          rivalScore: m.rivalScore,
          outcome: m.outcome,
          jornada: m.jornada,
        }))
      : (h2h?.matches || []).map(m => ({
          id: m.id,
          date: m.date,
          condition: m.condition,
          myScore: m.myScore,
          rivalScore: m.rivalScore,
          outcome: (m.result === 'Victoria' ? 'W' : m.result === 'Derrota' ? 'L' : 'D') as 'W' | 'D' | 'L',
          jornada: undefined,
        }));

  const upcomingFixtures = profile?.upcomingFixtures || [];
  const standing = profile?.standing;

  return (
    <div className="lg:col-span-5 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4 flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#1A1A1A]">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#EDEDED] flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-[#888888]" /> Enfrentamientos Directos (H2H)
        </h4>
        {standing && (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[#A1A1AA]">
            Liga: <strong className="text-[#EDEDED]">{standing.pos}º</strong> · {standing.pts} pts
          </span>
        )}
      </div>

      {summary && summary.played > 0 ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-5 gap-px bg-[#1F1F1F] border border-[#1F1F1F] rounded-md overflow-hidden text-center">
            <div className="bg-[#0A0A0A] py-1.5">
              <div className="font-mono text-[13px] font-semibold text-[#EDEDED]">{summary.played}</div>
              <div className="font-mono text-[9px] text-[#666666]">PJ</div>
            </div>
            <div className="bg-[#0A0A0A] py-1.5">
              <div className="font-mono text-[13px] font-semibold text-emerald-400">{summary.wins}</div>
              <div className="font-mono text-[9px] text-[#666666]">G</div>
            </div>
            <div className="bg-[#0A0A0A] py-1.5">
              <div className="font-mono text-[13px] font-semibold text-amber-400">{summary.draws}</div>
              <div className="font-mono text-[9px] text-[#666666]">E</div>
            </div>
            <div className="bg-[#0A0A0A] py-1.5">
              <div className="font-mono text-[13px] font-semibold text-red-400">{summary.losses}</div>
              <div className="font-mono text-[9px] text-[#666666]">P</div>
            </div>
            <div className="bg-[#0A0A0A] py-1.5">
              <div className="font-mono text-[13px] font-semibold text-[#EDEDED]">
                {summary.goalsFor}:{summary.goalsAgainst}
              </div>
              <div className="font-mono text-[9px] text-[#666666]">GF:GC</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {playedMatches.slice(0, 4).map(m => {
              const badge = OUTCOME_STYLE[m.outcome];
              return (
                <span
                  key={m.id}
                  className={`font-mono px-2 py-0.5 rounded border text-[10px] inline-flex items-center gap-1 ${badge.cls}`}
                >
                  <span className="font-bold">{badge.label}</span>
                  <span>
                    {m.myScore}-{m.rivalScore}
                  </span>
                  <span className="opacity-75">
                    · {m.date} ({m.condition === 'Visitante' ? 'V' : 'L'})
                    {m.jornada ? ` · J${m.jornada}` : ''}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-[#666666]">
          Sin partidos disputados contra {rivalName} todavía.
        </p>
      )}

      {upcomingFixtures.length > 0 && (
        <div className="pt-2 border-t border-[#161616] space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#737373]">
            Próximo Encuentro en Calendario
          </div>
          <div className="flex flex-wrap gap-1.5">
            {upcomingFixtures.slice(0, 2).map(fx => (
              <span
                key={fx.planKey}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111111] border border-[#262626] font-mono text-[11px] text-[#EDEDED]"
              >
                <Calendar className="w-3 h-3 text-[#888888]" />
                <span>
                  {fx.formattedShortDate} ({fx.dateKey})
                </span>
                <span className="text-[#A1A1AA]">
                  · {fx.condition}
                  {fx.jornada ? ` · J${fx.jornada}` : ''}
                  {fx.time ? ` · ${fx.time}` : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
