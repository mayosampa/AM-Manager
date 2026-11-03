import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { clubsMatch } from '../../../services/rfafConnectorService';

interface LeagueMatchItem {
  jornada: number;
  fecha: string;
  hora?: string;
  local: string;
  visitante: string;
  golesLocal?: number;
  golesVisitante?: number;
  isPlayed: boolean;
  isHome: boolean;
  opponent: string;
}

interface LeagueCalendarPanelProps {
  seasonPlan: Record<string, any>;
  myClubName: string;
  teamId?: string;
}

export const LeagueCalendarPanel: React.FC<LeagueCalendarPanelProps> = ({
  seasonPlan,
  myClubName,
  teamId,
}) => {
  const [filter, setFilter] = useState<'all' | 'played' | 'pending'>('all');

  const matches = useMemo<LeagueMatchItem[]>(() => {
    const list: LeagueMatchItem[] = [];
    const seenJornadas = new Set<number>();

    Object.entries(seasonPlan || {}).forEach(([key, rawDay]) => {
      if (!rawDay || typeof rawDay !== 'object') return;
      const day = rawDay as Record<string, any>;
      const isMatch = day.isMatchDay === true || day.type === 'match';
      if (!isMatch) return;
      if (teamId && day.teamId && day.teamId !== teamId) return;

      const jornada = Number(day.rfafJornada || day.matchDetails?.jornada || 0);
      const dateStr = day.dateString || (key.includes('_') ? key.split('_').pop()! : key);
      const isHome = day.location === 'home' || day.matchDetails?.isHome === true;
      const opponent = day.opponent || day.matchDetails?.opponent || 'Rival';
      const local = day.matchDetails?.localTeam || (isHome ? myClubName : opponent);
      const visitante = day.matchDetails?.visitorTeam || (isHome ? opponent : myClubName);

      let golesLocal: number | undefined;
      let golesVisitante: number | undefined;
      if (typeof day.result === 'string' && day.result.includes('-')) {
        const parts = day.result.split('-').map((s: string) => parseInt(s.trim(), 10));
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
          golesLocal = parts[0];
          golesVisitante = parts[1];
        }
      }

      if (jornada > 0 && seenJornadas.has(jornada)) return;
      if (jornada > 0) seenJornadas.add(jornada);

      list.push({
        jornada: jornada || list.length + 1,
        fecha: dateStr,
        hora: day.matchTime,
        local,
        visitante,
        golesLocal,
        golesVisitante,
        isPlayed: Boolean(day.isPlayed || (golesLocal !== undefined && golesVisitante !== undefined)),
        isHome,
        opponent,
      });
    });

    return list.sort((a, b) => a.jornada - b.jornada || a.fecha.localeCompare(b.fecha));
  }, [seasonPlan, myClubName, teamId]);

  const filtered = useMemo(() => {
    if (filter === 'played') return matches.filter(m => m.isPlayed);
    if (filter === 'pending') return matches.filter(m => !m.isPlayed);
    return matches;
  }, [matches, filter]);

  return (
    <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-[#0E0E0E] border-b border-[#1F1F1F] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-[13px] font-semibold text-[#EDEDED]">
            Calendario Oficial de Liga ({matches.length} jornadas)
          </span>
        </div>
        <div className="flex items-center gap-1 bg-[#080808] p-1 rounded-lg border border-[#1F1F1F] text-[11px]">
          {[
            { id: 'all', label: `Todas (${matches.length})` },
            { id: 'played', label: `Disputadas (${matches.filter(m => m.isPlayed).length})` },
            { id: 'pending', label: `Pendientes (${matches.filter(m => !m.isPlayed).length})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filter === tab.id ? 'bg-emerald-500 text-black font-semibold' : 'text-[#888888] hover:text-[#EDEDED]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-[12px] text-[#737373]">
          No hay jornadas registradas en este filtro. Pulsa «🔄 Actualizar Datos (1-Clic)» para descargar las 30 jornadas oficiales.
        </div>
      ) : (
        <div className="divide-y divide-[#151515] max-h-[560px] overflow-y-auto custom-scrollbar">
          {filtered.map(m => {
            const localMine = clubsMatch(m.local, myClubName);
            const visitMine = clubsMatch(m.visitante, myClubName);
            return (
              <div key={`${m.jornada}_${m.fecha}`} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#0E0E0E] text-[12px]">
                <div className="flex items-center gap-2.5 min-w-[125px]">
                  <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] font-mono text-[11px] font-semibold text-emerald-400">
                    J{m.jornada}
                  </span>
                  <span className="font-mono text-[11px] text-[#888888]">{m.fecha}</span>
                </div>

                <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
                  <span className={`flex-1 text-right truncate ${localMine ? 'font-bold text-emerald-300' : 'text-[#EDEDED]'}`}>
                    {m.local}
                  </span>
                  {m.isPlayed && m.golesLocal !== undefined && m.golesVisitante !== undefined ? (
                    <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono font-bold text-emerald-300 text-[12px] shrink-0">
                      {m.golesLocal} - {m.golesVisitante}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#242424] font-mono text-[11px] text-[#737373] shrink-0">
                      {m.hora || 'vs'}
                    </span>
                  )}
                  <span className={`flex-1 text-left truncate ${visitMine ? 'font-bold text-emerald-300' : 'text-[#EDEDED]'}`}>
                    {m.visitante}
                  </span>
                </div>

                <div className="min-w-[90px] flex justify-end">
                  {m.isPlayed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Jugado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#888888] bg-[#121212] border border-[#222222] px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3" /> Pendiente
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
