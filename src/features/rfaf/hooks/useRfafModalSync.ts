import { useState } from 'react';
import { useTeam } from '../../../context/TeamContext';
import {
  FedMatchDayItem,
  FedPlayerCandidate,
  FedStandingRow,
  OfficialCompetitionLink,
} from '../../../types';
import {
  deduplicateStandingsRows,
  syncAllCompetitionData,
  syncRivalsFromStandings,
} from '../../../services/rfafConnectorService';

export function useRfafModalSync(onCalendarUpdated?: () => void) {
  const { activeTeam, teamSettings, updateTeamPlayers, updateTeamSettings } = useTeam();

  const existingLink = teamSettings?.rfafLink;
  const existingOfficial = teamSettings?.officialCompetitionLink;
  const [clubRfaf, setClubRfaf] = useState(
    existingOfficial?.officialTeamName || existingLink?.clubRfaf || activeTeam?.name || ''
  );
  const [competicion, setCompeticion] = useState(
    existingOfficial?.competitionName || existingLink?.competicion || '2ª Andaluza Sénior (Málaga)'
  );
  const [grupo, setGrupo] = useState(existingOfficial?.groupName || existingLink?.grupo || 'Grupo 2');
  const [sharedUrl, setSharedUrl] = useState(existingLink?.competitionUrl || '');

  const [syncingAll, setSyncingAll] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedCandidates, setSyncedCandidates] = useState<FedPlayerCandidate[] | null>(null);
  const [syncedMatches, setSyncedMatches] = useState<FedMatchDayItem[] | null>(null);
  const [syncedClubs, setSyncedClubs] = useState<string[] | null>(null);
  const [syncedStandings, setSyncedStandings] = useState<FedStandingRow[] | null>(null);

  const persistRfafLinkPatch = async (patch: Record<string, any> = {}, officialPatch?: OfficialCompetitionLink) => {
    if (!activeTeam) return;
    await updateTeamSettings({
      rfafLink: {
        ...(teamSettings?.rfafLink || {}),
        clubRfaf: officialPatch?.officialTeamName || clubRfaf.trim() || activeTeam.name,
        competicion: officialPatch?.competitionName || competicion.trim(),
        grupo: officialPatch?.groupName || grupo.trim(),
        competitionUrl: sharedUrl.trim(),
        ...patch,
      },
      ...(officialPatch ? { officialCompetitionLink: officialPatch } : {}),
    });
  };

  const handleSelectionChange = (sel: OfficialCompetitionLink) => {
    setClubRfaf(sel.officialTeamName);
    if (sel.competitionName) setCompeticion(sel.competitionName);
    if (sel.groupName) setGrupo(sel.groupName);
    setSharedUrl(
      `https://www.rfaf.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=${sel.codCompeticion}&CodGrupo=${sel.codGrupo}&CodTemporada=${sel.codTemporada}&CodJornada=1`
    );
  };

  const handleSyncAll = async (sel: OfficialCompetitionLink) => {
    if (!activeTeam) return;
    setSyncingAll(true);
    setSyncSummary(null);
    setSyncError(null);
    setSyncedStandings([]);
    setSyncedMatches([]);
    setSyncedCandidates([]);
    try {
      const res = await syncAllCompetitionData({
        teamId: activeTeam.id,
        codTemporada: sel.codTemporada,
        codCompeticion: sel.codCompeticion,
        codGrupo: sel.codGrupo,
        codigoEquipo: sel.codigoEquipo,
        officialTeamName: sel.officialTeamName,
        competitionName: sel.competitionName || competicion,
        groupName: sel.groupName || grupo,
        existingPlayers: activeTeam.players || [],
        unmatchedSanciones: existingLink?.unmatchedSanciones || [],
        homeStadium: activeTeam.homeStadium || teamSettings?.homeStadium,
      });

      const cleanStandings = deduplicateStandingsRows(res.standings);

      if (res.candidates.length > 0) {
        setSyncedCandidates(res.candidates);
        await updateTeamPlayers(res.updatedPlayers);
      }
      if (res.matches.length > 0) {
        setSyncedMatches(res.matches);
        setSyncedClubs(res.detectedClubs);
        onCalendarUpdated?.();
      }
      if (cleanStandings.length > 0) setSyncedStandings(cleanStandings);

      const nowIso = new Date().toISOString();
      await persistRfafLinkPatch(
        {
          competitionUrl: res.jornadaUrl,
          unmatchedSanciones: res.remainingUnmatched,
          standings: cleanStandings.length > 0 ? cleanStandings : deduplicateStandingsRows(existingLink?.standings),
          lastSyncAt: nowIso,
          lastCalendarSyncAt: nowIso,
          lastStandingsSyncAt: nowIso,
        },
        { ...sel, codigoEquipo: res.resolvedCodigoEquipo || sel.codigoEquipo, lastSyncedAt: nowIso }
      );

      const linkedMatchesNote =
        res.linkedMatchesCount > 0 ? ` (${res.linkedMatchesCount} enlazadas con partidos existentes)` : '';
      setSyncSummary(
        `⚡ Sincronización completada para ${sel.officialTeamName}: ${res.candidates.length} jugadores en plantilla · ${res.matches.length} jornadas en el Planificador${linkedMatchesNote} · ${cleanStandings.length} clubes en Clasificación y Rivales.`
      );
    } catch (err: any) {
      setSyncError(err?.message || 'Error al sincronizar los datos de la competición.');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSaveStandings = async (rows: FedStandingRow[]) => {
    if (!activeTeam) return;
    setSyncedStandings(rows);
    await persistRfafLinkPatch({ standings: rows, lastStandingsSyncAt: new Date().toISOString() });
    await syncRivalsFromStandings(activeTeam.id, clubRfaf || activeTeam.name, rows);
  };

  return {
    activeTeam,
    teamSettings,
    existingLink,
    existingOfficial,
    clubRfaf,
    competicion,
    grupo,
    sharedUrl,
    setSharedUrl,
    syncingAll,
    syncSummary,
    syncError,
    syncedCandidates,
    syncedMatches,
    syncedClubs,
    syncedStandings,
    updateTeamPlayers,
    persistRfafLinkPatch,
    handleSelectionChange,
    handleSyncAll,
    handleSaveStandings,
  };
}
