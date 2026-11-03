import React from 'react';
import { Shield, X } from 'lucide-react';
import { RfafStandingRow } from '../../../types';
import { clubsMatch } from '../../../services/rfafConnectorService';

interface RfafStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  standings: RfafStandingRow[];
  myClubName: string;
  upcomingRivalName?: string;
  competicion?: string;
  grupo?: string;
}

export const RfafStandingsModal: React.FC<RfafStandingsModalProps> = ({
  isOpen,
  onClose,
  standings,
  myClubName,
  upcomingRivalName,
  competicion,
  grupo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[155] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0A0A0A] border border-[#242424] rounded-xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[14px] font-semibold text-[#EDEDED]">
              Clasificación Oficial RFAF · {competicion || 'Liga'} {grupo ? `(${grupo})` : ''}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#888888] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar p-4">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#1F1F1F] text-[#737373] font-mono text-[10px] uppercase">
                <th className="py-2 px-2">Pos</th>
                <th className="py-2 px-2">Equipo</th>
                <th className="py-2 px-2 text-center">PTS</th>
                <th className="py-2 px-2 text-center">PJ</th>
                <th className="py-2 px-2 text-center">PG</th>
                <th className="py-2 px-2 text-center">PE</th>
                <th className="py-2 px-2 text-center">PP</th>
                <th className="py-2 px-2 text-center">GF</th>
                <th className="py-2 px-2 text-center">GC</th>
                <th className="py-2 px-2 text-center">DIF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151515]">
              {standings.map(r => {
                const isMine = clubsMatch(r.equipo, myClubName);
                const isRival = upcomingRivalName ? clubsMatch(r.equipo, upcomingRivalName) : false;
                const dif = (r.gf || 0) - (r.gc || 0);
                return (
                  <tr
                    key={r.posicion + r.equipo}
                    className={
                      isMine
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                        : isRival
                        ? 'bg-amber-500/15 text-amber-300 font-semibold'
                        : 'text-[#EDEDED] hover:bg-[#111111]'
                    }
                  >
                    <td className="py-2 px-2 font-mono">{r.posicion}º</td>
                    <td className="py-2 px-2">
                      {r.equipo}
                      {isMine && (
                        <span className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          TÚ
                        </span>
                      )}
                      {isRival && (
                        <span className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          PRÓX. RIVAL
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-emerald-400">{r.puntos}</td>
                    <td className="py-2 px-2 text-center font-mono">{r.pj}</td>
                    <td className="py-2 px-2 text-center font-mono text-[#A1A1AA]">{r.pg}</td>
                    <td className="py-2 px-2 text-center font-mono text-[#A1A1AA]">{r.pe}</td>
                    <td className="py-2 px-2 text-center font-mono text-[#A1A1AA]">{r.pp}</td>
                    <td className="py-2 px-2 text-center font-mono text-[#A1A1AA]">{r.gf}</td>
                    <td className="py-2 px-2 text-center font-mono text-[#A1A1AA]">{r.gc}</td>
                    <td className="py-2 px-2 text-center font-mono text-[#A1A1AA]">{dif > 0 ? `+${dif}` : dif}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
