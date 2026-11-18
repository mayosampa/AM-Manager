import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FedStandingRow, MatchRecord, RivalScoutingReport, RivalTeam } from '../../../types';
import { db } from '../../../services/db';
import { clubsMatch, syncRivalsFromStandings } from '../../../services/rfafConnectorService';
import {
  buildAllRivalsIntelligence,
  RivalIntelligenceProfile,
} from '../../../services/rivalAnalyticsHelper';
import { useRivalsDb } from './useRivalsDb';
import { cloneRivalTeam, computeHeadToHead, RivalHeadToHeadSummary } from '../services/rivalsService';
import { buildRivalScoutingWhatsappText, exportRivalScoutingPDF } from '../services/rivalScoutingPdf';

export function profileToH2HSummary(profile: RivalIntelligenceProfile): RivalHeadToHeadSummary {
  return {
    played: profile.h2hSummary.played,
    wins: profile.h2hSummary.wins,
    draws: profile.h2hSummary.draws,
    losses: profile.h2hSummary.losses,
    goalsFor: profile.h2hSummary.goalsFor,
    goalsAgainst: profile.h2hSummary.goalsAgainst,
    matches: profile.h2hMatches.map(m => ({
      id: m.id,
      date: m.date,
      condition: m.condition,
      myScore: m.myScore,
      rivalScore: m.rivalScore,
      result: m.outcome === 'W' ? 'Victoria' : m.outcome === 'L' ? 'Derrota' : 'Empate',
      competition: m.competition,
    })),
  };
}

interface UseRivalEditorStateOptions {
  teamId?: string;
  teamName: string;
  ownClubName: string;
  standings?: FedStandingRow[];
  externalMatches?: MatchRecord[];
  enabled?: boolean;
}

