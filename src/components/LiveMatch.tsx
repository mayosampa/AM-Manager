import { useState, useEffect, useRef } from 'react';
import { Player, MatchEvent, EventType, MatchTeamStats, TeamSideStats } from '../types';
import { useTeam } from '../context/TeamContext';
import { Play, Pause, Goal, Handshake, ArrowRightLeft, Square, Trash2, Edit3, BarChart2, Plus, Minus, Crosshair, CircleOff, Flag, AlertTriangle, AlertOctagon, Shield, Swords, X, ChevronLeft } from 'lucide-react';
import { db, matchSessionKey } from '../services/db';
import { RivalSelector } from '../features/rivals/components/RivalSelector';

const DEFAULT_TEAM_STATS: MatchTeamStats = {
  myTeam: { shotsOnTarget: 0, shotsOffTarget: 0, corners: 0, fouls: 0, offsides: 0, yellowCards: 0, redCards: 0, possession: 50 },
  rival: { shotsOnTarget: 0, shotsOffTarget: 0, corners: 0, fouls: 0, offsides: 0, yellowCards: 0, redCards: 0, possession: 50 },
};

const getTeamStatKeyForEvent = (type: EventType): keyof Omit<TeamSideStats, 'possession'> | null => {
  switch (type) {
    case 'shot_on_target':
    case 'goal':
      return 'shotsOnTarget';
    case 'shot_off_target':
      return 'shotsOffTarget';
    case 'corner':
      return 'corners';
    case 'foul':
      return 'fouls';
    case 'offside':
      return 'offsides';
    case 'yellow':
    case 'yellow_card':
      return 'yellowCards';
    case 'red':
    case 'red_card':
      return 'redCards';
    default:
      return null;
  }
};

const getEventActionTitle = (type: EventType): string => {
  switch (type) {
    case 'shot_on_target':
      return 'Tiro a Puerta';
    case 'shot_off_target':
      return 'Tiro Fuera';
    case 'corner':
      return 'Córner';
    case 'foul':
      return 'Falta';
    case 'offside':
      return 'Fuera de Juego';
    case 'yellow_card':
    case 'yellow':
      return 'Tarjeta Amarilla';
    case 'red_card':
    case 'red':
      return 'Tarjeta Roja';
    default:
      return 'Acción';
  }
};

interface LiveMatchProps {
  squad: Player[];
  bench: Player[];
  onNavigate: (view: any) => void;
  scheduledMatch?: any;
  onCancel?: () => void;
}



