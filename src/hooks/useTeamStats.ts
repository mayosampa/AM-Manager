import { useState, useEffect, useMemo } from 'react';
import { useTeam } from '../context/TeamContext';
import { MatchRecord } from '../types';
import { db } from '../services/db';
import { aggregatePlayerStats, PlayerStatsAggregated } from '../services/playerStatsAggregator';

export type { PlayerStatsAggregated };

export function useTeamStats() {
  const { activeTeam } = useTeam();
  const [history, setHistory] = useState<MatchRecord[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (activeTeam?.id) {
      db.getMatches(activeTeam.id).then(matches => {
        if (isMounted) setHistory(matches);
      }).catch(err => {
        console.error("Error fetching match history for stats:", err);
        if (isMounted) setHistory([]);
      });
    } else {
      setHistory([]);
    }
    return () => { isMounted = false; };
  }, [activeTeam?.id]);

  const stats = useMemo(() => {
    if (!activeTeam || !activeTeam.id) return [];
    return aggregatePlayerStats(activeTeam.players || [], history, activeTeam.id);
  }, [activeTeam, history]);

  return stats;
}
