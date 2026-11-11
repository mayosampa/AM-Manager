import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Loader2, RefreshCw, Settings2, Trophy } from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import { db } from '../../../services/db';
import {
  deduplicateStandingsRows,
  findStandingForClub,
  syncAllCompetitionData,
} from '../../../services/rfafConnectorService';
import { LeagueCalendarPanel } from './LeagueCalendarPanel';
import { RfafSyncModal } from './RfafSyncModal';
import { getZoneMeta, StandingsTableCard } from './StandingsTableCard';

export const StandingsScreen: React.FC = () => {
  const { activeTeam, teamSettings, updateTeamPlayers, updateTeamSettings } = useTeam();
  const [activeSubView, setActiveSubView] = useState<'table' | 'calendar' | 'split'>('split');
  const [seasonPlan, setSeasonPlan] = useState<Record<string, any>>({});
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const rfafLink = teamSettings?.rfafLink;
  const officialLink = teamSettings?.officialCompetitionLink;
  const standings = deduplicateStandingsRows(rfafLink?.standings);
  const myClubName = officialLink?.officialTeamName || rfafLink?.clubRfaf || activeTeam?.name || '';
  const compName = officialLink?.competitionName || rfafLink?.competicion || '2ª Andaluza Sénior (Málaga)';
  const groupName = officialLink?.groupName || rfafLink?.grupo || 'Grupo 2';
  const lastUpdated = officialLink?.lastSyncedAt || rfafLink?.lastStandingsSyncAt || rfafLink?.lastSyncAt;
  const myRow = findStandingForClub(standings, myClubName);
  const myDg = myRow ? myRow.gf - myRow.gc : 0;

  const loadPlan = async () => {
    if (!activeTeam?.id) return;
    try {
      const plan = await db.getSeasonPlan(activeTeam.id);
      setSeasonPlan(plan || {});
    } catch {}
  };

  useEffect(() => {
    loadPlan();
  }, [activeTeam?.id]);

  const handleQuickRefresh = async () => {
    if (!activeTeam) return;
    setSyncing(true);
    setToast(null);
    try {
      const sel = officialLink || {
        codTemporada: '22',
        codCompeticion: '48465922',
        codGrupo: '48901352',
        officialTeamName: myClubName || activeTeam.name,
        competitionName: compName,
        groupName,
      };
      const res = await syncAllCompetitionData({
        teamId: activeTeam.id,
        codTemporada: sel.codTemporada,
        codCompeticion: sel.codCompeticion,
        codGrupo: sel.codGrupo,
        codigoEquipo: sel.codigoEquipo,
        officialTeamName: sel.officialTeamName || activeTeam.name,
        competitionName: sel.competitionName || compName,
        groupName: sel.groupName || groupName,
        existingPlayers: activeTeam.players || [],
        unmatchedSanciones: rfafLink?.unmatchedSanciones || [],
        homeStadium: activeTeam.homeStadium || teamSettings?.homeStadium,
      });
      const cleanRows = deduplicateStandingsRows(res.standings);
      if (res.candidates.length > 0) await updateTeamPlayers(res.updatedPlayers);
      const nowIso = new Date().toISOString();
      await updateTeamSettings({
        rfafLink: {
          ...(rfafLink || {}),
          clubRfaf: sel.officialTeamName || activeTeam.name,
          competicion: sel.competitionName || compName,
          grupo: sel.groupName || groupName,
          competitionUrl: res.jornadaUrl,
          unmatchedSanciones: res.remainingUnmatched,
          standings: cleanRows.length > 0 ? cleanRows : standings,
          lastSyncAt: nowIso,
          lastCalendarSyncAt: nowIso,
          lastStandingsSyncAt: nowIso,
        },
        officialCompetitionLink: { ...sel, codigoEquipo: res.resolvedCodigoEquipo || sel.codigoEquipo, lastSyncedAt: nowIso },
      });
      await loadPlan();
      setToast(`✅ ${res.candidates.length} jugadores validados, ${res.matches.length} jornadas y clasificación de ${cleanRows.length} equipos actualizadas`);
    } catch (err: any) {
      setToast(`⚠️ ${err?.message || 'No se pudo actualizar en este momento.'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-5 pb-20">
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#EDEDED] tracking-tight">
                {compName} · {groupName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-semibold">
                {myClubName}
              </span>
            </div>
            <p className="text-[12px] text-[#888888] mt-1">
              {lastUpdated
                ? `Última actualización oficial: ${new Date(lastUpdated).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`
                : 'Pulsa «Actualizar Datos (1-Clic)» para sincronizar clasificación, resultados y las 30 jornadas.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleQuickRefresh}
            disabled={syncing}
            className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[12px] flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>🔄 Actualizar Datos (1-Clic)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="h-9 px-3.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#EDEDED] font-medium text-[12px] flex items-center gap-1.5 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>⚙️ Configurar Vínculo</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="px-4 py-2.5 rounded-lg bg-[#0F1913] border border-emerald-500/40 text-emerald-300 text-[12px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Posición Actual', value: myRow ? `${myRow.posicion}º` : '—', sub: myRow ? getZoneMeta(myRow.posicion, standings.length).label : 'De 16 clubes', border: 'border-emerald-500/30', labelTone: 'text-emerald-400', valTone: 'text-[24px] font-bold text-[#EDEDED]' },
          { label: 'Puntos Totales', value: myRow ? myRow.puntos : '—', sub: myRow ? `${myRow.pj} partidos jugados` : 'PTS en liga', border: 'border-[#1F1F1F]', labelTone: 'text-[#888888]', valTone: 'text-[24px] font-bold text-emerald-400' },
          { label: 'Balance (PG-PE-PP)', value: myRow ? `${myRow.pg}V · ${myRow.pe}E · ${myRow.pp}D` : '—', sub: 'Victorias · Empates · Derrotas', border: 'border-[#1F1F1F]', labelTone: 'text-[#888888]', valTone: 'text-[20px] font-semibold text-[#EDEDED] mt-1' },
          { label: 'Goles (GF / GC)', value: myRow ? `${myRow.gf} : ${myRow.gc}` : '—', sub: 'A favor vs En contra', border: 'border-[#1F1F1F]', labelTone: 'text-[#888888]', valTone: 'text-[20px] font-semibold text-[#EDEDED] mt-1' },
          { label: 'Diferencia Goles', value: myRow ? (myDg > 0 ? `+${myDg}` : myDg) : '—', sub: 'Balance goleador', border: 'border-[#1F1F1F] col-span-2 sm:col-span-1', labelTone: 'text-[#888888]', valTone: `text-[24px] font-bold ${myDg > 0 ? 'text-emerald-400' : myDg < 0 ? 'text-red-400' : 'text-[#EDEDED]'}` },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-[#0A0A0A] border ${kpi.border} rounded-xl p-3.5`}>
            <span className={`text-[10px] font-mono uppercase ${kpi.labelTone}`}>{kpi.label}</span>
            <div className={`font-mono mt-0.5 ${kpi.valTone}`}>{kpi.value}</div>
            <span className="text-[11px] text-[#888888]">{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-lg border border-[#1F1F1F] text-[12px]">
          {[
            { id: 'split', label: 'Vista Completa (Tabla + Calendario)', icon: Trophy },
            { id: 'table', label: `Clasificación (${standings.length || 16} Equipos)`, icon: Trophy },
            { id: 'calendar', label: 'Calendario Oficial (30 Jornadas)', icon: Calendar },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSubView(t.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeSubView === t.id ? 'bg-[#EDEDED] text-[#0A0A0A] font-semibold' : 'text-[#888888] hover:text-[#EDEDED]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#888888]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ascenso Directo</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Playoff</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Descenso</span>
        </div>
      </div>

      <div className={`grid gap-5 ${activeSubView === 'split' ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'}`}>
        {activeSubView !== 'calendar' && (
          <div className={activeSubView === 'split' ? 'xl:col-span-7' : ''}>
            <StandingsTableCard standings={standings} myClubName={myClubName} />
          </div>
        )}
        {activeSubView !== 'table' && (
          <div className={activeSubView === 'split' ? 'xl:col-span-5' : ''}>
            <LeagueCalendarPanel seasonPlan={seasonPlan} myClubName={myClubName} teamId={activeTeam?.id} />
          </div>
        )}
      </div>

      <RfafSyncModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} initialTab="standings" onCalendarUpdated={loadPlan} />
    </div>
  );
};
