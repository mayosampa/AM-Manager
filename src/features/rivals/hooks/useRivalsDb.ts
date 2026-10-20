import { useState, useEffect, useCallback } from 'react';
import { RivalTeam } from '../../../types';
import {
  createRivalTeam,
  deleteRivalTeam,
  loadAndSyncRivals,
  upsertRivalTeam,
} from '../services/rivalsService';

export function useRivalsDb(teamId?: string) {
  const [rivals, setRivals] = useState<RivalTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshRivals = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadAndSyncRivals(teamId);
      setRivals(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    refreshRivals();
  }, [refreshRivals]);

  const upsertRival = useCallback(
    async (rival: RivalTeam) => {
      const updated = await upsertRivalTeam(teamId, rival);
      setRivals(updated);
      return updated;
    },
    [teamId]
  );

  const addQuickRival = useCallback(
    async (name: string, stadium?: string, pitchInfo?: string): Promise<RivalTeam> => {
      const cleanName = name.trim();
      const existing = rivals.find(
        r => r.name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      if (existing) {
        if (stadium && !existing.stadium) {
          const enriched = { ...existing, stadium: stadium.trim() };
          await upsertRival(enriched);
          return enriched;
        }
        return existing;
      }
      const created = createRivalTeam(cleanName, stadium, pitchInfo);
      await upsertRival(created);
      return created;
    },
    [rivals, upsertRival]
  );

  const removeRival = useCallback(
    async (rivalId: string) => {
      const updated = await deleteRivalTeam(teamId, rivalId);
      setRivals(updated);
      return updated;
    },
    [teamId]
  );

  const findRivalByName = useCallback(
    (name?: string): RivalTeam | undefined => {
      if (!name) return undefined;
      const norm = name.trim().toLowerCase();
      return rivals.find(r => r.name.trim().toLowerCase() === norm);
    },
    [rivals]
  );

  return {
    rivals,
    loading,
    refreshRivals,
    upsertRival,
    addQuickRival,
    removeRival,
    findRivalByName,
  };
}
