import React, { useMemo, useState } from 'react';
import { Shield, Plus, Search } from 'lucide-react';
import { GlobalRivalsSummary, RivalIntelligenceProfile } from '../../../services/rivalAnalyticsHelper';
import { RivalsGlobalKpiRow } from './RivalsGlobalKpiRow';
import { RivalsH2HMatrixCard } from './RivalsH2HMatrixCard';
import { RivalOverviewCard } from './RivalOverviewCard';

export type RivalOverviewFilter = 'all' | 'upcoming' | 'faced' | 'reported' | 'pending';

interface RivalsLeagueOverviewProps {
  profiles: RivalIntelligenceProfile[];
  summary: GlobalRivalsSummary;
  onSelectRival: (rivalId: string) => void;
  onExportPdf: (profile: RivalIntelligenceProfile) => void;
  onToggleAddClub: () => void;
}

const FILTER_OPTIONS: { id: RivalOverviewFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'upcoming', label: 'Próximos Rivales' },
  { id: 'faced', label: 'Ya Enfrentados (H2H)' },
  { id: 'reported', label: 'Con Informe Táctico' },
  { id: 'pending', label: 'Pendientes de Analizar' },
];

export const RivalsLeagueOverview: React.FC<RivalsLeagueOverviewProps> = ({
  profiles,
  summary,
  onSelectRival,
  onExportPdf,
  onToggleAddClub,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RivalOverviewFilter>('all');

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles.filter(p => {
      if (q && !p.rival.name.toLowerCase().includes(q) && !(p.rival.stadium || '').toLowerCase().includes(q)) {
        return false;
      }
      if (activeFilter === 'upcoming') return p.upcomingFixtures.length > 0;
      if (activeFilter === 'faced') return p.h2hSummary.played > 0;
      if (activeFilter === 'reported') return p.hasTacticalReport;
      if (activeFilter === 'pending') return !p.hasTacticalReport;
      return true;
    });
  }, [profiles, searchQuery, activeFilter]);

  const filterCounts: Record<RivalOverviewFilter, number> = {
    all: summary.totalClubs,
    upcoming: summary.upcomingRivalsCount,
    faced: summary.facedRivalsCount,
    reported: summary.analyzedClubs,
    pending: summary.pendingClubs,
  };

  return (
    <div className="space-y-5">
      {/* Cabecera Nivel 1 */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#111111] border border-[#262626] flex items-center justify-center text-[#EDEDED]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[19px] font-semibold text-[#EDEDED] tracking-[-0.025em]">
                Centro de Scouting y Rivales
              </h1>
              <p className="text-[12px] text-[#737373]">
                Panorama H2H contra toda la liga, clasificación en vivo e informes tácticos ·{' '}
                <span className="font-mono text-[#EDEDED]">{summary.totalClubs}</span> clubes registrados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleAddClub}
            className="h-9 flex items-center gap-1.5 px-3.5 rounded-md bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[12px] font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Club
          </button>
        </div>

        {/* Buscador + Píldoras de Filtro */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 pt-1">
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar club o estadio..."
              className="w-full h-8 bg-[#050505] border border-[#262626] rounded-md pl-8 pr-3 text-[12px] text-[#EDEDED] placeholder:text-[#525252] focus:outline-none focus:border-[#525252]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_OPTIONS.map(opt => {
              const active = activeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveFilter(opt.id)}
                  className={`h-8 px-3 rounded-md border text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#EDEDED] border-[#EDEDED] text-[#0A0A0A]'
                      : 'bg-[#0F0F0F] hover:bg-[#161616] border-[#262626] text-[#A1A1AA]'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                      active ? 'bg-black/15 text-[#0A0A0A]' : 'bg-[#1A1A1A] text-[#737373]'
                    }`}
                  >
                    {filterCounts[opt.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <RivalsGlobalKpiRow summary={summary} />

      <RivalsH2HMatrixCard
        profiles={filteredProfiles}
        maxGoals={summary.maxGoalsInSingleRivalH2H}
        onSelectRival={onSelectRival}
      />

      {/* Grid de Tarjetas de Clubes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#888888]">
            Clubes del Grupo ({filteredProfiles.length})
          </h2>
          <span className="text-[11px] text-[#666666]">
            Haz clic en cualquier club para abrir o editar su informe táctico
          </span>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-10 text-center text-[13px] text-[#666666]">
            No se encontraron clubes con ese criterio. Pulsa "Nuevo Club" o limpia los filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProfiles.map(profile => (
              <RivalOverviewCard
                key={profile.rival.id}
                profile={profile}
                onSelectRival={onSelectRival}
                onExportPdf={onExportPdf}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
