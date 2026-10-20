import React, { useState, useEffect } from 'react';
import { Player, MatchRecord, MatchEvent, MatchTeamStats, TeamSideStats } from '../types';
import { Save, Loader, Plus, Trash2, ArrowRightLeft, RotateCcw, BarChart2 } from 'lucide-react';
import { db } from '../services/db';
import { RivalSelector } from '../features/rivals/components/RivalSelector';

interface ManualMatchEntryProps {
  activeTeam: any;
  upcomingMatch?: any;
  editingMatch?: MatchRecord;
  onComplete: () => void;
  onCancel: () => void;
}

interface SubstitutionRow {
  id: string;
  minute: number;
  playerOutId: string;
  playerInId: string;
}

interface PlayerStat {
  calledUp: boolean;
  starter: boolean;
  played: boolean;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  manualOverride: boolean;
}

const recalculateMinutes = (
  stats: Record<string, PlayerStat>,
  subs: SubstitutionRow[],
  duration: number
) => {
  const newStats = { ...stats };
  const allPlayerIds = Object.keys(newStats);

  // Simulation state
  const pitch = new Set<string>();
  const lastInTime: Record<string, number> = {};
  const accumulatedMins: Record<string, number> = {};

  // Init pitch with starters
  allPlayerIds.forEach(id => {
    if (newStats[id].starter) {
      pitch.add(id);
      lastInTime[id] = 0;
      accumulatedMins[id] = 0;
    } else {
      accumulatedMins[id] = 0;
    }
  });

  // Apply substitutions chronologically
  const sortedSubs = [...subs].sort((a, b) => a.minute - b.minute);
  sortedSubs.forEach(sub => {
    const outId = sub.playerOutId;
    const inId = sub.playerInId;

    if (outId && pitch.has(outId)) {
      accumulatedMins[outId] += (sub.minute - lastInTime[outId]);
      pitch.delete(outId);
    }

    if (inId && !pitch.has(inId)) {
      pitch.add(inId);
      lastInTime[inId] = sub.minute;
    }
  });

  // End of match calculation
  pitch.forEach(id => {
    accumulatedMins[id] += (duration - lastInTime[id]);
  });

  // Apply to stats without manual override
  allPlayerIds.forEach(id => {
    if (!newStats[id].manualOverride) {
      const calculatedMins = accumulatedMins[id];
      if (newStats[id].starter || calculatedMins > 0) {
        newStats[id].played = true;
        newStats[id].minutes = calculatedMins > duration ? duration : calculatedMins;
      } else {
        newStats[id].played = false;
        newStats[id].minutes = 0;
      }
    }
  });

  return newStats;
};

