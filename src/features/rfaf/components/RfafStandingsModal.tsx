import React from 'react';
import { Shield, X } from 'lucide-react';
import { FedStandingRow } from '../../../types';
import { clubsMatch } from '../../../services/rfafConnectorService';

interface RfafStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  standings: FedStandingRow[];
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
    <div className="fixed inset-0 z-[155] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#059669]" />
            <h3 className="text-[14px] font-semibold text-slate-900">
              Clasificación Oficial · {competicion || 'Liga'} {grupo ? `(${grupo})` : ''}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar p-4 bg-white">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase bg-slate-50">
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
            <tbody className="divide-y divide-slate-200">
              {standings.map(r => {
                const isMine = clubsMatch(r.equipo, myClubName);
                const isRival = upcomingRivalName ? clubsMatch(r.equipo, upcomingRivalName) : false;
                const dif = (r.gf || 0) - (r.gc || 0);
                return (
                  <tr
                    key={r.posicion + r.equipo}
                    className={
                      isMine
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : isRival
                        ? 'bg-amber-50 text-amber-900 font-semibold'
                        : 'text-slate-900 hover:bg-slate-50'
                    }
                  >
                    <td className="py-2 px-2 font-mono">{r.posicion}º</td>
                    <td className="py-2 px-2">
                      {r.equipo}
                      {isMine && (
                        <span className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          TÚ
                        </span>
                      )}
                      {isRival && (
                        <span className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          PRÓX. RIVAL
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700">{r.puntos}</td>
                    <td className="py-2 px-2 text-center font-mono">{r.pj}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{r.pg}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{r.pe}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{r.pp}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{r.gf}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{r.gc}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{dif > 0 ? `+${dif}` : dif}</td>
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
