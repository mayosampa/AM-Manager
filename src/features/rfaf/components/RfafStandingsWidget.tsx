import React, { useMemo, useState } from 'react';
import { ArrowRight, Settings2, Trophy } from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import {
  clubsMatch,
  deduplicateStandingsRows,
  findStandingForClub,
} from '../../../services/rfafConnectorService';
import { RfafStandingsModal } from './RfafStandingsModal';

interface RfafStandingsWidgetProps {
  upcomingRivalName?: string;
  onOpenSyncModal: (tab?: 'squad' | 'calendar' | 'standings') => void;
  onViewFullStandings?: () => void;
}

export const RfafStandingsWidget: React.FC<RfafStandingsWidgetProps> = ({
  upcomingRivalName,
  onOpenSyncModal,
  onViewFullStandings,
}) => {
  const { activeTeam, teamSettings } = useTeam();
  const [showFullTable, setShowFullTable] = useState(false);

  const rfafLink = teamSettings?.rfafLink;
  const officialLink = teamSettings?.officialCompetitionLink;
  const standings = deduplicateStandingsRows(rfafLink?.standings);
  const myClubName = officialLink?.officialTeamName || rfafLink?.clubRfaf || activeTeam?.name || '';
  const compLabel = officialLink?.competitionName || rfafLink?.competicion;
  const groupLabel = officialLink?.groupName || rfafLink?.grupo;

  const myRow = findStandingForClub(standings, myClubName);
  const rivalRow = upcomingRivalName ? findStandingForClub(standings, upcomingRivalName) : undefined;

  const nearbyRows = useMemo(() => {
    if (standings.length === 0) return [];
    const idx = standings.findIndex(r => clubsMatch(r.equipo, myClubName));
    if (idx === -1) return standings.slice(0, 3);
    const start = Math.max(0, Math.min(idx - 1, standings.length - 3));
    return standings.slice(start, start + 3);
  }, [standings, myClubName]);

  const handleOpenComplete = () => {
    if (onViewFullStandings) {
      onViewFullStandings();
    } else {
      setShowFullTable(true);
    }
  };

  return (
    <>
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#171717]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[12px] font-semibold text-[#EDEDED]">
                {upcomingRivalName ? 'Comparativa en Clasificación' : 'Clasificación Actual'}
              </span>
              {compLabel && (
                <span className="ml-2 text-[11px] font-mono text-[#888888]">
                  {compLabel} {groupLabel ? `· ${groupLabel}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenComplete}
              className="h-7 px-2.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Ver clasificación completa</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onOpenSyncModal(standings.length > 0 ? 'standings' : 'squad')}
              className="h-7 px-2 rounded bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#A1A1AA] hover:text-[#EDEDED] text-[11px] flex items-center gap-1 cursor-pointer"
              title="Configurar o sincronizar competición"
            >
              <Settings2 className="w-3 h-3" />
              <span className="hidden sm:inline">{standings.length > 0 ? 'Vínculo' : 'Conectar'}</span>
            </button>
          </div>
        </div>

        {standings.length === 0 ? (
          <div className="pt-3 text-[12px] text-[#737373] flex flex-wrap items-center justify-between gap-2">
            <span>Conecta tu equipo a su grupo oficial para consultar tu posición, calendario y rivales.</span>
            <button
              type="button"
              onClick={() => onOpenSyncModal('squad')}
              className="text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              Vincular ahora →
            </button>
          </div>
        ) : upcomingRivalName ? (
          /* MODO DÍA DE PARTIDO: Comparativa compacta Nuestro Puesto vs Puesto Rival */
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="px-3 py-2.5 rounded-lg bg-[#0E1411] border border-emerald-500/30 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-emerald-400">Nuestro Equipo</div>
                <div className="text-[13px] font-semibold text-[#EDEDED] truncate">{myRow ? myRow.equipo : myClubName}</div>
                {myRow && (
                  <div className="text-[11px] font-mono text-[#A1A1AA]">
                    {myRow.pj} PJ · {myRow.pg}G-{myRow.pe}E-{myRow.pp}P · GF {myRow.gf}:{myRow.gc}
                  </div>
                )}
              </div>
              {myRow && (
                <div className="text-right shrink-0 pl-2">
                  <div className="text-[18px] font-mono font-bold text-emerald-400 leading-none">{myRow.posicion}º</div>
                  <div className="text-[11px] font-mono text-[#EDEDED] mt-1">{myRow.puntos} pts</div>
                </div>
              )}
            </div>

            <div className="px-3 py-2.5 rounded-lg bg-[#12100D] border border-amber-500/30 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-amber-400">Rival de la Jornada</div>
                <div className="text-[13px] font-semibold text-[#EDEDED] truncate">{rivalRow ? rivalRow.equipo : upcomingRivalName}</div>
                {rivalRow ? (
                  <div className="text-[11px] font-mono text-[#A1A1AA]">
                    {rivalRow.pj} PJ · {rivalRow.pg}G-{rivalRow.pe}E-{rivalRow.pp}P · GF {rivalRow.gf}:{rivalRow.gc}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#737373]">Sin datos en tabla</div>
                )}
              </div>
              {rivalRow && (
                <div className="text-right shrink-0 pl-2">
                  <div className="text-[18px] font-mono font-bold text-amber-400 leading-none">{rivalRow.posicion}º</div>
                  <div className="text-[11px] font-mono text-[#EDEDED] mt-1">{rivalRow.puntos} pts</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODO RESUMEN (HOME): Posición actual + rivales inmediatamente por encima y por debajo */
          <div className="pt-3 divide-y divide-[#151515]">
            {nearbyRows.map(row => {
              const isMine = clubsMatch(row.equipo, myClubName);
              const dg = row.gf - row.gc;
              return (
                <div
                  key={`${row.posicion}_${row.equipo}`}
                  className={`py-2 px-3 flex items-center justify-between gap-3 rounded-md text-[12px] ${
                    isMine ? 'bg-emerald-500/15 border border-emerald-500/30 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 font-mono text-right ${isMine ? 'text-emerald-400 font-bold' : 'text-[#888888]'}`}>
                      {row.posicion}º
                    </span>
                    <span className={`truncate ${isMine ? 'text-emerald-300 font-bold' : 'text-[#EDEDED]'}`}>
                      {row.equipo}
                    </span>
                    {isMine && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                        Tú
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                    <span className="text-[#888888] hidden sm:inline">
                      {row.pj} PJ ({row.pg}G-{row.pe}E-{row.pp}P)
                    </span>
                    <span className="text-[#888888] w-10 text-right hidden md:inline">
                      DG {dg > 0 ? `+${dg}` : dg}
                    </span>
                    <span className={`w-12 text-right font-bold text-[12px] ${isMine ? 'text-emerald-400' : 'text-[#EDEDED]'}`}>
                      {row.puntos} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RfafStandingsModal
        isOpen={showFullTable}
        onClose={() => setShowFullTable(false)}
        standings={standings}
        myClubName={myClubName}
        upcomingRivalName={upcomingRivalName}
        competicion={compLabel}
        grupo={groupLabel}
      />
    </>
  );
};
