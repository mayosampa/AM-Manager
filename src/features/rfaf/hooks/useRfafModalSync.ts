import { useEffect, useState } from 'react';
import { useTeam } from '../../../context/TeamContext';
import {
  FedMatchDayItem,
  FedPlayerCandidate,
  FedStandingRow,
  OfficialCompetitionLink,
} from '../../../types';
import {
  aplicarCandidatosValidadosAPlantilla,
  buildCandidatesFromCurrentTeam,
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
  const [savingAll, setSavingAll] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedCandidates, setSyncedCandidates] = useState<FedPlayerCandidate[] | null>(null);
  const [syncedMatches, setSyncedMatches] = useState<FedMatchDayItem[] | null>(null);
  const [syncedClubs, setSyncedClubs] = useState<string[] | null>(null);
  const [syncedStandings, setSyncedStandings] = useState<FedStandingRow[] | null>(null);

  useEffect(() => {
    setClubRfaf(existingOfficial?.officialTeamName || existingLink?.clubRfaf || activeTeam?.name || '');
    setCompeticion(existingOfficial?.competitionName || existingLink?.competicion || '2ª Andaluza Sénior (Málaga)');
    setGrupo(existingOfficial?.groupName || existingLink?.grupo || 'Grupo 2');
    setSharedUrl(existingLink?.competitionUrl || '');
    setSyncSummary(null);
    setSyncError(null);
    setSyncedCandidates(null);
    setSyncedMatches(null);
    setSyncedClubs(null);
    setSyncedStandings(null);
  }, [activeTeam?.id]);

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

      setSyncSummary(
        `✅ ${res.candidates.length} jugadores validados, ${res.matches.length} jornadas y clasificación de ${cleanStandings.length} equipos actualizadas`
      );
    } catch (err: any) {
      setSyncError(err?.message || 'Error al sincronizar los datos de la competición.');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSaveStandings = async (rows: FedStandingRow[]) => {
    if (!activeTeam) return;
    const clean = deduplicateStandingsRows(rows);
    setSyncedStandings(clean);
    await persistRfafLinkPatch({ standings: clean, lastStandingsSyncAt: new Date().toISOString() });
    await syncRivalsFromStandings(activeTeam.id, clubRfaf || activeTeam.name, clean);
  };

  const handleSaveAndApplyAll = async () => {
    if (!activeTeam) return;
    setSavingAll(true);
    try {
      const cands =
        syncedCandidates && syncedCandidates.length > 0
          ? syncedCandidates
          : buildCandidatesFromCurrentTeam(activeTeam.players || [], existingLink?.unmatchedSanciones || []);
      const squadRes = aplicarCandidatosValidadosAPlantilla(
        activeTeam.players || [],
        cands,
        existingLink?.unmatchedSanciones || []
      );
      await updateTeamPlayers(squadRes.updatedPlayers);

      const cleanStandings = deduplicateStandingsRows(syncedStandings || existingLink?.standings || []);
      if (cleanStandings.length > 0) {
        await syncRivalsFromStandings(activeTeam.id, clubRfaf || activeTeam.name, cleanStandings);
      }

      const nowIso = new Date().toISOString();
      await persistRfafLinkPatch({
        unmatchedSanciones: squadRes.remainingUnmatched,
        standings: cleanStandings,
        lastSyncAt: nowIso,
        lastStandingsSyncAt: nowIso,
      });

      const matchCount = syncedMatches?.length ?? 0;
      const teamCount = cleanStandings.length;
      setSyncSummary(
        `✅ ${cands.filter(c => c.selected).length} jugadores validados${matchCount > 0 ? `, ${matchCount} jornadas` : ''} y clasificación de ${teamCount} equipos actualizadas`
      );
      onCalendarUpdated?.();
    } finally {
      setSavingAll(false);
    }
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
    savingAll,
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
    handleSaveAndApplyAll,
  };
}
