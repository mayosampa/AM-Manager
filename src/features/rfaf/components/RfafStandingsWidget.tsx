import React, { useState } from 'react';
import { Settings2, Trophy } from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import { deduplicateStandingsRows, findStandingForClub } from '../../../services/rfafConnectorService';
import { RfafStandingsModal } from './RfafStandingsModal';

interface RfafStandingsWidgetProps {
  upcomingRivalName?: string;
  onOpenSyncModal: (tab?: 'squad' | 'calendar' | 'standings') => void;
}

export const RfafStandingsWidget: React.FC<RfafStandingsWidgetProps> = ({
  upcomingRivalName,
  onOpenSyncModal,
}) => {
  const { activeTeam, teamSettings } = useTeam();
  const [showFullTable, setShowFullTable] = useState(false);

  const rfafLink = teamSettings?.rfafLink;
  const standings = deduplicateStandingsRows(rfafLink?.standings);
  const myClubName = rfafLink?.clubRfaf || activeTeam?.name || '';
  const myRow = findStandingForClub(standings, myClubName);
  const rivalRow = upcomingRivalName ? findStandingForClub(standings, upcomingRivalName) : undefined;

  return (
    <>
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#171717]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[12px] font-semibold text-[#EDEDED]">
                Competición y Clasificación Oficial
              </span>
              {rfafLink?.competicion && (
                <span className="ml-2 text-[11px] font-mono text-[#888888]">
                  {rfafLink.competicion} {rfafLink.grupo ? `· ${rfafLink.grupo}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {standings.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFullTable(true)}
                className="h-7 px-2.5 rounded bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#EDEDED] text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-3 h-3 text-emerald-400" />
                <span>Ver Clasificación ({standings.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenSyncModal(standings.length > 0 ? 'standings' : 'squad')}
              className="h-7 px-2.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Settings2 className="w-3 h-3" />
              <span>{rfafLink?.clubRfaf ? 'Sincronizar Competición' : 'Conectar Competición'}</span>
            </button>
          </div>
        </div>

        {standings.length === 0 ? (
          <div className="pt-3 text-[12px] text-[#737373]">
            Conecta tu equipo a su grupo oficial desde aquí para auto-rellenar nombres de plantilla, importar el calendario completo y consultar la clasificación.
          </div>
        ) : (
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#0E1411] border border-emerald-500/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase text-emerald-400">Nuestro Equipo</div>
                <div className="text-[13px] font-semibold text-[#EDEDED] truncate">
                  {myRow ? myRow.equipo : myClubName}
                </div>
                {myRow ? (
                  <div className="text-[11px] font-mono text-[#A1A1AA] mt-0.5">
                    {myRow.pj} PJ · {myRow.pg}G {myRow.pe}E {myRow.pp}P · GF {myRow.gf} : GC {myRow.gc}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#737373] mt-0.5">No localizado en la tabla actual</div>
                )}
              </div>
              {myRow && (
                <div className="text-right shrink-0">
                  <div className="text-[18px] font-mono font-bold text-emerald-400 leading-none">{myRow.posicion}º</div>
                  <div className="text-[11px] font-mono text-[#EDEDED] mt-1">{myRow.puntos} pts</div>
                </div>
              )}
            </div>

            {upcomingRivalName ? (
              <div className="p-3 rounded-lg bg-[#12100D] border border-amber-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-amber-400">Próximo Rival</div>
                  <div className="text-[13px] font-semibold text-[#EDEDED] truncate">
                    {rivalRow ? rivalRow.equipo : upcomingRivalName}
                  </div>
                  {rivalRow ? (
                    <div className="text-[11px] font-mono text-[#A1A1AA] mt-0.5">
                      {rivalRow.pj} PJ · {rivalRow.pg}G {rivalRow.pe}E {rivalRow.pp}P · GF {rivalRow.gf} : GC {rivalRow.gc}
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#737373] mt-0.5">Sin datos en tabla</div>
                  )}
                </div>
                {rivalRow && (
                  <div className="text-right shrink-0">
                    <div className="text-[18px] font-mono font-bold text-amber-400 leading-none">{rivalRow.posicion}º</div>
                    <div className="text-[11px] font-mono text-[#EDEDED] mt-1">{rivalRow.puntos} pts</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1F1F1F] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#737373]">Líder del Grupo</div>
                  <div className="text-[13px] font-semibold text-[#EDEDED] truncate">{standings[0]?.equipo || '-'}</div>
                  {standings[0] && (
                    <div className="text-[11px] font-mono text-[#A1A1AA] mt-0.5">
                      {standings[0].pj} PJ · {standings[0].pg}G {standings[0].pe}E {standings[0].pp}P
                    </div>
                  )}
                </div>
                {standings[0] && (
                  <div className="text-right shrink-0">
                    <div className="text-[18px] font-mono font-bold text-[#EDEDED] leading-none">1º</div>
                    <div className="text-[11px] font-mono text-emerald-400 mt-1">{standings[0].puntos} pts</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <RfafStandingsModal
        isOpen={showFullTable}
        onClose={() => setShowFullTable(false)}
        standings={standings}
        myClubName={myClubName}
        upcomingRivalName={upcomingRivalName}
        competicion={rfafLink?.competicion}
        grupo={rfafLink?.grupo}
      />
    </>
  );
};