function LiveMatchInner({ squad, bench, onNavigate, onCancel, scheduledMatch, initialSession }: LiveMatchProps & { initialSession: any }) {
  const loadState = (key: string, defaultVal: any) => {
    if (initialSession && initialSession.matchConfig && initialSession[key] !== undefined) {
      return initialSession[key];
    }
    return defaultVal;
  };
  const { activeTeam } = useTeam();
  
  // Check if we are restoring
  const isRestoring = !!loadState('matchConfig', null);

  // --- Match Roster State ---
  const [onField, setOnField] = useState<Player[]>(() => loadState('onField', squad));
  const [availableBench, setAvailableBench] = useState<Player[]>(() => loadState('availableBench', bench));

  // --- Timer State (requestAnimationFrame based) ---
  const [isRunning, setIsRunning] = useState(() => loadState('isRunning', false));
  const [accumulated, setAccumulated] = useState(() => loadState('accumulated', 0));
  const [startTime, setStartTime] = useState(() => loadState('startTime', Date.now()));
  const [displayTime, setDisplayTime] = useState(() => {
     const run = loadState('isRunning', false);
     const acc = loadState('accumulated', 0);
     const start = loadState('startTime', Date.now());
     if (run) return acc + Math.floor((Date.now() - start) / 1000);
     return loadState('displayTime', 0);
  });
  const [period, setPeriod] = useState<'1st_half' | 'halftime' | '2nd_half' | 'finished'>(() => loadState('period', '1st_half'));
  const [addedTime, setAddedTime] = useState(() => loadState('addedTime', { firstHalf: 0, secondHalf: 0, total: 0 }));

  // --- Match State ---
  const [score, setScore] = useState(() => loadState('score', { home: 0, away: 0 }));
  const [events, setEvents] = useState<MatchEvent[]>(() => loadState('events', []));
  const [teamStats, setTeamStats] = useState<MatchTeamStats>(() => loadState('teamStats', DEFAULT_TEAM_STATS));

  // --- Modal / Sub State ---
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null);
  const [teamSelectEvent, setTeamSelectEvent] = useState<EventType | null>(null);
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [matchSyncDate, setMatchSyncDate] = useState(() => loadState('matchSyncDate', scheduledMatch ? scheduledMatch.date : new Date().toISOString().split('T')[0]));
  const [matchConfig, setMatchConfig] = useState<{opponent: string, type: 'Liga' | 'Amistoso' | 'Copa' | 'Torneo', myTeamName: string, condition: 'Local' | 'Visitante', halfDuration: number} | null>(() => loadState('matchConfig', null));

  // Store initial arrays for accurate statistics
  const [initialStarters, setInitialStarters] = useState<Player[]>(() => loadState('initialStarters', []));
  const [initialBenchPlayers, setInitialBenchPlayers] = useState<Player[]>(() => loadState('initialBenchPlayers', []));
  const [setupForm, setSetupForm] = useState({
    opponent: '',
    type: 'Liga' as 'Liga' | 'Amistoso' | 'Copa' | 'Torneo',
    myTeamName: activeTeam?.name || 'Mi Equipo',
    condition: 'Local' as 'Local' | 'Visitante',
    halfDuration: 45,
  });
  const allAvailable = [...squad, ...bench];
  const [selectedStartersIds, setSelectedStartersIds] = useState<string[]>(squad.map(p => p.id));
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [subStep, setSubStep] = useState<'out' | 'in'>('out');
  const [goalFlow, setGoalFlow] = useState<{ step: 'scorer' | 'question' | 'assister', scorerId?: string } | null>(null);
  const [playerOutId, setPlayerOutId] = useState<string | null>(null);

  // Sync scheduledMatch into form on mount / whenever scheduledMatch changes
  useEffect(() => {
    if (scheduledMatch && !isRestoring) {
      if (scheduledMatch.date) setMatchSyncDate(scheduledMatch.date);
      const opponent =
        scheduledMatch.opponent ||
        scheduledMatch.matchDetails?.opponent ||
        scheduledMatch.title ||
        '';
      const isHome =
        scheduledMatch.location === 'home' ||
        scheduledMatch.matchDetails?.isHome === true;
      const competition =
        scheduledMatch.competition ||
        scheduledMatch.matchDetails?.competition ||
        'Liga';
      setSetupForm(prev => ({
        ...prev,
        opponent,
        condition: isHome ? 'Local' : 'Visitante',
        type: competition as any,
      }));
    }
  }, [scheduledMatch]);


  // --- Timer Tick (Optimized for Low-End Devices) ---
  useEffect(() => {
    if (!isRunning) return;

    // Exact hydration on mount/resume
    setDisplayTime(accumulated + Math.floor((Date.now() - startTime) / 1000));

    // Decoupled tick loop
    const timerId = setInterval(() => {
      setDisplayTime(accumulated + Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timerId);
  }, [isRunning, accumulated, startTime]);

  // --- Persistent State (Throttled) ---
  const stateRef = useRef({ onField, availableBench, isRunning, accumulated, startTime, displayTime, period, addedTime, score, events, matchConfig, initialStarters, initialBenchPlayers, captainId, matchSyncDate, teamStats });
  useEffect(() => {
    stateRef.current = { onField, availableBench, isRunning, accumulated, startTime, displayTime, period, addedTime, score, events, matchConfig, initialStarters, initialBenchPlayers, captainId, matchSyncDate, teamStats };
  });

  const saveSession = () => {
    if (stateRef.current.matchConfig) {
      db.saveAppState(matchSessionKey(activeTeam?.id), stateRef.current).catch(console.error);
    }
  };

  // Guardado periódico (cada 10s para ahorrar batería)
  useEffect(() => {
    const saveInterval = setInterval(saveSession, 10000);
    return () => clearInterval(saveInterval);
  }, []);

  // Guardado inmediato en acciones clave
  useEffect(() => {
    saveSession();
  }, [events, period, isRunning, score, teamStats]);

  const adjustTeamStat = (side: 'myTeam' | 'rival', key: keyof Omit<TeamSideStats, 'possession'>, delta: number) => {
    setTeamStats(prev => ({
      ...prev,
      [side]: {
        ...prev[side],
        [key]: Math.max(0, (prev[side]?.[key] || 0) + delta),
      },
    }));
  };

  const updatePossession = (myPct: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(myPct)));
    setTeamStats(prev => ({
      ...prev,
      myTeam: { ...prev.myTeam, possession: clamped },
      rival: { ...prev.rival, possession: 100 - clamped },
    }));
  };

  const toggleTimer = () => {
    if (isRunning) {
      setAccumulated(prev => prev + Math.floor((Date.now() - startTime) / 1000));
      setIsRunning(false);
    } else {
      setStartTime(Date.now());
      setIsRunning(true);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEventSelect = (type: EventType) => {
    if (type === 'goal') {
      setGoalFlow({ step: 'scorer' });
      setPendingEvent(null);
      setTeamSelectEvent(null);
      return;
    }
    if (type === 'sub') {
      setTeamSelectEvent(null);
      setPendingEvent('sub');
      setSubStep('out');
      setPlayerOutId(null);
      return;
    }
    if (type === 'assist') {
      setTeamSelectEvent(null);
      setPendingEvent('assist');
      return;
    }

    const teamSelectable: EventType[] = [
      'shot_on_target',
      'shot_off_target',
      'corner',
      'offside',
      'foul',
      'yellow_card',
      'yellow',
      'red_card',
      'red',
    ];

    if (teamSelectable.includes(type)) {
      setPendingEvent(null);
      setTeamSelectEvent(type);
      return;
    }

    setPendingEvent(type);
  };

  const handleSelectTeamForAction = (team: 'myTeam' | 'rival') => {
    if (!teamSelectEvent) return;
    const action = teamSelectEvent;
    const statKey = getTeamStatKeyForEvent(action);

    if (team === 'rival') {
      if (statKey) {
        adjustTeamStat('rival', statKey, 1);
      }
      const newEvent: MatchEvent = {
        id: Math.random().toString(36).substring(2, 9),
        type: action,
        playerId: 'rival',
        time: displayTime,
      };
      setEvents(prev => [newEvent, ...prev]);
      setTeamSelectEvent(null);
    } else {
      setTeamSelectEvent(null);
      setPendingEvent(action);
    }
  };

  const cancelEvent = () => {
    setPendingEvent(null);
    setTeamSelectEvent(null);
    setPlayerOutId(null);
    setGoalFlow(null);
  };

  const assignGoalScorer = (playerId: string) => {
    setGoalFlow({ step: 'question', scorerId: playerId });
  };

  const handleGoalQuestion = (hasAssist: boolean) => {
    if (!hasAssist && goalFlow?.scorerId) {
      finalizeGoal(goalFlow.scorerId);
    } else if (hasAssist && goalFlow?.scorerId) {
      setGoalFlow({ step: 'assister', scorerId: goalFlow.scorerId });
    }
  };

  const assignGoalAssister = (playerId: string) => {
    if (goalFlow?.scorerId) {
      finalizeGoal(goalFlow.scorerId, playerId);
    }
  };

  const finalizeGoal = (scorerId: string, assistId?: string) => {
    const isLocal = matchConfig?.condition === 'Local';
    if (isLocal) {
      setScore(prev => ({ ...prev, home: prev.home + 1 }));
    } else {
      setScore(prev => ({ ...prev, away: prev.away + 1 }));
    }

    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'goal',
      playerId: scorerId,
      assistId: assistId,
      time: displayTime,
    };
    setEvents(prev => [newEvent, ...prev]);
    adjustTeamStat('myTeam', 'shotsOnTarget', 1);
    setGoalFlow(null);
  };

  const handleRivalGoal = () => {
    const isLocal = matchConfig?.condition === 'Local';
    if (isLocal) {
      setScore(prev => ({ ...prev, away: prev.away + 1 }));
    } else {
      setScore(prev => ({ ...prev, home: prev.home + 1 }));
    }
    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'goal',
      playerId: 'rival', // special marker
      time: displayTime,
    };
    setEvents(prev => [newEvent, ...prev]);
    adjustTeamStat('rival', 'shotsOnTarget', 1);
  };

  const assignEventToPlayer = (playerId: string) => {
    if (!pendingEvent) return;

    if (pendingEvent === 'sub') {
      if (subStep === 'out') {
        setPlayerOutId(playerId);
        setSubStep('in');
        return; // wait for step 2
      } else {
        // subStep === 'in'
        const pOut = onField.find(p => p.id === playerOutId);
        const pIn = availableBench.find(p => p.id === playerId);
        
        if (pOut && pIn) {
          // Swap players in arrays
          setOnField(prev => [...prev.filter(p => p.id !== pOut.id), pIn]);
          setAvailableBench(prev => [...prev.filter(p => p.id !== pIn.id), pOut]);

          const newEvent: MatchEvent = {
            id: Math.random().toString(36).substring(2, 9),
            type: pendingEvent,
            playerId: pOut.id,
            playerInId: pIn.id,
            time: displayTime,
          };
          setEvents(prev => [newEvent, ...prev]);
        }
        cancelEvent();
        return;
      }
    }

    // Normal Events
    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type: pendingEvent,
      playerId,
      time: displayTime,
    };
    setEvents(prev => [newEvent, ...prev]);
    const statKey = getTeamStatKeyForEvent(pendingEvent);
    if (statKey) {
      adjustTeamStat('myTeam', statKey, 1);
    }
    cancelEvent();
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!window.confirm("¿Seguro que deseas deshacer este evento?")) return;

    const eventToDel = events.find(e => e.id === eventId);
    if (!eventToDel) return;

    if (eventToDel.type === 'sub' && eventToDel.playerId && eventToDel.playerInId) {
      const pOut = availableBench.find(p => p.id === eventToDel.playerId) || initialStarters.find(p => p.id === eventToDel.playerId);
      const pIn = onField.find(p => p.id === eventToDel.playerInId);
      if (pOut && pIn) {
        setOnField(f => [...f.filter(p => p.id !== eventToDel.playerInId), pOut]);
        setAvailableBench(b => [...b.filter(p => p.id !== eventToDel.playerId), pIn]);
      }
    } else if (eventToDel.type === 'goal') {
      const isLocal = matchConfig?.condition === 'Local';
      if (eventToDel.playerId === 'rival') {
        setScore(s => ({ ...s, [isLocal ? 'away' : 'home']: Math.max(0, s[isLocal ? 'away' : 'home'] - 1) }));
      } else {
        setScore(s => ({ ...s, [isLocal ? 'home' : 'away']: Math.max(0, s[isLocal ? 'home' : 'away'] - 1) }));
      }
    }

    if (eventToDel.playerId && eventToDel.playerId !== 'rival' && eventToDel.playerId !== 'system') {
      const statKey = getTeamStatKeyForEvent(eventToDel.type);
      if (statKey) {
        adjustTeamStat('myTeam', statKey, -1);
      }
    }

    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleAddNote = () => {
    const text = window.prompt("Introduce una nota o apunte táctico rápido:");
    if (text && text.trim().length > 0) {
      const newEvent: MatchEvent = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'note',
        notes: text.trim(),
        time: displayTime,
      };
      setEvents(prev => [newEvent, ...prev]);
    }
  };


  const handlePeriodTransition = () => {
    if (period === '1st_half') {
      setIsRunning(false);
      const halfDurationSec = (matchConfig?.halfDuration || 45) * 60;
      const diff = displayTime - halfDurationSec;
      const addedMinutes = diff > 0 ? Math.ceil(diff / 60) : 0;
      setAddedTime(prev => ({ ...prev, firstHalf: addedMinutes }));
      const newEvent: MatchEvent = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'period_end',
        playerId: 'system',
        time: displayTime,
        addedMinutes,
        periodLabel: 'Fin 1ª Parte'
      };
      setEvents(prev => [newEvent, ...prev]);
      setPeriod('halftime');
    } else if (period === 'halftime') {
      const halfDurationSec = (matchConfig?.halfDuration || 45) * 60;
      setAccumulated(halfDurationSec);
      setDisplayTime(halfDurationSec);
      setStartTime(Date.now());
      setIsRunning(true);
      setPeriod('2nd_half');
    } else if (period === '2nd_half') {
      setIsEndMatchModalOpen(true);
    }
  };

  const confirmEndMatch = async () => {
    if (!matchConfig) return;

    setIsRunning(false);
    
    const isLocal = matchConfig.condition === 'Local';
    const myScore = isLocal ? score.home : score.away;
    const rivalScore = isLocal ? score.away : score.home;

    const matchResult = myScore > rivalScore ? 'Victoria' : (myScore < rivalScore ? 'Derrota' : 'Empate');

    const fullDurationSec = (matchConfig.halfDuration || 45) * 60 * 2;
    const diff = displayTime - fullDurationSec;
    const addedMinutes = diff > 0 ? Math.ceil(diff / 60) : 0;
    const finalAddedTime = { ...addedTime, secondHalf: addedMinutes, total: addedTime.firstHalf + addedMinutes };

    const matchData = {
      id: Math.random().toString(36).substring(2, 9),
      teamId: activeTeam?.id || 'default', // injected teamId
      date: matchSyncDate,
      score,
      events,
      duration: displayTime,
      squad: initialStarters.length > 0 ? initialStarters : onField, // Fallback if old match
      bench: initialStarters.length > 0 ? initialBenchPlayers : availableBench,
      opponent: matchConfig.opponent,
      matchType: matchConfig.type,
      matchResult: matchResult as 'Victoria' | 'Empate' | 'Derrota',
      myTeamName: matchConfig.myTeamName,
      condition: matchConfig.condition,
      myScore,
      rivalScore,
      teamStats,
    };

    const { db } = await import('../services/db');
    await db.saveMatch(matchData);
    
    // Sync with Season Planner (Macrocycle) only if this match belongs to a scheduled calendar day
    let seasonPlan = await db.getSeasonPlan(activeTeam?.id);
    if (!seasonPlan || typeof seasonPlan !== 'object') seasonPlan = {};

    const candidateKeys = Array.from(new Set([
      scheduledMatch?.planKey,
      scheduledMatch?.date,
      matchSyncDate,
      activeTeam?.id ? `${activeTeam.id}_${matchSyncDate}` : undefined,
    ].filter(Boolean) as string[]));

    const matchedKey = candidateKeys.find(
      k => seasonPlan[k] && (seasonPlan[k].isMatchDay === true || seasonPlan[k].type === 'match' || Boolean(scheduledMatch))
    );

    if (matchedKey || scheduledMatch) {
      const targetKey = matchedKey || scheduledMatch?.planKey || matchSyncDate;
      const existingDayPlan = (matchedKey ? seasonPlan[matchedKey] : null) || {
        dateString: matchSyncDate,
        teamId: activeTeam?.id,
        plannedExercises: [],
        isMatchDay: true,
        isRestDay: false,
        playersNeeded: 18
      };

      const scoreStr = `${score.home} - ${score.away}`;
      seasonPlan[targetKey] = {
        ...existingDayPlan,
        teamId: activeTeam?.id || existingDayPlan.teamId,
        isMatchDay: true,
        completed: true,
        played: true,
        isPlayed: true,
        matchId: matchData.id,
        score: scoreStr,
        matchDetails: {
          ...(existingDayPlan.matchDetails || {
            opponent: matchConfig.opponent,
            isHome: isLocal,
            competition: matchConfig.type
          }),
          played: true,
          score: scoreStr
        }
      };

      // Clean up any duplicate keys for the same match date
      for (const k of candidateKeys) {
        if (k !== targetKey && seasonPlan[k] && (seasonPlan[k].isMatchDay === true || seasonPlan[k].type === 'match')) {
          delete seasonPlan[k];
        }
      }

      await db.saveSeasonPlan(seasonPlan, activeTeam?.id);
    }
    db.deleteAppState(matchSessionKey(activeTeam?.id)).catch(console.error);

    setIsEndMatchModalOpen(false);
    onNavigate('history');
  };

  const handleFinishMatch_UNUSED = async () => {
    if (window.confirm("¿Finalizar y guardar partido?")) {
      setIsRunning(false); // Detener el reloj por seguridad
      
      const matchData = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
        score,
        events,
        duration: displayTime,
        squad: onField,
        bench: availableBench,
        teamId: activeTeam?.id || 'default'
      };

      const { db } = await import('../services/db');
      await db.saveMatch(matchData);
      
      onNavigate('history');
    }
  };

  const allPlayers = [...onField, ...availableBench];
  const startMatch = () => {
    // No opponent validation — default to 'Rival Desconocido' if empty
    const opponentName = setupForm.opponent.trim() || 'Rival Desconocido';
    console.log('[LiveMatch] startMatch called, opponent:', opponentName, 'squad:', allAvailable.length);

    const newOnField = allAvailable.filter(p => selectedStartersIds.includes(p.id)).map(p => ({
      ...p,
      isCaptain: p.id === captainId
    }));
    const newBench = allAvailable.filter(p => !selectedStartersIds.includes(p.id)).map(p => ({
      ...p,
      isCaptain: p.id === captainId
    }));

    setInitialStarters(newOnField);
    setInitialBenchPlayers(newBench);
    setOnField(newOnField);
    setAvailableBench(newBench);

    setMatchConfig({
      opponent: opponentName,
      type: setupForm.type,
      myTeamName: setupForm.myTeamName,
      condition: setupForm.condition,
      halfDuration: (setupForm as any).halfDuration || 45,
    });
    setStartTime(Date.now());
    setIsRunning(true);
  };


  const handleExitSetup = () => {
    if (onCancel) onCancel();
    else onNavigate('match');
  };

  useEffect(() => {
    if (matchConfig) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleExitSetup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchConfig, onCancel, onNavigate]);

  if (!matchConfig) {
    return (
      <div className="flex flex-col h-full bg-[#050505] w-full items-center justify-center p-4">
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-6 md:p-8 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in-95">
          {/* Top-Right Close Button (X) */}
          <button
            type="button"
            onClick={handleExitSetup}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#141416] border border-[#27272A] text-[#888888] hover:text-[#EDEDED] hover:bg-[#202024] flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar y volver al Match Hub (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top-Left Volver Button */}
          <button
            type="button"
            onClick={handleExitSetup}
            className="mb-2 text-[12px] font-medium text-[#71717A] hover:text-[#EDEDED] flex items-center gap-1 transition-colors cursor-pointer"
            title="Volver"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <h2 className="text-2xl font-bold text-white mb-6 text-center">Configurar Partido</h2>
          
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#888888] text-sm font-medium mb-1">Mi Equipo</label>
                <input 
                  type="text" 
                  value={setupForm.myTeamName}
                  readOnly
                  disabled
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3 text-sm text-[#888888] cursor-not-allowed focus:outline-none opacity-70"
                />
              </div>
              <div>
                <label className="block text-[#888888] text-sm font-medium mb-1">Condición</label>
                <div className="flex bg-[#111111] border border-[#1F1F1F] rounded-md p-1">
                  <button 
                    onClick={() => !scheduledMatch && setSetupForm({...setupForm, condition: 'Local'})}
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
                      setupForm.condition === 'Local' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:text-white'
                    } ${scheduledMatch ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    Local
                  </button>
                  <button 
                    onClick={() => !scheduledMatch && setSetupForm({...setupForm, condition: 'Visitante'})}
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
                      setupForm.condition === 'Visitante' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:text-white'
                    } ${scheduledMatch ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    Visitante
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#888888] text-sm font-medium mb-1 flex items-center gap-2">
                  Nombre del Rival
                  {scheduledMatch && (
                    <span className="text-[10px] font-bold bg-[#161616] text-[#EDEDED] px-2 py-0.5 rounded-full border border-[#333333]">
                      📅 Desde Calendario
                    </span>
                  )}
                </label>
                {scheduledMatch ? (
                  <input 
                    type="text" 
                    placeholder="Ej: Atlético de Madrid"
                    value={setupForm.opponent}
                    disabled
                    readOnly
                    className="w-full bg-[#111111] border border-[#333333] text-[#EDEDED] cursor-not-allowed opacity-80 rounded-md px-4 py-3 text-sm focus:outline-none"
                  />
                ) : (
                  <RivalSelector
                    teamId={activeTeam?.id}
                    value={setupForm.opponent}
                    isAway={setupForm.condition === 'Visitante'}
                    onChange={(name) => setSetupForm({ ...setupForm, opponent: name })}
                  />
                )}
              </div>
              <div>
                <label className="block text-[#888888] text-sm font-medium mb-1">Tipo de Partido</label>
                <select 
                  value={setupForm.type}
                  onChange={(e) => setSetupForm({...setupForm, type: e.target.value as any})}
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#525252]"
                >
                  <option value="Liga">Liga</option>
                  <option value="Amistoso">Amistoso</option>
                  <option value="Copa">Copa</option>
                  <option value="Torneo">Torneo</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[#888888] text-sm font-medium mb-1">Duración por Parte (min)</label>
                <input 
                  type="number" 
                  value={setupForm.halfDuration}
                  onChange={(e) => setSetupForm({...setupForm, halfDuration: parseInt(e.target.value) || 45})}
                  className="w-full bg-[#111111] border border-[#1F1F1F] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#525252]"
                  min="1"
                  max="60"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[#888888] text-sm font-medium">Titulares</label>
                <span className={`text-xs font-bold px-2 py-1 rounded-md border ${
                  selectedStartersIds.length === (activeTeam?.modality === 'F7' ? 7 : 11) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#111111] text-white border-[#1F1F1F]'
                }`}>
                  {selectedStartersIds.length} Seleccionados
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-3 bg-[#111111] border border-[#1F1F1F] rounded-md">
                {allAvailable.map(p => {
                  const isSelected = selectedStartersIds.includes(p.id);
                  return (
                    <div key={p.id} className="relative">
                      <button
                        onClick={() => {
                          const limit = activeTeam?.modality === 'F7' ? 7 : 11;
                          if (isSelected) {
                            setSelectedStartersIds(prev => prev.filter(id => id !== p.id));
                            if (captainId === p.id) setCaptainId(null);
                          } else if (selectedStartersIds.length < limit) {
                            setSelectedStartersIds(prev => [...prev, p.id]);
                          }
                        }}
                        className={`w-full flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                          isSelected 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                            : 'bg-[#0A0A0A] border-[#1F1F1F] text-[#888888] hover:border-[#3A3A3A]'
                        }`}
                      >
                        <div className="text-sm font-bold mb-1">{p.number}</div>
                        <div className="text-[10px] truncate w-full text-center">{p.name.split(' ')[0]}</div>
                      </button>
                      
                      {isSelected && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCaptainId(p.id === captainId ? null : p.id); }}
                          className={`absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border-2 transition-colors ${
                            captainId === p.id 
                              ? 'bg-yellow-500 text-black border-yellow-500' 
                              : 'bg-[#111111] text-[#888888] border-[#1F1F1F] hover:border-yellow-500/50 hover:text-yellow-500'
                          }`}
                          title="Asignar Capitán"
                        >
                          ©
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-4">
            <button
              type="button"
              onClick={handleExitSetup}
              className="py-3.5 px-5 bg-[#141416] text-[#EDEDED] border border-[#27272A] font-semibold rounded-md hover:bg-[#1E1E22] transition-colors text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={startMatch}
              className="flex-1 py-3.5 bg-[#EDEDED] text-[#0A0A0A] font-bold rounded-md hover:bg-white transition-colors text-base cursor-pointer shadow-sm"
            >
              Iniciar Partido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] w-full relative">
      <div className="sticky top-0 z-10 bg-[#0A0A0A] border-b border-[#1F1F1F] p-4 pb-6 flex flex-col items-center">
        <div className="text-[#888888] font-medium text-sm mb-4 text-center">
          AM Manager <span className="mx-2">|</span> 🏆 {matchConfig.type}
        </div>
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-4">
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-1 truncate max-w-[100px]">
              {matchConfig.condition === 'Local' ? matchConfig.myTeamName : matchConfig.opponent}
            </span>
            <span className="text-5xl font-semibold text-white">
              {score.home}
            </span>
          </div>
          <div className="text-[#2A2A2E] text-3xl font-bold px-4">-</div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-1 truncate max-w-[100px]">
              {matchConfig.condition === 'Local' ? matchConfig.opponent : matchConfig.myTeamName}
            </span>
            <span className="text-5xl font-semibold text-white">
              {score.away}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
          {/* Period label */}
          <span className="text-xs font-bold uppercase tracking-widest text-[#EDEDED]">
            {period === '1st_half' && '1ª Parte'}
            {period === 'halftime' && 'Descanso'}
            {period === '2nd_half' && '2ª Parte'}
            {period === 'finished' && 'Finalizado'}
          </span>

          {/* Clock row */}
          <div className="flex items-center gap-4">
            <div className="text-4xl font-mono font-bold text-[#EDEDED] bg-[#111111] px-6 py-2 rounded-md border border-[#333333]">
              {formatTime(displayTime)}
            </div>
            <button
              onClick={toggleTimer}
              className={`w-12 h-12 flex items-center justify-center rounded-md transition-all ${
                isRunning ? 'bg-[#1A1A1A] text-white hover:bg-[#262626]' : 'bg-[#EDEDED] text-[#0A0A0A] hover:bg-white '
              }`}
            >
              {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>
          </div>

          {/* Period-transition button — always visible, full width */}
          {period === '1st_half' && (
            <button
              onClick={handlePeriodTransition}
              className="w-full bg-red-600 text-white py-3 text-base font-bold rounded-md hover:bg-red-700 transition-all"
            >
              ⏸ Pitar Descanso
            </button>
          )}
          {period === 'halftime' && (
            <button
              onClick={handlePeriodTransition}
              className="w-full bg-blue-600 text-white py-3 text-base font-bold rounded-md hover:bg-blue-700 transition-all"
            >
              ▶ Iniciar 2ª Parte
            </button>
          )}
          {period === '2nd_half' && (
            <button
              onClick={handlePeriodTransition}
              className="w-full bg-gray-700 text-white py-3 text-base font-bold rounded-md hover:bg-gray-800 transition-all"
            >
              ■ Finalizar Partido
            </button>
          )}
        </div>
      </div>

      {/* ── 3-COLUMN MAIN LAYOUT ── */}
      <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-3 lg:p-5 gap-4">

        {/* COL 1 — Acciones Rápidas */}
        <div className="lg:w-56 xl:w-64 flex flex-col shrink-0 lg:max-h-full lg:overflow-y-auto custom-scrollbar pr-0.5">
          <h2 className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-2.5">Acciones</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
            <button
              onClick={() => handleEventSelect('goal')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                goalFlow ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30' : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              <Goal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-400 text-xs sm:text-sm">Gol a Favor</span>
            </button>

            <button
              onClick={handleRivalGoal}
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-all"
            >
              <Goal className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-bold text-red-400 text-xs sm:text-sm">Gol Rival</span>
            </button>

            <button
              onClick={() => handleEventSelect('assist')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'assist' ? 'bg-white/20 border-white ring-2 ring-white/30' : 'bg-[#111111] border-[#1F1F1F] hover:bg-[#1A1A1A]'
              }`}
            >
              <Handshake className="w-4 h-4 text-white shrink-0" />
              <span className="font-bold text-white text-xs sm:text-sm">Asistencia</span>
            </button>

            <button
              onClick={() => handleEventSelect('shot_on_target')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'shot_on_target' || teamSelectEvent === 'shot_on_target' ? 'bg-cyan-500/25 border-cyan-400 ring-2 ring-cyan-400/30' : 'bg-[#111111] border-[#1F1F1F] hover:bg-[#1A1A1A]'
              }`}
            >
              <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold text-cyan-400 text-xs sm:text-sm">Tiro a Puerta</span>
            </button>

            <button
              onClick={() => handleEventSelect('shot_off_target')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'shot_off_target' || teamSelectEvent === 'shot_off_target' ? 'bg-zinc-500/25 border-zinc-400 ring-2 ring-zinc-400/30' : 'bg-[#111111] border-[#1F1F1F] hover:bg-[#1A1A1A]'
              }`}
            >
              <CircleOff className="w-4 h-4 text-zinc-300 shrink-0" />
              <span className="font-bold text-zinc-300 text-xs sm:text-sm">Tiro Fuera</span>
            </button>

            <button
              onClick={() => handleEventSelect('corner')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'corner' || teamSelectEvent === 'corner' ? 'bg-lime-500/25 border-lime-400 ring-2 ring-lime-400/30' : 'bg-[#111111] border-[#1F1F1F] hover:bg-[#1A1A1A]'
              }`}
            >
              <Flag className="w-4 h-4 text-lime-400 shrink-0" />
              <span className="font-bold text-lime-400 text-xs sm:text-sm">Córner</span>
            </button>

            <button
              onClick={() => handleEventSelect('offside')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'offside' || teamSelectEvent === 'offside' ? 'bg-orange-500/25 border-orange-400 ring-2 ring-orange-400/30' : 'bg-[#111111] border-[#1F1F1F] hover:bg-[#1A1A1A]'
              }`}
            >
              <AlertOctagon className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="font-bold text-orange-400 text-xs sm:text-sm">Fuera de Juego</span>
            </button>

            <button
              onClick={() => handleEventSelect('foul')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'foul' || teamSelectEvent === 'foul' ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/30' : 'bg-[#111111] border-[#1F1F1F] hover:bg-[#1A1A1A]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-400 text-xs sm:text-sm">Falta</span>
            </button>

            <button
              onClick={() => handleEventSelect('yellow_card')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'yellow' || pendingEvent === 'yellow_card' || teamSelectEvent === 'yellow_card' || teamSelectEvent === 'yellow' ? 'bg-yellow-500/30 border-yellow-400 ring-2 ring-yellow-400/30' : 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20'
              }`}
            >
              <div className="w-3 h-4 bg-yellow-400 rounded-sm shrink-0" />
              <span className="font-bold text-yellow-400 text-xs sm:text-sm">Amarilla</span>
            </button>

            <button
              onClick={() => handleEventSelect('red_card')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'red' || pendingEvent === 'red_card' || teamSelectEvent === 'red_card' || teamSelectEvent === 'red' ? 'bg-red-500/25 border-red-500 ring-2 ring-red-500/30' : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
              }`}
            >
              <div className="w-3 h-4 bg-red-500 rounded-sm shrink-0" />
              <span className="font-bold text-red-400 text-xs sm:text-sm">Roja</span>
            </button>

            <button
              onClick={() => handleEventSelect('sub')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border transition-all  ${
                pendingEvent === 'sub' ? 'bg-blue-500/30 border-blue-400 ring-2 ring-blue-400/30' : 'bg-[#111111] border-[#1F1F1F] hover:bg-[#1A1A1A]'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-bold text-blue-400 text-xs sm:text-sm">Cambio</span>
            </button>

            <button
              onClick={handleAddNote}
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#111111] border border-[#1F1F1F] rounded-md hover:bg-[#1A1A1A] transition-all"
            >
              <Edit3 className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-bold text-purple-400 text-xs sm:text-sm">Nota Rápida</span>
            </button>
          </div>

          {/* Action status indicator */}
          {(pendingEvent || goalFlow || teamSelectEvent) && (
            <div className="mt-3 p-3 bg-[#161616] border border-[#333333] rounded-md">
              <p className="text-[#EDEDED] text-xs font-bold text-center">
                {teamSelectEvent && `¿De qué equipo es: ${getEventActionTitle(teamSelectEvent)}?`}
                {goalFlow?.step === 'scorer' && '⚽ Selecciona el GOLEADOR'}
                {goalFlow?.step === 'question' && '¿Hubo asistencia?'}
                {goalFlow?.step === 'assister' && '👟 Selecciona el ASISTENTE'}
                {pendingEvent === 'assist' && '👟 Selecciona el ASISTENTE'}
                {pendingEvent === 'shot_on_target' && '🎯 Tiro a Puerta — Selecciona jugador'}
                {pendingEvent === 'shot_off_target' && '💨 Tiro Fuera — Selecciona jugador'}
                {pendingEvent === 'corner' && '🚩 Córner — Selecciona jugador'}
                {pendingEvent === 'offside' && '🚩 Fuera de Juego — Selecciona jugador'}
                {pendingEvent === 'foul' && '⚠️ Falta — Selecciona jugador'}
                {(pendingEvent === 'yellow' || pendingEvent === 'yellow_card') && '🟨 Selecciona el jugador'}
                {(pendingEvent === 'red' || pendingEvent === 'red_card') && '🟥 Selecciona el jugador'}
                {pendingEvent === 'sub' && subStep === 'out' && '↑ ¿Quién SALE?'}
                {pendingEvent === 'sub' && subStep === 'in' && '↓ ¿Quién ENTRA?'}
              </p>
              <button onClick={cancelEvent} className="w-full mt-2 text-[#888888] text-xs hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          )}

          {/* Goal flow question */}
          {goalFlow?.step === 'question' && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleGoalQuestion(false)}
                className="flex-1 py-2 bg-[#111111] border border-[#1F1F1F] text-white text-xs font-bold rounded-md hover:bg-[#1A1A1A]"
              >
                Sin asistencia
              </button>
              <button
                onClick={() => handleGoalQuestion(true)}
                className="flex-1 py-2 bg-white/10 border border-white/20 text-white text-xs font-bold rounded-md hover:bg-white/20"
              >
                Con asistencia
              </button>
            </div>
          )}
        </div>

        {/* COL 2 — En el Campo (Squad Panel) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-[#888888] uppercase tracking-widest">En el Campo</h2>
            <span className="text-xs text-[#888888]">{onField.length} jugadores</span>
          </div>

          {/* On Field Players Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2 mb-4">
            {onField.map(p => {
              const isActionable = !!(pendingEvent || goalFlow?.step === 'scorer' || goalFlow?.step === 'assister');
              const isSubOut = pendingEvent === 'sub' && subStep === 'out';
              const isSubIn = pendingEvent === 'sub' && subStep === 'in';
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (!isActionable && !isSubOut) return;
                    assignEventToPlayer(p.id);
                  }}
                  disabled={isSubIn}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-md border transition-all  ${
                    isActionable || isSubOut
                      ? 'border-[#333333] bg-[#161616] hover:bg-[#222222] cursor-pointer ring-1 ring-white/20'
                      : 'border-[#1F1F1F] bg-[#111111] cursor-default'
                  } ${isSubIn ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-base mb-1 ${
                    isActionable || isSubOut ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'bg-[#1A1A1A] text-white'
                  }`}>
                    {p.number}
                  </div>
                  <span className="text-[10px] font-bold text-center text-white leading-tight line-clamp-1 w-full">
                    {p.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bench Players (shown when substitution step === 'in') */}
          {pendingEvent === 'sub' && subStep === 'in' && (
            <div>
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Banquillo — ¿Quién entra?</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2">
                {availableBench.map(p => (
                  <button
                    key={p.id}
                    onClick={() => assignEventToPlayer(p.id)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-md border border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/15 transition-all"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base mb-1">
                      {p.number}
                    </div>
                    <span className="text-[10px] font-bold text-center text-white leading-tight line-clamp-1 w-full">
                      {p.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
                {availableBench.length === 0 && (
                  <p className="col-span-full text-center text-[#888888] text-xs italic py-4">Sin jugadores en el banquillo</p>
                )}
              </div>
            </div>
          )}

          {/* Estadísticas de Equipo en Directo */}
          <div className="mt-4 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#EDEDED]" />
                Estadísticas de Equipo
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="text-emerald-400 truncate max-w-[110px]">{matchConfig.myTeamName}</span>
                <span className="text-[#888888]">vs</span>
                <span className="text-[#EDEDED] truncate max-w-[110px]">{matchConfig.opponent}</span>
              </div>
            </div>

            {/* Possession bar & slider */}
            <div className="mb-3 bg-[#111111] border border-[#1F1F1F] rounded-md p-2.5">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updatePossession((teamStats.myTeam.possession ?? 50) - 5)}
                    className="w-5 h-5 rounded bg-[#0A0A0A] border border-[#1F1F1F] text-[#888888] hover:text-white flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-emerald-400 font-mono">{teamStats.myTeam.possession ?? 50}%</span>
                  <button
                    type="button"
                    onClick={() => updatePossession((teamStats.myTeam.possession ?? 50) + 5)}
                    className="w-5 h-5 rounded bg-[#0A0A0A] border border-[#1F1F1F] text-[#888888] hover:text-white flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#888888]">Posesión</span>
                <span className="text-[#EDEDED] font-mono">{teamStats.rival.possession ?? 50}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={teamStats.myTeam.possession ?? 50}
                onChange={(e) => updatePossession(Number(e.target.value))}
                className="w-full h-1.5 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Quick counters */}
            <div className="space-y-1.5">
              {([
                { key: 'shotsOnTarget', label: 'Tiros a puerta' },
                { key: 'shotsOffTarget', label: 'Tiros fuera' },
                { key: 'corners', label: 'Córners' },
                { key: 'fouls', label: 'Faltas' },
                { key: 'offsides', label: 'Fueras de juego' },
                { key: 'yellowCards', label: 'Amarillas' },
                { key: 'redCards', label: 'Rojas' },
              ] as { key: keyof Omit<TeamSideStats, 'possession'>; label: string }[]).map(({ key, label }) => (
                <div key={key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-[#111111] border border-[#1F1F1F]/60 rounded-md px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustTeamStat('myTeam', key, -1)}
                      className="w-6 h-6 rounded-lg bg-[#0A0A0A] border border-[#1F1F1F] text-[#888888] hover:text-white flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-sm text-emerald-400 min-w-[20px] text-center">
                      {teamStats.myTeam[key] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustTeamStat('myTeam', key, 1)}
                      className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-[11px] font-semibold text-[#888888] text-center px-2">{label}</span>

                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustTeamStat('rival', key, -1)}
                      className="w-6 h-6 rounded-lg bg-[#0A0A0A] border border-[#1F1F1F] text-[#888888] hover:text-white flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-sm text-[#EDEDED] min-w-[20px] text-center">
                      {teamStats.rival[key] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustTeamStat('rival', key, 1)}
                      className="w-6 h-6 rounded-lg bg-[#161616] border border-[#333333] text-[#EDEDED] hover:bg-[#222222] flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COL 3 — Timeline */}
        <div className="w-full lg:w-72 xl:w-80 flex flex-col h-72 lg:h-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden shrink-0">
          <div className="p-3 border-b border-[#1F1F1F]">
            <h3 className="font-bold text-white uppercase tracking-wider text-xs">Timeline</h3>
          </div>
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
            {events.length === 0 ? (
              <p className="text-center text-[#888888] text-xs italic mt-8">Esperando eventos...</p>
            ) : (
              events.map(ev => {
                if (ev.type === 'sub') {
                  const pOut = allPlayers.find(x => x.id === ev.playerId);
                  const pIn = allPlayers.find(x => x.id === ev.playerInId);
                  return (
                    <div key={ev.id} className="flex flex-col gap-1 bg-[#111111] p-2.5 rounded-md border border-[#1F1F1F]/50 group relative">
                      <div className="flex items-center gap-2">
                        <span className="text-[#EDEDED] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-white font-medium text-xs">Cambio</span>
                      </div>
                      <div className="text-[#888888] text-[10px] pl-[50px]">
                        Sale: <span className="font-bold text-white/80">({pOut?.number}) {pOut?.name.split(' ')[0]}</span>
                        {' '}→ Entra: <span className="font-bold text-white">({pIn?.number}) {pIn?.name.split(' ')[0]}</span>
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#888888] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                if (ev.type === 'period_end') {
                  return (
                    <div key={ev.id} className="flex items-center gap-2 bg-[#161616] p-2.5 rounded-md border border-[#333333] group relative">
                      <span className="text-[#EDEDED] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-white font-bold text-xs">{ev.periodLabel}</span>
                        {ev.addedMinutes !== undefined && ev.addedMinutes > 0 && (
                          <span className="text-[#EDEDED] text-[10px] font-bold bg-[#161616] px-1.5 py-0.5 rounded-full">
                            +{ev.addedMinutes}'
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#888888] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                if (ev.type === 'note') {
                  return (
                    <div key={ev.id} className="flex flex-col gap-1 bg-[#111111] p-2.5 rounded-md border border-[#1F1F1F]/50 group relative">
                      <div className="flex items-center gap-2">
                        <span className="text-[#EDEDED] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                        <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-purple-400 font-medium text-xs">Nota</span>
                      </div>
                      <div className="text-[#888888] text-[10px] pl-[50px] italic">
                        "{ev.notes}"
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#888888] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                const p = allPlayers.find(x => x.id === ev.playerId);

                if (ev.playerId === 'rival') {
                  return (
                    <div key={ev.id} className="flex items-center gap-2 bg-red-500/10 p-2.5 rounded-md border border-red-500/20 group relative">
                      <span className="text-red-400 font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                      <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                        {ev.type === 'goal' && (
                          <>
                            <Goal className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="text-red-300 font-medium text-xs">Gol de {matchConfig.opponent}</span>
                          </>
                        )}
                        {ev.type === 'shot_on_target' && (
                          <>
                            <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="text-cyan-300 font-medium text-xs">Tiro a puerta ({matchConfig.opponent})</span>
                          </>
                        )}
                        {ev.type === 'shot_off_target' && (
                          <>
                            <CircleOff className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="text-zinc-300 font-medium text-xs">Tiro fuera ({matchConfig.opponent})</span>
                          </>
                        )}
                        {ev.type === 'corner' && (
                          <>
                            <Flag className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                            <span className="text-lime-300 font-medium text-xs">Córner ({matchConfig.opponent})</span>
                          </>
                        )}
                        {ev.type === 'offside' && (
                          <>
                            <AlertOctagon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <span className="text-orange-300 font-medium text-xs">Fuera de juego ({matchConfig.opponent})</span>
                          </>
                        )}
                        {ev.type === 'foul' && (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-amber-300 font-medium text-xs">Falta ({matchConfig.opponent})</span>
                          </>
                        )}
                        {(ev.type === 'yellow' || ev.type === 'yellow_card') && (
                          <>
                            <div className="w-2 h-3 bg-yellow-400 rounded-sm shrink-0" />
                            <span className="text-yellow-300 font-medium text-xs">Amarilla ({matchConfig.opponent})</span>
                          </>
                        )}
                        {(ev.type === 'red' || ev.type === 'red_card') && (
                          <>
                            <div className="w-2 h-3 bg-red-500 rounded-sm shrink-0" />
                            <span className="text-red-300 font-medium text-xs">Roja ({matchConfig.opponent})</span>
                          </>
                        )}
                        {!['goal', 'shot_on_target', 'shot_off_target', 'corner', 'offside', 'foul', 'yellow', 'yellow_card', 'red', 'red_card'].includes(ev.type) && (
                          <span className="text-red-300 font-medium text-xs">{getEventActionTitle(ev.type)} ({matchConfig.opponent})</span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#888888] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={ev.id} className="flex items-center gap-2 bg-[#111111] p-2.5 rounded-md border border-[#1F1F1F]/50 group relative">
                    <span className="text-[#EDEDED] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                    <div className="flex-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                      {ev.type === 'goal' && (
                        <span className="text-white font-medium text-xs flex items-center gap-1">
                          ⚽ <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span>
                        </span>
                      )}
                      {ev.type === 'goal' && ev.assistId && (() => {
                        const assister = allPlayers.find(x => x.id === ev.assistId);
                        return (
                          <span className="text-white/60 font-medium text-[10px] flex items-center gap-1">
                            👟 <span className="text-[#888888]">({assister?.number}) {assister?.name.split(' ')[0]}</span>
                          </span>
                        );
                      })()}
                      {ev.type === 'assist' && <><Handshake className="w-3 h-3 text-white" /><span className="text-white font-medium text-xs">Asist: <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'shot_on_target' && <><Crosshair className="w-3 h-3 text-cyan-400" /><span className="text-cyan-400 font-medium text-xs">Tiro a puerta: <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'shot_off_target' && <><CircleOff className="w-3 h-3 text-zinc-300" /><span className="text-zinc-300 font-medium text-xs">Tiro fuera: <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'corner' && <><Flag className="w-3 h-3 text-lime-400" /><span className="text-lime-400 font-medium text-xs">Córner: <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'offside' && <><AlertOctagon className="w-3 h-3 text-orange-400" /><span className="text-orange-400 font-medium text-xs">Fuera de juego: <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'foul' && <><AlertTriangle className="w-3 h-3 text-amber-400" /><span className="text-amber-400 font-medium text-xs">Falta: <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {(ev.type === 'yellow' || ev.type === 'yellow_card') && <><div className="w-2 h-3 bg-yellow-400 rounded-sm" /><span className="text-white font-medium text-xs">Amarilla: <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {(ev.type === 'red' || ev.type === 'red_card') && <><div className="w-2 h-3 bg-red-500 rounded-sm" /><span className="text-white font-medium text-xs">Roja: <span className="text-[#888888]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                    </div>
                    <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#888888] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      
      {/* Drawer Inferior Selector Goal Flow */}
      {goalFlow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] w-full max-w-2xl mx-auto border-t md:border border-[#1F1F1F] md:rounded-t-3xl md:mb-0 rounded-t-3xl p-6 animate-in slide-in-from-bottom-full duration-200 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Goal className="w-6 h-6 text-emerald-400" />
                  {goalFlow.step === 'scorer' && 'Paso 1: ¿Quién marcó el gol?'}
                  {goalFlow.step === 'question' && 'Paso 2: ¿Hubo asistencia?'}
                  {goalFlow.step === 'assister' && 'Paso 3: ¿Quién dio la asistencia?'}
                </h2>
                <p className="text-[#888888] text-sm mt-1">
                  {goalFlow.step === 'scorer' && 'Selecciona al goleador en el campo.'}
                  {goalFlow.step === 'question' && 'Indica si fue una jugada individual o hubo asistencia.'}
                  {goalFlow.step === 'assister' && 'Selecciona al asistente en el campo.'}
                </p>
              </div>
              <button onClick={cancelEvent} className="w-10 h-10 bg-[#111111] rounded-full flex items-center justify-center text-[#888888] hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto pb-6 custom-scrollbar pr-2 space-y-6">
              {(goalFlow.step === 'scorer' || goalFlow.step === 'assister') && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {onField.filter(p => goalFlow.step === 'assister' ? p.id !== goalFlow.scorerId : true).map(p => (
                    <button 
                      key={p.id}
                      onClick={() => goalFlow.step === 'scorer' ? assignGoalScorer(p.id) : assignGoalAssister(p.id)}
                      className="flex flex-col items-center justify-center p-3 bg-[#111111] border border-[#1F1F1F] rounded-md hover:border-emerald-500 hover:bg-[#1A1A1A] transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xl mb-2 shadow-inner">
                        {p.number}
                      </div>
                      <span className="text-xs font-bold text-white text-center line-clamp-1 w-full">{p.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              )}

              {goalFlow.step === 'question' && (
                <div className="flex gap-4">
                  <button onClick={() => handleGoalQuestion(true)} className="flex-1 flex flex-col items-center justify-center gap-3 py-8 bg-[#111111] border border-[#1F1F1F] rounded-lg transition-all hover:bg-[#1A1A1A]">
                    <Handshake className="w-8 h-8 text-white" />
                    <span className="font-bold text-white text-lg">Sí, hubo asistencia</span>
                  </button>
                  <button onClick={() => handleGoalQuestion(false)} className="flex-1 flex flex-col items-center justify-center gap-3 py-8 bg-[#111111] border border-[#1F1F1F] rounded-lg transition-all hover:bg-[#1A1A1A]">
                    <Goal className="w-8 h-8 text-emerald-400" />
                    <span className="font-bold text-white text-lg">No, jugada individual</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer Inferior Selector de Jugadores */}

      {pendingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] w-full max-w-2xl mx-auto border-t md:border border-[#1F1F1F] md:rounded-t-3xl md:mb-0 rounded-t-3xl p-6 animate-in slide-in-from-bottom-full duration-200 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {pendingEvent === 'goal' && <Goal className="w-6 h-6 text-emerald-400" />}
                  {pendingEvent === 'assist' && <Handshake className="w-6 h-6 text-white" />}
                  {pendingEvent === 'shot_on_target' && <Crosshair className="w-6 h-6 text-cyan-400" />}
                  {pendingEvent === 'shot_off_target' && <CircleOff className="w-6 h-6 text-zinc-300" />}
                  {pendingEvent === 'corner' && <Flag className="w-6 h-6 text-lime-400" />}
                  {pendingEvent === 'offside' && <AlertOctagon className="w-6 h-6 text-orange-400" />}
                  {pendingEvent === 'foul' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                  {(pendingEvent === 'yellow' || pendingEvent === 'yellow_card') && <div className="w-4 h-5 bg-yellow-400 rounded-sm" />}
                  {(pendingEvent === 'red' || pendingEvent === 'red_card') && <div className="w-4 h-5 bg-red-500 rounded-sm" />}
                  {pendingEvent === 'sub' && <ArrowRightLeft className="w-6 h-6 text-blue-400" />}
                  
                  {pendingEvent === 'sub' 
                    ? (subStep === 'out' ? 'Paso 1: Selecciona jugador que SALE' : 'Paso 2: Selecciona jugador que ENTRA')
                    : pendingEvent === 'shot_on_target' ? 'Registrar Tiro a Puerta (+1 Equipo)'
                    : pendingEvent === 'shot_off_target' ? 'Registrar Tiro Fuera (+1 Equipo)'
                    : pendingEvent === 'corner' ? 'Registrar Córner a Favor (+1 Equipo)'
                    : pendingEvent === 'offside' ? 'Registrar Fuera de Juego (+1 Equipo)'
                    : pendingEvent === 'foul' ? 'Registrar Falta (+1 Equipo)'
                    : (pendingEvent === 'yellow' || pendingEvent === 'yellow_card') ? 'Registrar Tarjeta Amarilla (+1 Equipo)'
                    : (pendingEvent === 'red' || pendingEvent === 'red_card') ? 'Registrar Tarjeta Roja (+1 Equipo)'
                    : 'Asignar a Jugador'}
                </h2>
                <p className="text-[#888888] text-sm mt-1">
                  {pendingEvent === 'sub' 
                    ? (subStep === 'out' ? 'Mostrando jugadores en el campo.' : 'Mostrando jugadores en el banquillo.') 
                    : 'Toca a un jugador para registrar la acción.'}
                </p>
              </div>
              <button onClick={cancelEvent} className="w-10 h-10 bg-[#111111] rounded-full flex items-center justify-center text-[#888888] hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto pb-6 custom-scrollbar pr-2 space-y-6">
              {pendingEvent !== 'sub' ? (
                <>
                  <div>
                    <h3 className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3">En el campo</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {onField.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => assignEventToPlayer(p.id)}
                          className="flex flex-col items-center justify-center p-2 bg-[#111111] border border-[#1F1F1F] rounded-md hover:border-[#EDEDED] hover:bg-[#161616] transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-lg mb-1 shadow-inner">
                            {p.number}
                          </div>
                          <span className="text-[10px] font-bold text-white text-center line-clamp-1 w-full">{p.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3">Banquillo</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 opacity-60 hover:opacity-100 transition-opacity">
                      {availableBench.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => assignEventToPlayer(p.id)}
                          className="flex flex-col items-center justify-center p-2 bg-[#0A0A0A] border border-[#1F1F1F] rounded-md hover:border-[#6E6E75] transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#111111] text-[#888888] flex items-center justify-center font-bold text-lg mb-1 shadow-inner">
                            {p.number}
                          </div>
                          <span className="text-[10px] font-medium text-[#888888] text-center line-clamp-1 w-full">{p.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {((subStep === 'in') ? availableBench : onField).map(p => (
                    <button 
                      key={p.id}
                      onClick={() => assignEventToPlayer(p.id)}
                      className="flex flex-col items-center justify-center p-3 bg-[#111111] border border-[#1F1F1F] rounded-md hover:border-[#3A3A3A] hover:bg-[#1A1A1A] transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xl mb-2 shadow-inner">
                        {p.number}
                      </div>
                      <span className="text-xs font-bold text-white text-center line-clamp-1 w-full">{p.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      
      {/* Modal / Selector de Equipo para Acciones (Mi Equipo vs Rival) */}
      {teamSelectEvent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1F1F1F] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#111111] border border-[#1F1F1F] flex items-center justify-center">
                  {teamSelectEvent === 'shot_on_target' && <Crosshair className="w-5 h-5 text-cyan-400" />}
                  {teamSelectEvent === 'shot_off_target' && <CircleOff className="w-5 h-5 text-zinc-300" />}
                  {teamSelectEvent === 'corner' && <Flag className="w-5 h-5 text-lime-400" />}
                  {teamSelectEvent === 'offside' && <AlertOctagon className="w-5 h-5 text-orange-400" />}
                  {teamSelectEvent === 'foul' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {(teamSelectEvent === 'yellow' || teamSelectEvent === 'yellow_card') && <div className="w-3.5 h-4.5 bg-yellow-400 rounded-sm" />}
                  {(teamSelectEvent === 'red' || teamSelectEvent === 'red_card') && <div className="w-3.5 h-4.5 bg-red-500 rounded-sm" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {getEventActionTitle(teamSelectEvent)}
                  </h3>
                  <p className="text-xs text-[#888888]">¿De qué equipo ha sido la acción?</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={cancelEvent} 
                className="w-8 h-8 rounded-full bg-[#111111] border border-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Opciones de Selección */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Opción 1: Mi Equipo */}
              <button
                type="button"
                onClick={() => handleSelectTeamForAction('myTeam')}
                className="p-5 rounded-lg border border-[#1F1F1F] bg-[#111111] hover:bg-[#161616] hover:border-emerald-500/60 flex flex-col items-center justify-center text-center gap-2.5 group transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Mi Equipo</div>
                  <div className="font-bold text-white text-sm line-clamp-1">{matchConfig?.myTeamName || 'Mi Equipo'}</div>
                </div>
                <span className="text-[11px] text-[#888888] group-hover:text-emerald-400/90 transition-colors">
                  Preguntar por jugador (+1)
                </span>
              </button>

              {/* Opción 2: Rival */}
              <button
                type="button"
                onClick={() => handleSelectTeamForAction('rival')}
                className="p-5 rounded-lg border border-[#1F1F1F] bg-[#111111] hover:bg-[#161616] hover:border-red-500/60 flex flex-col items-center justify-center text-center gap-2.5 group transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                  <Swords className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Equipo Rival</div>
                  <div className="font-bold text-white text-sm line-clamp-1">{matchConfig?.opponent || 'Rival'}</div>
                </div>
                <span className="text-[11px] text-[#888888] group-hover:text-red-400/90 transition-colors">
                  Sumar a estadística global (+1)
                </span>
              </button>
            </div>

            {/* Pie de modal */}
            <div className="mt-4 pt-3 border-t border-[#1F1F1F] flex justify-end">
              <button
                type="button"
                onClick={cancelEvent}
                className="h-8 px-4 rounded-md text-xs font-medium bg-[#111111] border border-[#1F1F1F] text-[#888888] hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Match Confirmation Modal */}
      {isEndMatchModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-6 md:p-8 max-w-md w-full animate-in zoom-in-95">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Fin del Partido</h2>
            
            <div className="bg-[#111111] border border-[#1F1F1F] rounded-md p-6 mb-6 text-center shadow-inner">
              <div className="text-[#888888] text-sm font-bold uppercase tracking-wider mb-3">Resultado final</div>
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-1 truncate max-w-[80px]">
                    {matchConfig?.condition === 'Local' ? matchConfig?.myTeamName : matchConfig?.opponent}
                  </span>
                  <span className="text-4xl font-semibold text-white">{score.home}</span>
                </div>
                <div className="text-[#2A2A2E] text-2xl font-bold px-2">-</div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-1 truncate max-w-[80px]">
                    {matchConfig?.condition === 'Local' ? matchConfig?.opponent : matchConfig?.myTeamName}
                  </span>
                  <span className="text-4xl font-semibold text-white">{score.away}</span>
                </div>
              </div>
            </div>

            <p className="text-[#888888] text-sm text-center mb-8">
              ¿Guardar en el Historial? El resultado se sincronizará automáticamente con el planificador de temporada.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsEndMatchModalOpen(false)}
                className="flex-1 px-4 py-3 bg-[#111111] text-white font-bold rounded-md hover:bg-[#1A1A1A] transition-colors border border-[#1F1F1F]"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmEndMatch}
                 disabled={isSaving}
                 className="flex-1 px-4 py-3 bg-[#EDEDED] text-[#0A0A0A] font-bold rounded-md hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
               >
                 {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}









export function LiveMatch(props: LiveMatchProps) {
  const { activeTeam } = useTeam();
  const [session, setSession] = useState<any>(undefined);
  useEffect(() => {
    db.getAppState(matchSessionKey(activeTeam?.id)).then(data => {
      setSession(data || null);
    }).catch(e => {
      console.error(e);
      setSession(null);
    });
  }, [activeTeam?.id]);
  
  if (session === undefined) return <div className="p-10 text-center text-white">Cargando sesión de partido...</div>;
  return <LiveMatchInner {...props} initialSession={session} />;
}
