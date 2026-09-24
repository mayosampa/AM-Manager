import { useState, useEffect, useMemo } from 'react';
import { useTeam } from '../context/TeamContext';
import { MatchRecord } from '../types';

export interface PlayerStatsAggregated {
  playerId: string;
  number: number;
  name: string;
  matches: number;
  starts: number;
  callUps: number;
  benchStarts: number;
  minPercentage: number;
  captaincies: number;
  _possibleMins?: number;
  avgMinutes: number;
  trainingAttendance: number;
  cleanSheets: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  averageRating: number;
}

export function useTeamStats() {
  const { activeTeam } = useTeam();
  const [history, setHistory] = useState<MatchRecord[]>([]);

  useEffect(() => {
    if (activeTeam?.id) {
      import('../services/db').then(({ db }) => {
        db.getMatches(activeTeam.id).then(matches => setHistory(matches));
      });
    } else {
      setHistory([]);
    }
  }, [activeTeam?.id]);

  const stats = useMemo(() => {
    if (!activeTeam) return [];
    const statsMap: Record<string, PlayerStatsAggregated> = {};

    (activeTeam?.players || []).filter(Boolean).forEach(p => {
      let sumRating = 0;
      if (p.evaluations && p.evaluations.length > 0) {
        sumRating = p.evaluations.reduce((acc, curr) => acc + curr.rating, 0) / p.evaluations.length;
      }
      statsMap[p.id] = {
        playerId: p.id,
        number: p.number,
        name: p.name || 'Desconocido',
        matches: 0,
        starts: 0,
        callUps: 0,
        benchStarts: 0,
        minPercentage: 0,
        captaincies: 0,
        _possibleMins: 0,
        avgMinutes: 0,
        trainingAttendance: p.attendance?.trainingPercentage || 0,
        cleanSheets: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
        averageRating: Number(sumRating.toFixed(1)) || 0
      };
    });

    history.forEach(match => {
      if (match.teamId !== activeTeam.id) return;
      
      // match.duration and ev.time are in seconds from LiveMatch
      const matchDurationSec = match.duration || (90 * 60); 
      const matchDurationMin = Math.floor(matchDurationSec / 60);

      const participants = new Set<string>();
      
      const minutesMap: Record<string, number> = {};
      const startsSet = new Set<string>();
      const callUpsSet = new Set<string>();
      
      (match.squad || []).forEach(p => {
        if (!statsMap[p.id]) return;
        minutesMap[p.id] = matchDurationMin;
        participants.add(p.id);
        startsSet.add(p.id);
        callUpsSet.add(p.id);
      });

      (match.bench || []).forEach(p => {
        if (!statsMap[p.id]) return;
        minutesMap[p.id] = 0;
        participants.add(p.id);
        callUpsSet.add(p.id);
      });

      match.events?.forEach(ev => {
        if (!statsMap[ev.playerId]) return;
        
        if (ev.type === 'sub') {
          const evTimeMin = Math.floor((ev.time || 0) / 60);
          if (ev.playerId && minutesMap[ev.playerId] !== undefined) {
             minutesMap[ev.playerId] = evTimeMin;
          }
          if (ev.playerInId && minutesMap[ev.playerInId] !== undefined) {
             minutesMap[ev.playerInId] = matchDurationMin - evTimeMin;
          }
        }
      });

      const isCleanSheet = (match.rivalScore === 0) || (match.score && match.score.away === 0 && match.condition === 'Local') || (match.score && match.score.home === 0 && match.condition === 'Visitante');

      participants.forEach(pid => {
        if (statsMap[pid]) {
          if (callUpsSet.has(pid)) {
            statsMap[pid].callUps += 1;
            statsMap[pid]._possibleMins = (statsMap[pid]._possibleMins || 0) + matchDurationMin;
          }
          if (startsSet.has(pid)) statsMap[pid].starts += 1;
          if (callUpsSet.has(pid) && !startsSet.has(pid)) statsMap[pid].benchStarts += 1;
          
          const playedMins = minutesMap[pid] || 0;
          if (playedMins > 0) {
             statsMap[pid].matches += 1;
             if (isCleanSheet) statsMap[pid].cleanSheets += 1;
          }
          statsMap[pid].minutesPlayed += playedMins;
          
          // Captaincies logic
          if (match.squad?.find(p => p.id === pid)?.isCaptain) {
             statsMap[pid].captaincies += 1;
          }
        }
      });

      match.events?.forEach(ev => {
        if (ev.type === 'goal') {
          if (statsMap[ev.playerId]) statsMap[ev.playerId].goals += 1;
          if (ev.assistId && statsMap[ev.assistId]) {
            statsMap[ev.assistId].assists += 1;
          }
        } else if (statsMap[ev.playerId]) {
          if (ev.type === 'assist') statsMap[ev.playerId].assists += 1;
          if (ev.type === 'yellow') statsMap[ev.playerId].yellows += 1;
          if (ev.type === 'red') statsMap[ev.playerId].reds += 1;
        }
      });
    });
    
    const finalStats = Object.values(statsMap).map(p => {
      p.avgMinutes = p.matches > 0 ? Math.round(p.minutesPlayed / p.matches) : 0;
      const possible = p._possibleMins || 0;
      let minPercent = possible > 0 ? Math.round((p.minutesPlayed / possible) * 100) : 0;
      p.minPercentage = Math.min(100, minPercent);
      delete p._possibleMins;
      return p;
    });

    return finalStats;
  }, [activeTeam, history]);

  return stats;
}
