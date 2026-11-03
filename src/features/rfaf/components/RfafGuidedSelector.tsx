import React from 'react';
import { Loader2, Search, Zap } from 'lucide-react';
import { OfficialCompetitionLink } from '../../../types';
import { useGuidedCompetitionSelector } from '../hooks/useGuidedCompetitionSelector';

interface RfafGuidedSelectorProps {
  activeTeamName: string;
  initialLink?: OfficialCompetitionLink;
  fallbackCompName?: string;
  fallbackGroupName?: string;
  fallbackClubName?: string;
  syncingAll: boolean;
  syncSummary: string | null;
  syncError: string | null;
  onSelectionChange: (selection: OfficialCompetitionLink) => void;
  onSyncAll: (selection: OfficialCompetitionLink) => void;
}

export const RfafGuidedSelector: React.FC<RfafGuidedSelectorProps> = ({
  activeTeamName,
  initialLink,
  fallbackCompName,
  fallbackGroupName,
  fallbackClubName,
  syncingAll,
  syncSummary,
  syncError,
  onSelectionChange,
  onSyncAll,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    codCompeticion,
    setCodCompeticion,
    filteredCompetitions,
    codGrupo,
    setCodGrupo,
    groups,
    loadingGroups,
    teams,
    loadingTeams,
    selectedTeamName,
    handleSelectTeam,
    currentSelection,
  } = useGuidedCompetitionSelector({
    activeTeamName,
    initialLink,
    fallbackCompName,
    fallbackGroupName,
    fallbackClubName,
    onSelectionChange,
  });

  return (
    <div className="px-5 py-3.5 bg-[#080808] border-b border-[#1A1A1A] space-y-2.5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-end">
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              1. Competición / Categoría
            </label>
            <div className="relative w-44">
              <Search className="w-3 h-3 text-[#666666] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filtrar (ej. Málaga, Juvenil)..."
                className="w-full h-5 pl-6 pr-2 bg-[#0D0D0D] border border-[#242424] rounded text-[10px] text-[#EDEDED] focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>
          <select
            value={codCompeticion}
            onChange={e => setCodCompeticion(e.target.value)}
            className="w-full h-9 bg-[#050505] border border-[#262626] rounded px-2.5 text-[12px] font-medium text-[#EDEDED] focus:border-emerald-500/50 focus:outline-none"
          >
            {filteredCompetitions.map(c => (
              <option key={c.codCompeticion} value={c.codCompeticion}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
            2. Grupo {loadingGroups && <Loader2 className="w-2.5 h-2.5 inline animate-spin ml-1" />}
          </label>
          <select
            value={codGrupo}
            onChange={e => setCodGrupo(e.target.value)}
            className="w-full h-9 bg-[#050505] border border-[#262626] rounded px-2.5 text-[12px] font-medium text-[#EDEDED] focus:border-emerald-500/50 focus:outline-none"
          >
            {groups.map(g => (
              <option key={g.codGrupo} value={g.codGrupo}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
            3. Mi Equipo en este Grupo {loadingTeams && <Loader2 className="w-2.5 h-2.5 inline animate-spin ml-1" />}
          </label>
          <select
            value={selectedTeamName}
            onChange={e => handleSelectTeam(e.target.value)}
            className="w-full h-9 bg-[#050505] border border-[#262626] rounded px-2.5 text-[12px] font-semibold text-emerald-300 focus:border-emerald-500/50 focus:outline-none"
          >
            {teams.map(t => (
              <option key={t.codigoEquipo || t.teamName} value={t.teamName}>
                {t.teamName}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <button
            type="button"
            disabled={syncingAll || !codCompeticion || !codGrupo}
            onClick={() => onSyncAll(currentSelection)}
            className="w-full h-9 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#050505] font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {syncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
            <span>{syncingAll ? 'Sincronizando...' : 'Sincronizar Todo'}</span>
          </button>
        </div>
      </div>

      {syncSummary && (
        <div className="px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between">
          <span>{syncSummary}</span>
        </div>
      )}
      {syncError && (
        <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
          {syncError}
        </div>
      )}
    </div>
  );
};
