import { useState, useEffect, useMemo } from 'react';
import { useTeam } from '../context/TeamContext';
import { MatchRecord } from '../types';
import { db } from '../services/db';

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
    if (!activeTeam) return [];
    const statsMap: Record<string, PlayerStatsAggregated> = {};

    (activeTeam?.players || []).filter(Boolean).forEach(p => {
      let sumRating = 0;
      if (p.evaluations && p.evaluations.length > 0) {
        sumRating = p.evaluations.reduce((acc, curr) => acc + curr.rating, 0) / p.evaluations.length;
      }
      const pid = String(p.id);
      statsMap[pid] = {
        playerId: pid,
        number: Number(p.number),
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
      if (String(match.teamId) !== String(activeTeam.id)) return;
      
      const matchDurationSec = match.duration || (90 * 60); 
      const matchDurationMin = Math.floor(matchDurationSec / 60);

      const participants = new Set<string>();
      
      const minutesMap: Record<string, number> = {};
      const startsSet = new Set<string>();
      const callUpsSet = new Set<string>();
      
      (match.squad || []).forEach(p => {
        const pid = String(p.id);
        if (!statsMap[pid]) return;
        minutesMap[pid] = matchDurationMin;
        participants.add(pid);
        startsSet.add(pid);
        callUpsSet.add(pid);
      });

      (match.bench || []).forEach(p => {
        const pid = String(p.id);
        if (!statsMap[pid]) return;
        minutesMap[pid] = 0;
        participants.add(pid);
        callUpsSet.add(pid);
      });

      match.events?.forEach(ev => {
        const evPid = String(ev.playerId);
        if (!statsMap[evPid]) return;
        
        if (ev.type === 'sub') {
          const evTimeMin = Math.floor((ev.time || 0) / 60);
          if (ev.playerId && minutesMap[evPid] !== undefined) {
             minutesMap[evPid] = evTimeMin;
          }
          if (ev.playerInId) {
             const evInPid = String(ev.playerInId);
             if (minutesMap[evInPid] !== undefined) {
               minutesMap[evInPid] = matchDurationMin - evTimeMin;
             }
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
          
          if (match.squad?.find(p => String(p.id) === pid)?.isCaptain) {
             statsMap[pid].captaincies += 1;
          }
        }
      });

      match.events?.forEach(ev => {
        const evPid = String(ev.playerId);
        if (ev.type === 'goal') {
          if (statsMap[evPid]) statsMap[evPid].goals += 1;
          if (ev.assistId) {
            const evAssistPid = String(ev.assistId);
            if (statsMap[evAssistPid]) {
              statsMap[evAssistPid].assists += 1;
            }
          }
        } else if (statsMap[evPid]) {
          if (ev.type === 'assist') statsMap[evPid].assists += 1;
          if (ev.type === 'yellow') statsMap[evPid].yellows += 1;
          if (ev.type === 'red') statsMap[evPid].reds += 1;
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