export function useRivalEditorState({
  teamId,
  teamName,
  ownClubName,
  standings = [],
  externalMatches,
  enabled = true,
}: UseRivalEditorStateOptions) {
  const { rivals, loading, refreshRivals, upsertRival, addQuickRival, removeRival } = useRivalsDb(teamId);
  const [loadedMatches, setLoadedMatches] = useState<MatchRecord[]>([]);
  const [seasonPlan, setSeasonPlan] = useState<Record<string, any>>({});
  const [selectedRivalId, setSelectedRivalId] = useState<string>('');
  const [draft, setDraft] = useState<RivalTeam | null>(null);
  const [isAddingClub, setIsAddingClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubStadium, setNewClubStadium] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const syncedStandingsKeyRef = useRef<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!teamId) {
      setLoadedMatches([]);
      setSeasonPlan({});
      return;
    }
    const fetchMatches = externalMatches ? Promise.resolve(externalMatches) : db.getMatches(teamId).catch(() => []);
    Promise.all([fetchMatches, db.getSeasonPlan(teamId).catch(() => ({}))]).then(([mRes, pRes]) => {
      setLoadedMatches(mRes || []);
      setSeasonPlan(pRes || {});
    });
  }, [teamId, enabled, externalMatches]);

  useEffect(() => {
    if (!enabled || !teamId || loading || standings.length === 0) return;
    const syncKey = `${teamId}:${standings.length}`;
    if (syncedStandingsKeyRef.current === syncKey) return;
    syncedStandingsKeyRef.current = syncKey;
    syncRivalsFromStandings(teamId, ownClubName, standings)
      .then(() => refreshRivals())
      .catch(() => {});
  }, [enabled, teamId, loading, standings.length, ownClubName, refreshRivals]);

  const effectiveMatches = externalMatches ?? loadedMatches;

  const { profiles, summary } = useMemo(
    () =>
      buildAllRivalsIntelligence({
        rivals,
        standings,
        matches: effectiveMatches,
        seasonPlan,
        ownTeamName: ownClubName,
        teamId,
      }),
    [rivals, standings, effectiveMatches, seasonPlan, ownClubName, teamId]
  );

  const activeProfile = useMemo(
    () => profiles.find(p => p.rival.id === (draft?.id || selectedRivalId)) || null,
    [profiles, draft?.id, selectedRivalId]
  );

  const h2h = useMemo(() => {
    if (activeProfile) return profileToH2HSummary(activeProfile);
    return draft ? computeHeadToHead(draft.name, effectiveMatches) : null;
  }, [activeProfile, draft, effectiveMatches]);

  const selectRivalById = useCallback(
    (id: string) => {
      const found = rivals.find(r => r.id === id);
      if (!found) return false;
      setSelectedRivalId(id);
      setDraft(cloneRivalTeam(found));
      return true;
    },
    [rivals]
  );

  const selectOrCreateByName = useCallback(
    async (rawName: string) => {
      const trimmed = rawName.trim();
      if (!trimmed) return;
      const existing = rivals.find(
        r => r.name.trim().toLowerCase() === trimmed.toLowerCase() || clubsMatch(r.name, trimmed)
      );
      if (existing) {
        setSelectedRivalId(existing.id);
        setDraft(cloneRivalTeam(existing));
        return existing;
      }
      const created = await addQuickRival(trimmed);
      if (created) {
        setSelectedRivalId(created.id);
        setDraft(cloneRivalTeam(created));
      }
      return created;
    },
    [rivals, addQuickRival]
  );

  const createClub = useCallback(async () => {
    if (!newClubName.trim()) return null;
    const created = await addQuickRival(newClubName.trim(), newClubStadium.trim() || undefined);
    if (created) {
      setSelectedRivalId(created.id);
      setDraft(cloneRivalTeam(created));
      setNewClubName('');
      setNewClubStadium('');
      setIsAddingClub(false);
      showToast(`Club "${created.name}" añadido a la Liga`);
    }
    return created || null;
  }, [newClubName, newClubStadium, addQuickRival, showToast]);

  const saveDraft = useCallback(async () => {
    if (!draft || !draft.name.trim()) return;
    await upsertRival(draft);
    showToast('Informe y datos del club guardados');
  }, [draft, upsertRival, showToast]);

  const deleteDraft = useCallback(async (): Promise<boolean> => {
    if (!draft) return false;
    if (!window.confirm(`¿Eliminar "${draft.name}" del directorio de clubes?`)) return false;
    await removeRival(draft.id);
    const remaining = rivals.filter(r => r.id !== draft.id);
    setSelectedRivalId(remaining[0]?.id || '');
    setDraft(remaining[0] ? cloneRivalTeam(remaining[0]) : null);
    showToast('Club eliminado');
    return true;
  }, [draft, removeRival, rivals, showToast]);

  const updateScouting = useCallback(
    (updater: (prev: RivalScoutingReport) => RivalScoutingReport) => {
      setDraft(prev => (prev ? { ...prev, scouting: updater(prev.scouting) } : prev));
    },
    []
  );

  const copyWhatsApp = useCallback(async () => {
    if (!draft || !h2h) return;
    await upsertRival(draft);
    await navigator.clipboard.writeText(buildRivalScoutingWhatsappText(draft, teamName, h2h));
    showToast('Informe táctico copiado para WhatsApp');
  }, [draft, h2h, upsertRival, teamName, showToast]);

  const exportPdf = useCallback(async () => {
    if (!draft || !h2h) return;
    await upsertRival(draft);
    exportRivalScoutingPDF(draft, teamName, h2h);
    showToast('Plantilla PDF generada');
  }, [draft, h2h, upsertRival, teamName, showToast]);

  const quickExportPdf = useCallback(
    (profile: RivalIntelligenceProfile) => {
      exportRivalScoutingPDF(profile.rival, teamName, profileToH2HSummary(profile));
      showToast(`Plantilla PDF de "${profile.rival.name}" generada`);
    },
    [teamName, showToast]
  );

  return {
    rivals,
    loading,
    profiles,
    summary,
    activeProfile,
    h2h,
    selectedRivalId,
    setSelectedRivalId,
    draft,
    setDraft,
    isAddingClub,
    setIsAddingClub,
    newClubName,
    setNewClubName,
    newClubStadium,
    setNewClubStadium,
    toastMsg,
    selectRivalById,
    selectOrCreateByName,
    createClub,
    saveDraft,
    deleteDraft,
    updateScouting,
    copyWhatsApp,
    exportPdf,
    quickExportPdf,
  };
}
