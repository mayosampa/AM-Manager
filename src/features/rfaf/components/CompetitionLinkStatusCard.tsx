import React, { useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Settings2, Shield } from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import {
  deduplicateStandingsRows,
  syncAllCompetitionData,
} from '../../../services/rfafConnectorService';

interface CompetitionLinkStatusCardProps {
  onOpenModal: () => void;
}

export const CompetitionLinkStatusCard: React.FC<CompetitionLinkStatusCardProps> = ({
  onOpenModal,
}) => {
  const { activeTeam, teamSettings, updateTeamPlayers, updateTeamSettings } = useTeam();
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!activeTeam) return null;

  const official = teamSettings?.officialCompetitionLink;
  const rfafLink = teamSettings?.rfafLink;
  const isLinked = Boolean(official?.codCompeticion || rfafLink?.competicion || rfafLink?.clubRfaf);

  const compName = official?.competitionName || rfafLink?.competicion || '2ª Andaluza Sénior (Málaga)';
  const groupName = official?.groupName || rfafLink?.grupo || 'Grupo 2';
  const clubName = official?.officialTeamName || rfafLink?.clubRfaf || activeTeam.name;

  const handleQuickSync = async () => {
    setSyncing(true);
    setToast(null);
    try {
      const sel = official || {
        codTemporada: '22',
        codCompeticion: '48465922',
        codGrupo: '48901352',
        officialTeamName: clubName,
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

      const cleanStandings = deduplicateStandingsRows(res.standings);
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
          standings: cleanStandings.length > 0 ? cleanStandings : deduplicateStandingsRows(rfafLink?.standings),
          lastSyncAt: nowIso,
          lastCalendarSyncAt: nowIso,
          lastStandingsSyncAt: nowIso,
        },
        officialCompetitionLink: {
          ...sel,
          codigoEquipo: res.resolvedCodigoEquipo || sel.codigoEquipo,
          lastSyncedAt: nowIso,
        },
      });

      setToast(
        `✅ ${res.candidates.length} jugadores validados, ${res.matches.length} jornadas y clasificación de ${cleanStandings.length} equipos actualizadas`
      );
    } catch (err: any) {
      setToast(`⚠️ ${err?.message || 'Error al sincronizar ahora.'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-[#0D1310] border border-emerald-500/30 space-y-2.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
            Estado de Vinculación Oficial del Equipo Activo
          </div>
          {isLinked ? (
            <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[12px] font-medium text-emerald-200">
              <span>✅ Vinculado: {compName} · {groupName} · {clubName}</span>
            </div>
          ) : (
            <p className="text-[12px] text-[#A1A1AA]">
              Vincula este equipo a su competición y grupo oficial para sincronizar plantilla, calendario, rivales y clasificación.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isLinked ? (
            <>
              <button
                type="button"
                onClick={handleQuickSync}
                disabled={syncing}
                className="h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[12px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>🔄 Sincronizar Ahora</span>
              </button>
              <button
                type="button"
                onClick={onOpenModal}
                className="h-8 px-3 rounded-md bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#EDEDED] font-medium text-[12px] flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span>⚙️ Gestionar / Cambiar Grupo</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenModal}
              className="h-9 px-4 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[12px] flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>🛡️ Vincular Competición Oficial</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="px-3 py-2 rounded-md bg-[#0A1910] border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
