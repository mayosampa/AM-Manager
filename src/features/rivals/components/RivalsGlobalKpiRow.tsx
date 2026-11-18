import React from 'react';
import { Trophy, Target, ClipboardCheck } from 'lucide-react';
import { GlobalRivalsSummary } from '../../../services/rivalAnalyticsHelper';

interface RivalsGlobalKpiRowProps {
  summary: GlobalRivalsSummary;
}

export const RivalsGlobalKpiRow: React.FC<RivalsGlobalKpiRowProps> = ({ summary }) => {
  const goalDiff = summary.totalGoalsFor - summary.totalGoalsAgainst;
  const totalGoalsSum = summary.totalGoalsFor + summary.totalGoalsAgainst;
  const gfPct = totalGoalsSum > 0 ? Math.round((summary.totalGoalsFor / totalGoalsSum) * 100) : 50;
  const reportsPct = summary.totalClubs > 0 ? Math.round((summary.analyzedClubs / summary.totalClubs) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">
            Balance Total H2H
          </span>
          <Trophy className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-mono text-[20px] font-bold text-[#EDEDED]">
            <span className="text-emerald-400">{summary.totalWins}V</span>
            <span className="text-[#404040] mx-1.5">-</span>
            <span className="text-amber-400">{summary.totalDraws}E</span>
            <span className="text-[#404040] mx-1.5">-</span>
            <span className="text-rose-400">{summary.totalLosses}D</span>
          </div>
          <span className="font-mono text-[12px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
            {summary.effectivenessPct}% efect.
          </span>
        </div>
        <p className="text-[11px] font-mono text-[#666666]">
          {summary.totalH2HPlayed} partidos H2H · {summary.totalPointsEarned} pts sumados
        </p>
      </div>

      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">
            Goles H2H (GF : GC)
          </span>
          <Target className="w-4 h-4 text-[#A1A1AA]" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-mono text-[20px] font-bold text-[#EDEDED]">
            <span className="text-emerald-400">{summary.totalGoalsFor}</span>
            <span className="text-[#525252] mx-1.5">:</span>
            <span className="text-rose-400">{summary.totalGoalsAgainst}</span>
          </div>
          <span
            className={`font-mono text-[12px] font-semibold px-2 py-0.5 rounded border ${
              goalDiff >= 0
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                : 'text-rose-300 bg-rose-500/10 border-rose-500/30'
            }`}
          >
            DG {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
          </span>
        </div>
        <div className="w-full h-1.5 bg-rose-500/30 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${gfPct}%` }} />
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">
            Informes Tácticos
          </span>
          <ClipboardCheck className="w-4 h-4 text-[#A1A1AA]" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-mono text-[20px] font-bold text-[#EDEDED]">
            {summary.analyzedClubs} <span className="text-[14px] text-[#666666]">/ {summary.totalClubs} clubes</span>
          </div>
          <span className="font-mono text-[12px] text-[#A1A1AA]">{reportsPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div className="h-full bg-[#EDEDED] transition-all" style={{ width: `${reportsPct}%` }} />
        </div>
      </div>
    </div>
  );
};
