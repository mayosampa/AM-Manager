import React from 'react';
import { FedStandingRow } from '../../../types';
import { clubsMatch } from '../../../services/rfafConnectorService';

export function getZoneMeta(pos: number, total: number) {
  if (pos === 1) return { label: 'Ascenso Directo', bar: 'bg-emerald-500' };
  if (pos >= 2 && pos <= 5) return { label: 'Playoff Ascenso', bar: 'bg-sky-500' };
  if (total >= 12 && pos > total - 3) return { label: 'Zona Descenso', bar: 'bg-red-500' };
  return { label: 'Permanencia', bar: 'bg-zinc-700' };
}

interface StandingsTableCardProps {
  standings: FedStandingRow[];
  myClubName: string;
}

export const StandingsTableCard: React.FC<StandingsTableCardProps> = ({ standings, myClubName }) => {
  return (
    <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#111111] border-b border-[#1F1F1F] text-[10px] font-mono uppercase text-[#737373]">
              <th className="py-2.5 px-3">Pos</th>
              <th className="py-2.5 px-3">Equipo</th>
              <th className="py-2.5 px-2.5 text-center">PTS</th>
              <th className="py-2.5 px-2 text-center">PJ</th>
              <th className="py-2.5 px-2 text-center">PG</th>
              <th className="py-2.5 px-2 text-center">PE</th>
              <th className="py-2.5 px-2 text-center">PP</th>
              <th className="py-2.5 px-2 text-center">GF</th>
              <th className="py-2.5 px-2 text-center">GC</th>
              <th className="py-2.5 px-2.5 text-center">DG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#161616]">
            {standings.map(row => {
              const isMine = clubsMatch(row.equipo, myClubName);
              const zone = getZoneMeta(row.posicion, standings.length);
              const dg = row.gf - row.gc;
              return (
                <tr key={`${row.posicion}_${row.equipo}`} className={isMine ? 'bg-emerald-500/15 font-semibold' : 'hover:bg-[#0E0E0E]'}>
                  <td className="py-2.5 px-3 font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`w-1 h-5 rounded-full ${zone.bar}`} title={zone.label} />
                      <span className={isMine ? 'text-emerald-300 font-bold' : 'text-[#A1A1AA]'}>{row.posicion}º</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className={isMine ? 'text-emerald-300 font-bold' : 'text-[#EDEDED]'}>{row.equipo}</span>
                      {isMine && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          Nuestro Equipo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-center font-mono font-bold text-[13px] text-emerald-400">{row.puntos}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-[#A1A1AA]">{row.pj}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-[#A1A1AA]">{row.pg}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-[#A1A1AA]">{row.pe}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-[#A1A1AA]">{row.pp}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-[#A1A1AA]">{row.gf}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-[#A1A1AA]">{row.gc}</td>
                  <td className={`py-2.5 px-2.5 text-center font-mono ${dg > 0 ? 'text-emerald-400' : dg < 0 ? 'text-red-400' : 'text-[#737373]'}`}>
                    {dg > 0 ? `+${dg}` : dg}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