export function ManualMatchEntry({ activeTeam, upcomingMatch, editingMatch, onComplete, onCancel }: ManualMatchEntryProps) {
  const isEditing = !!editingMatch;
  const [date, setDate] = useState(isEditing ? editingMatch.date : (upcomingMatch?.date || new Date().toISOString().split('T')[0]));
  const [opponent, setOpponent] = useState(isEditing ? editingMatch.opponent : (upcomingMatch?.opponent || upcomingMatch?.matchDetails?.opponent || ''));
  const [matchType, setMatchType] = useState<'Liga'|'Amistoso'|'Copa'|'Torneo'>(isEditing ? editingMatch.matchType : (upcomingMatch?.matchDetails?.competition || 'Amistoso'));
  const [condition, setCondition] = useState<'Local'|'Visitante'>(
    isEditing ? editingMatch.condition : (upcomingMatch?.location === 'home' || upcomingMatch?.matchDetails?.isHome ? 'Local' : 'Visitante')
  );
  const [myTeamName] = useState(activeTeam.name);
  const [homeScore, setHomeScore] = useState<number>(isEditing ? editingMatch.score.home : 0);
  const [awayScore, setAwayScore] = useState<number>(isEditing ? editingMatch.score.away : 0);
  const [matchDuration, setMatchDuration] = useState<number>(isEditing ? (editingMatch.duration / 60) : 90);
  const [isSaving, setIsSaving] = useState(false);
  const [teamStats, setTeamStats] = useState<MatchTeamStats>(() => editingMatch?.teamStats || {
    myTeam: { shotsOnTarget: 0, shotsOffTarget: 0, corners: 0, fouls: 0, offsides: 0, possession: 50 },
    rival: { shotsOnTarget: 0, shotsOffTarget: 0, corners: 0, fouls: 0, offsides: 0, possession: 50 },
  });

  const updateSideStat = (side: 'myTeam' | 'rival', key: keyof Omit<TeamSideStats, 'possession'>, val: number) => {
    const clean = Math.max(0, Math.round(val) || 0);
    setTeamStats(prev => ({
      ...prev,
      [side]: { ...prev[side], [key]: clean },
    }));
  };

  const updateTeamPossession = (side: 'myTeam' | 'rival', val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val) || 0));
    const myPct = side === 'myTeam' ? clamped : 100 - clamped;
    setTeamStats(prev => ({
      ...prev,
      myTeam: { ...prev.myTeam, possession: myPct },
      rival: { ...prev.rival, possession: 100 - myPct },
    }));
  };

  const [substitutions, setSubstitutions] = useState<SubstitutionRow[]>(() => {
    if (editingMatch) {
      return editingMatch.events.filter((e: MatchEvent) => e.type === 'sub').map((e: MatchEvent) => ({
        id: e.id,
        minute: Math.floor(e.time / 60),
        playerOutId: e.playerId,
        playerInId: e.playerInId || ''
      }));
    }
    return [];
  });

  const addSubstitution = () => {
    setSubstitutions(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), minute: 60, playerOutId: '', playerInId: '' }
    ]);
  };

  const updateSub = (id: string, field: keyof SubstitutionRow, value: any) => {
    setSubstitutions(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSub = (id: string) => {
    setSubstitutions(prev => prev.filter(s => s.id !== id));
  };

  const availablePlayers: Player[] = (activeTeam.players || []).filter((p: Player) => p.isActive !== false);

  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStat>>(() => {
    const stats: Record<string, PlayerStat> = {};
    const squadIds = new Set(editingMatch?.squad?.map((p: Player) => p.id) || []);
    const benchIds = new Set(editingMatch?.bench?.map((p: Player) => p.id) || []);
    
    // Process events for goals, assists, cards
    const eventsForStats = editingMatch?.events || [];

    availablePlayers.forEach((p: Player) => {
      let calledUp = true;
      let starter = false;
      let minutes = 0;
      let manualOverride = false;
      let goals = 0;
      let assists = 0;
      let yellow = 0;
      let red = 0;

      if (editingMatch) {
        calledUp = squadIds.has(p.id) || benchIds.has(p.id);
        starter = squadIds.has(p.id);
        minutes = editingMatch.playerMinutes?.[p.id] || 0;
        manualOverride = !!editingMatch.playerMinutes?.[p.id];
        
        eventsForStats.forEach((e: MatchEvent) => {
          if (e.playerId === p.id) {
            if (e.type === 'goal') goals++;
            if (e.type === 'assist') assists++;
            if (e.type === 'yellow' || e.type === 'yellow_card') yellow++;
            if (e.type === 'red' || e.type === 'red_card') red++;
          }
          if (e.type === 'goal' && e.assistId === p.id) {
            assists++;
          }
        });
      }

      stats[p.id] = { 
        calledUp,
        starter, 
        played: minutes > 0, 
        minutes, 
        goals, 
        assists, 
        yellow, 
        red, 
        manualOverride 
      };
    });
    return stats;
  });

  // Trigger recalculation on subs or duration change
  useEffect(() => {
    setPlayerStats(prev => recalculateMinutes(prev, substitutions, matchDuration));
  }, [substitutions, matchDuration]);

  const toggleCalledUp = (id: string) => {
    setPlayerStats(prev => {
      const isCalledUp = !prev[id].calledUp;
      return recalculateMinutes({
        ...prev,
        [id]: { 
          ...prev[id], 
          calledUp: isCalledUp,
          starter: isCalledUp ? prev[id].starter : false,
          played: isCalledUp ? prev[id].played : false,
          minutes: isCalledUp ? prev[id].minutes : 0,
          goals: isCalledUp ? prev[id].goals : 0,
          assists: isCalledUp ? prev[id].assists : 0,
          yellow: isCalledUp ? prev[id].yellow : 0,
          red: isCalledUp ? prev[id].red : 0,
          manualOverride: isCalledUp ? prev[id].manualOverride : false
        }
      }, substitutions, matchDuration);
    });
  };

  const toggleStarter = (id: string) => {
    setPlayerStats(prev => {
      const newStarter = !prev[id].starter;
      return recalculateMinutes({
        ...prev,
        [id]: { 
          ...prev[id], 
          starter: newStarter, 
          calledUp: newStarter ? true : prev[id].calledUp,
          manualOverride: false 
        }
      }, substitutions, matchDuration);
    });
  };

  const updateManualMinutes = (id: string, value: number) => {
    setPlayerStats(prev => ({
      ...prev,
      [id]: { ...prev[id], minutes: value, manualOverride: true, played: value > 0 || prev[id].starter }
    }));
  };

  const resetManualOverride = (id: string) => {
    setPlayerStats(prev => recalculateMinutes({
      ...prev,
      [id]: { ...prev[id], manualOverride: false }
    }, substitutions, matchDuration));
  };

  const updatePlayerStat = (playerId: string, field: string, value: any) => {
    setPlayerStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!opponent.trim()) return alert('El nombre del rival es obligatorio');

    // Validate substitutions
    for (const sub of substitutions) {
      if (!sub.playerOutId || !sub.playerInId) {
        alert('Completa todos los campos de las sustituciones (jugador que sale y que entra).');
        return;
      }
      if (sub.playerOutId === sub.playerInId) {
        alert('El jugador que sale y el que entra no pueden ser el mismo en una sustitución.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const score = { home: homeScore, away: awayScore };
      const myScore = condition === 'Local' ? homeScore : awayScore;
      const rivalScore = condition === 'Local' ? awayScore : homeScore;
      const matchResult = myScore > rivalScore ? 'Victoria' : (myScore < rivalScore ? 'Derrota' : 'Empate');

      const events: MatchEvent[] = [];
      let timeCounter = 10 * 60;

      const addEvent = (type: any, playerId: string, assistId?: string) => {
        events.push({
          id: Math.random().toString(36).substring(2, 9),
          type,
          time: timeCounter,
          playerId,
          assistId
        });
        timeCounter += 120;
      };

      const squadIds = Object.keys(playerStats).filter(id => playerStats[id].calledUp && playerStats[id].starter);
      const benchIds = Object.keys(playerStats).filter(id => playerStats[id].calledUp && !playerStats[id].starter);
      const squad = availablePlayers.filter((p: Player) => squadIds.includes(p.id));
      const bench = availablePlayers.filter((p: Player) => benchIds.includes(p.id));

      // Goals / assists / cards from the individual stats table (only called up)
      Object.keys(playerStats).forEach(id => {
        if (!playerStats[id].calledUp) return;
        const stats = playerStats[id];
        for (let i = 0; i < stats.goals; i++) addEvent('goal', id);
        for (let i = 0; i < stats.assists; i++) addEvent('assist', id);
        for (let i = 0; i < stats.yellow; i++) addEvent('yellow', id);
        for (let i = 0; i < stats.red; i++) addEvent('red', id);
      });

      // Substitutions from the dedicated subs section
      substitutions
        .slice()
        .sort((a, b) => a.minute - b.minute) // chronological order
        .forEach(sub => {
          events.push({
            id: Math.random().toString(36).substring(2, 9),
            type: 'sub',
            time: sub.minute * 60,
            playerId: sub.playerOutId,
            playerInId: sub.playerInId,
          });
        });

      // Preserve non-editable events (shots, corners, fouls, offsides, notes, period_end, rival goals) when editing
      if (isEditing && Array.isArray(editingMatch.events)) {
        const managedTypes = new Set(['goal', 'assist', 'yellow', 'yellow_card', 'red', 'red_card', 'sub']);
        editingMatch.events.forEach((ev: MatchEvent) => {
          if (!managedTypes.has(ev.type) || (ev.type === 'goal' && ev.playerId === 'rival')) {
            events.push(ev);
          }
        });
      }

      // Sort all events by time descending
      events.sort((a, b) => b.time - a.time);

      const matchId = isEditing ? editingMatch.id : Math.random().toString(36).substring(2, 9);

      // Persist minutes explicitly
      const playerMinutes: Record<string, number> = {};
      let totalPlayerGoals = 0;
      let totalPlayerYellow = 0;
      let totalPlayerRed = 0;
      Object.keys(playerStats).forEach(id => {
        if (!playerStats[id].calledUp) return;
        const mins = Number(playerStats[id].minutes) || 0;
        if (mins > 0) playerMinutes[String(id)] = mins;
        totalPlayerGoals += Number(playerStats[id].goals) || 0;
        totalPlayerYellow += Number(playerStats[id].yellow) || 0;
        totalPlayerRed += Number(playerStats[id].red) || 0;
      });

      const syncedTeamStats: MatchTeamStats = {
        myTeam: {
          ...teamStats.myTeam,
          shotsOnTarget: Math.max(teamStats.myTeam.shotsOnTarget || 0, myScore, totalPlayerGoals),
          yellowCards: Math.max(teamStats.myTeam.yellowCards || 0, totalPlayerYellow),
          redCards: Math.max(teamStats.myTeam.redCards || 0, totalPlayerRed),
        },
        rival: {
          ...teamStats.rival,
          shotsOnTarget: Math.max(teamStats.rival.shotsOnTarget || 0, rivalScore),
        },
      };

      const newMatch: MatchRecord = {
        id: matchId,
        teamId: activeTeam.id,
        date,
        score,
        events,
        duration: matchDuration * 60,
        squad,
        bench,
        opponent,
        matchType,
        matchResult,
        myTeamName,
        condition,
        myScore,
        rivalScore,
        notes: isEditing ? (editingMatch.notes || '') : 'Partido añadido manualmente.',
        playerMinutes,
        teamStats: syncedTeamStats,
      };

      await db.saveMatch(newMatch);

      const plan = await db.getSeasonPlan(activeTeam?.id);
      if (plan && typeof plan === 'object') {
        const candidateKeys = Array.from(new Set([
          upcomingMatch?.planKey,
          upcomingMatch?.date,
          date,
          activeTeam?.id ? `${activeTeam.id}_${date}` : undefined,
        ].filter(Boolean) as string[]));

        let updated = false;
        for (const key of candidateKeys) {
          const existingDay = plan[key];
          if (existingDay && (existingDay.isMatchDay === true || existingDay.type === 'match' || key === upcomingMatch?.planKey || key === upcomingMatch?.date)) {
            const scoreStr = `${score.home} - ${score.away}`;
            plan[key] = {
              ...existingDay,
              completed: true,
              played: true,
              isPlayed: true,
              matchId,
              score: scoreStr,
              matchDetails: {
                ...(existingDay.matchDetails || {
                  opponent,
                  isHome: condition === 'Local',
                  competition: matchType,
                }),
                played: true,
                score: scoreStr,
              },
            };
            updated = true;
          }
        }

        if (updated) {
          await db.saveSeasonPlan(plan, activeTeam?.id);
        }
      }

      onComplete();
    } catch (err) {
      console.error('Error saving manual match:', err);
      alert('Error al guardar el partido. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full pb-20 gap-6 animate-in slide-in-from-bottom-4">

      {/* Header */}
      <div className="flex justify-between items-center bg-[#0A0A0A] p-6 rounded-lg border border-[#1F1F1F]">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Añadir Resultado Manual</h1>
          <p className="text-[#888888]">Registra un partido finalizado y las estadísticas de tus jugadores.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="bg-[#111111] text-white border border-[#1F1F1F] font-bold py-3 px-6 rounded-md hover:bg-[#1A1A1A] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#EDEDED] text-[#0A0A0A] font-bold py-3 px-6 rounded-md hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Guardando...' : 'Guardar Partido'}
          </button>
        </div>
      </div>

      {/* Match info + Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-6">
          <h2 className="font-bold text-white mb-4">Datos del Partido</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#888888] mb-1">Fecha</label>
                <input
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888888] mb-1">Duración (min)</label>
                <input
                  type="number" value={matchDuration} onChange={e => setMatchDuration(parseInt(e.target.value) || 90)}
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg p-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#888888] mb-1">Equipo Rival (Club de la Liga)</label>
              <RivalSelector
                teamId={activeTeam?.id}
                value={opponent}
                isAway={condition === 'Visitante'}
                onChange={(name) => setOpponent(name)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#888888] mb-1">Condición</label>
                <select
                  value={condition} onChange={e => setCondition(e.target.value as 'Local'|'Visitante')}
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg p-2 text-white"
                >
                  <option value="Local">Local</option>
                  <option value="Visitante">Visitante</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888888] mb-1">Competición</label>
                <select
                  value={matchType} onChange={e => setMatchType(e.target.value as any)}
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg p-2 text-white"
                >
                  <option value="Liga">Liga</option>
                  <option value="Copa">Copa</option>
                  <option value="Amistoso">Amistoso</option>
                  <option value="Torneo">Torneo</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-6 flex flex-col items-center justify-center">
          <h2 className="font-bold text-[#888888] uppercase tracking-widest text-sm mb-6">Resultado Final</h2>
          <div className="flex items-center gap-8 w-full justify-center">
            <div className="flex flex-col items-center">
              <span className="text-[#888888] text-xs font-bold uppercase mb-2 truncate w-24 text-center">
                {condition === 'Local' ? myTeamName : opponent}
              </span>
              <input
                type="number" min="0" value={homeScore}
                onChange={e => setHomeScore(parseInt(e.target.value) || 0)}
                className="w-20 h-24 bg-[#111111] border border-[#1F1F1F] rounded-md text-5xl font-semibold text-center text-white"
              />
            </div>
            <span className="text-[#2A2A2E] text-4xl font-semibold">-</span>
            <div className="flex flex-col items-center">
              <span className="text-[#888888] text-xs font-bold uppercase mb-2 truncate w-24 text-center">
                {condition === 'Visitante' ? myTeamName : opponent}
              </span>
              <input
                type="number" min="0" value={awayScore}
                onChange={e => setAwayScore(parseInt(e.target.value) || 0)}
                className="w-20 h-24 bg-[#111111] border border-[#1F1F1F] rounded-md text-5xl font-semibold text-center text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------
          ESTADÍSTICAS DE EQUIPO (OPCIONAL)
      -------------------------------------------------- */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-[#EDEDED]" />
            <h2 className="font-bold text-white">Estadísticas de Equipo</h2>
            <span className="text-xs text-[#888888] font-normal">(Opcional)</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-emerald-400">{myTeamName}</span>
            <span className="text-[#888888]">vs</span>
            <span className="text-[#EDEDED]">{opponent || 'Rival'}</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Posesión % */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[#111111] border border-[#1F1F1F] rounded-md p-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={teamStats.myTeam.possession ?? 50}
                onChange={e => updateTeamPossession('myTeam', parseInt(e.target.value) || 0)}
                className="w-20 bg-[#0A0A0A] border border-emerald-500/30 rounded-lg p-1.5 text-center font-mono font-bold text-emerald-400"
              />
              <span className="text-xs text-[#888888] font-bold">%</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#888888] text-center min-w-[130px]">
              Posesión (%)
            </span>
            <div className="flex items-center justify-end gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={teamStats.rival.possession ?? 50}
                onChange={e => updateTeamPossession('rival', parseInt(e.target.value) || 0)}
                className="w-20 bg-[#0A0A0A] border border-[#333333] rounded-lg p-1.5 text-center font-mono font-bold text-[#EDEDED]"
              />
              <span className="text-xs text-[#888888] font-bold">%</span>
            </div>
          </div>

          {([
            { key: 'shotsOnTarget', label: 'Tiros a puerta' },
            { key: 'shotsOffTarget', label: 'Tiros fuera' },
            { key: 'corners', label: 'Córners' },
            { key: 'fouls', label: 'Faltas' },
            { key: 'offsides', label: 'Fueras de juego' },
          ] as { key: keyof Omit<TeamSideStats, 'possession'>; label: string }[]).map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[#111111] border border-[#1F1F1F]/60 rounded-md px-3 py-2">
              <div>
                <input
                  type="number"
                  min={0}
                  value={teamStats.myTeam[key]}
                  onChange={e => updateSideStat('myTeam', key, parseInt(e.target.value) || 0)}
                  className="w-20 bg-[#0A0A0A] border border-[#1F1F1F] focus:border-emerald-500/50 rounded-lg p-1.5 text-center font-mono font-bold text-white"
                />
              </div>
              <span className="text-xs font-semibold text-[#888888] text-center min-w-[130px]">{label}</span>
              <div className="flex justify-end">
                <input
                  type="number"
                  min={0}
                  value={teamStats.rival[key]}
                  onChange={e => updateSideStat('rival', key, parseInt(e.target.value) || 0)}
                  className="w-20 bg-[#0A0A0A] border border-[#1F1F1F] focus:border-[#525252] rounded-lg p-1.5 text-center font-mono font-bold text-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------
          SUSTITUCIONES
      -------------------------------------------------- */}
      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white">Sustituciones</h2>
            {substitutions.length > 0 && (
              <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                {substitutions.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={addSubstitution}
            className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-600/20 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Añadir Cambio
          </button>
        </div>

        {substitutions.length === 0 ? (
          <p className="text-[#888888] text-sm italic text-center py-4">
            No hay cambios registrados. Pulsa "+ Añadir Cambio" y se calcularán automáticamente los minutos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_40px] gap-3 text-xs font-bold uppercase text-[#888888] px-1">
              <span>Minuto</span>
              <span className="text-red-400">? Sale</span>
              <span className="text-green-400">? Entra</span>
              <span></span>
            </div>

            {substitutions.map((sub) => (
              <div
                key={sub.id}
                className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_40px] gap-3 items-center bg-[#111111] p-3 rounded-md border border-[#1F1F1F]"
              >
                <div>
                  <label className="block text-xs text-[#888888] mb-1 sm:hidden">Minuto</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="1" max={matchDuration}
                      value={sub.minute}
                      onChange={e => updateSub(sub.id, 'minute', parseInt(e.target.value) || 1)}
                      className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-2 text-white text-center font-bold"
                    />
                    <span className="text-[#888888] text-sm">'</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-red-400 font-semibold mb-1 sm:hidden">? Jugador que SALE</label>
                  <select
                    value={sub.playerOutId}
                    onChange={e => updateSub(sub.id, 'playerOutId', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-red-500/40 rounded-lg p-2 text-white text-sm"
                  >
                    <option value="">Sale: selecciona...</option>
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id}>({p.number}) {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-green-400 font-semibold mb-1 sm:hidden">? Jugador que ENTRA</label>
                  <select
                    value={sub.playerInId}
                    onChange={e => updateSub(sub.id, 'playerInId', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-green-500/40 rounded-lg p-2 text-white text-sm"
                  >
                    <option value="">Entra: selecciona...</option>
                    {availablePlayers
                      .filter(p => p.id !== sub.playerOutId) 
                      .map(p => (
                        <option key={p.id} value={p.id}>({p.number}) {p.name}</option>
                      ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => removeSub(sub.id)}
                  className="flex items-center justify-center text-[#888888] hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                  title="Eliminar cambio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-6 overflow-hidden">
        <h2 className="font-bold text-white mb-4">Estadísticas Individuales</h2>
        <div className="overflow-auto custom-scrollbar max-h-[500px] pb-4">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#111111] border-b border-[#1F1F1F] text-[#888888] text-xs uppercase tracking-wider shadow-sm">
                <th className="py-3 px-2 bg-[#111111] sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Jugador</th>
                <th className="py-3 px-2 text-center bg-[#111111]">Conv.</th>
                <th className="py-3 px-2 text-center bg-[#111111]">Titular</th>
                <th className="py-3 px-2 text-center bg-[#111111]">Minutos</th>
                <th className="py-3 px-2 text-center bg-[#111111]">Goles</th>
                <th className="py-3 px-2 text-center bg-[#111111]">Asist.</th>
                <th className="py-3 px-2 text-center bg-[#111111]">Amarillas</th>
                <th className="py-3 px-2 text-center bg-[#111111]">Rojas</th>
              </tr>
            </thead>
            <tbody>
              {availablePlayers.map((p: Player) => {
                const s = playerStats[p.id];
                if (!s) return null;
                const isCalledUp = s.calledUp;
                
                return (
                  <tr
                    key={p.id}
                    className={`group border-b border-[#1F1F1F]/50 hover:bg-[#111111] transition-colors ${!isCalledUp ? 'opacity-30 grayscale' : ''}`}
                  >
                    <td className="py-2 px-2 font-semibold text-white sticky left-0 z-10 bg-[#0A0A0A] group-hover:bg-[#111111] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                      <span className="text-[#888888] mr-2 text-xs">{p.number}</span>
                      {p.name}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isCalledUp}
                        onChange={() => toggleCalledUp(p.id)}
                        className="w-5 h-5 rounded border-[#1F1F1F] text-blue-500 focus:ring-blue-500 bg-[#111111]"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={s.starter}
                        disabled={!isCalledUp}
                        onChange={() => toggleStarter(p.id)}
                        className="w-5 h-5 rounded border-[#1F1F1F] text-[#EDEDED] focus:ring-white/10 bg-[#111111] disabled:opacity-50"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number" min="0" max="120" value={s.minutes}
                          disabled={!isCalledUp}
                          onChange={e => updateManualMinutes(p.id, parseInt(e.target.value) || 0)}
                          className={`w-16 bg-[#111111] border ${s.manualOverride ? 'border-yellow-500/50' : 'border-[#1F1F1F]'} rounded p-1 text-center text-white disabled:opacity-50`}
                        />
                        {s.manualOverride && isCalledUp && (
                          <button 
                            onClick={() => resetManualOverride(p.id)} 
                            title="Restaurar cálculo automático" 
                            className="text-yellow-500 hover:text-yellow-400 p-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number" min="0" value={s.goals}
                        disabled={!isCalledUp}
                        onChange={e => updatePlayerStat(p.id, 'goals', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#111111] border border-[#1F1F1F] rounded p-1 text-center text-white mx-auto disabled:opacity-50"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number" min="0" value={s.assists}
                        disabled={!isCalledUp}
                        onChange={e => updatePlayerStat(p.id, 'assists', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#111111] border border-[#1F1F1F] rounded p-1 text-center text-white mx-auto disabled:opacity-50"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number" min="0" max="2" value={s.yellow}
                        disabled={!isCalledUp}
                        onChange={e => updatePlayerStat(p.id, 'yellow', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#111111] border border-[#1F1F1F] rounded p-1 text-center text-white mx-auto disabled:opacity-50"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number" min="0" max="1" value={s.red}
                        disabled={!isCalledUp}
                        onChange={e => updatePlayerStat(p.id, 'red', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#111111] border border-[#1F1F1F] rounded p-1 text-center text-white mx-auto disabled:opacity-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
