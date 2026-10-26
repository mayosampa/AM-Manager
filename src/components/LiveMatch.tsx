import { useState, useEffect, useRef } from 'react';
import { Player, MatchEvent, EventType, MatchTeamStats, TeamSideStats } from '../types';
import { useTeam } from '../context/TeamContext';
import { Play, Pause, Goal, Handshake, ArrowRightLeft, Square, Trash2, Edit3, BarChart2, Plus, Minus, Crosshair, CircleOff, Flag, AlertTriangle, AlertOctagon, Shield, Swords, X, ChevronLeft, Users, Clock, Loader2, Settings2, CheckCircle2 } from 'lucide-react';
import { db, matchSessionKey } from '../services/db';
import { RivalSelector } from '../features/rivals/components/RivalSelector';
import { MetricsConfigModal } from '../shared/ui/MetricsConfigModal';

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
  const { activeTeam, statMetrics } = useTeam();
  
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
  const savingLockRef = useRef(false);
  const [saveToast, setSaveToast] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [ownGoalModal, setOwnGoalModal] = useState<'choose' | 'contra_player' | null>(null);
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
    } else if (action === 'corner' || action === 'offside') {
      // Eventos colectivos directos sin pedir jugador individual
      if (statKey) {
        adjustTeamStat('myTeam', statKey, 1);
      }
      const newEvent: MatchEvent = {
        id: Math.random().toString(36).substring(2, 9),
        type: action,
        playerId: 'team',
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
    setOwnGoalModal(null);
  };

  const assignGoalScorer = (playerId: string) => {
    if (statMetrics.assists === false) {
      finalizeGoal(playerId);
      return;
    }
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

  const handleOwnGoalFavor = () => {
    const isLocal = matchConfig?.condition === 'Local';
    if (isLocal) {
      setScore(prev => ({ ...prev, home: prev.home + 1 }));
    } else {
      setScore(prev => ({ ...prev, away: prev.away + 1 }));
    }
    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'own_goal',
      isOwnGoal: true,
      ownGoalSide: 'favor',
      playerId: 'rival',
      time: displayTime,
      notes: 'Gol en Propia (Rival)',
    };
    setEvents(prev => [newEvent, ...prev]);
    setGoalFlow(null);
    setOwnGoalModal(null);
  };

  const handleOwnGoalContra = (ourPlayerId?: string) => {
    const isLocal = matchConfig?.condition === 'Local';
    if (isLocal) {
      setScore(prev => ({ ...prev, away: prev.away + 1 }));
    } else {
      setScore(prev => ({ ...prev, home: prev.home + 1 }));
    }
    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'own_goal',
      isOwnGoal: true,
      ownGoalSide: 'contra',
      playerId: ourPlayerId || 'team',
      time: displayTime,
      notes: 'Gol en Propia (P.P.)',
    };
    setEvents(prev => [newEvent, ...prev]);
    setOwnGoalModal(null);
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
    } else if (eventToDel.type === 'own_goal' || eventToDel.isOwnGoal) {
      const isLocal = matchConfig?.condition === 'Local';
      if (eventToDel.ownGoalSide === 'favor') {
        setScore(s => ({ ...s, [isLocal ? 'home' : 'away']: Math.max(0, s[isLocal ? 'home' : 'away'] - 1) }));
      } else {
        setScore(s => ({ ...s, [isLocal ? 'away' : 'home']: Math.max(0, s[isLocal ? 'away' : 'home'] - 1) }));
      }
    } else if (eventToDel.type === 'goal') {
      const isLocal = matchConfig?.condition === 'Local';
      if (eventToDel.playerId === 'rival') {
        setScore(s => ({ ...s, [isLocal ? 'away' : 'home']: Math.max(0, s[isLocal ? 'away' : 'home'] - 1) }));
      } else {
        setScore(s => ({ ...s, [isLocal ? 'home' : 'away']: Math.max(0, s[isLocal ? 'home' : 'away'] - 1) }));
      }
    }

    if (eventToDel.playerId && eventToDel.playerId !== 'system') {
      const statKey = getTeamStatKeyForEvent(eventToDel.type);
      if (statKey) {
        adjustTeamStat(eventToDel.playerId === 'rival' ? 'rival' : 'myTeam', statKey, -1);
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
    if (savingLockRef.current || isSaving) return;
    savingLockRef.current = true;
    setIsSaving(true);

    try {
      setIsRunning(false);
      
      const isLocal = matchConfig.condition === 'Local';
      const myScore = isLocal ? score.home : score.away;
      const rivalScore = isLocal ? score.away : score.home;

      const matchResult = myScore > rivalScore ? 'Victoria' : (myScore < rivalScore ? 'Derrota' : 'Empate');

      const matchData = {
        id: Math.random().toString(36).substring(2, 9),
        teamId: activeTeam?.id || 'default',
        date: matchSyncDate,
        score,
        events,
        duration: displayTime,
        squad: initialStarters.length > 0 ? initialStarters : onField,
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

        for (const k of candidateKeys) {
          if (k !== targetKey && seasonPlan[k] && (seasonPlan[k].isMatchDay === true || seasonPlan[k].type === 'match')) {
            delete seasonPlan[k];
          }
        }

        await db.saveSeasonPlan(seasonPlan, activeTeam?.id);
      }
      db.deleteAppState(matchSessionKey(activeTeam?.id)).catch(console.error);

      setSaveToast(true);
      setTimeout(() => {
        setIsEndMatchModalOpen(false);
        onNavigate('history');
      }, 900);
    } catch (err) {
      console.error('Error guardando partido:', err);
      savingLockRef.current = false;
      setIsSaving(false);
    }
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
      {/* ── COMPACT HEADER & SCOREBOARD ── */}
      <div className="sticky top-0 z-20 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#1F1F1F] px-4 py-2.5 sm:py-3 flex flex-col items-center shrink-0">
        <div className="text-[#888888] font-medium text-[11px] sm:text-xs mb-1.5 text-center">
          AM Manager <span className="mx-2">|</span> 🏆 {matchConfig.type}
        </div>
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-2">
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-[#888888] uppercase tracking-wider mb-0.5 truncate max-w-[120px]">
              {matchConfig.condition === 'Local' ? matchConfig.myTeamName : matchConfig.opponent}
            </span>
            <span className="text-3xl sm:text-4xl font-bold font-mono text-white">
              {score.home}
            </span>
          </div>
          <div className="text-[#2A2A2E] text-2xl font-bold px-3">-</div>
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-[#888888] uppercase tracking-wider mb-0.5 truncate max-w-[120px]">
              {matchConfig.condition === 'Local' ? matchConfig.opponent : matchConfig.myTeamName}
            </span>
            <span className="text-3xl sm:text-4xl font-bold font-mono text-white">
              {score.away}
            </span>
          </div>
        </div>

        {/* Compact Period, Clock and Transition button in 1 line */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full max-w-lg mx-auto">
          {/* Period label */}
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#EDEDED] bg-[#141416] px-2.5 py-1 rounded-md border border-[#26262A] shrink-0">
            {period === '1st_half' && '1ª Parte'}
            {period === 'halftime' && 'Descanso'}
            {period === '2nd_half' && '2ª Parte'}
            {period === 'finished' && 'Finalizado'}
          </span>

          {/* Clock & Timer toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-xl sm:text-2xl font-mono font-bold text-[#EDEDED] bg-[#111111] px-3.5 py-0.5 sm:py-1 rounded-md border border-[#2E2E33]">
              {formatTime(displayTime)}
            </div>
            <button
              onClick={toggleTimer}
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                isRunning ? 'bg-[#1A1A1A] text-white hover:bg-[#262626] border border-[#333]' : 'bg-[#EDEDED] text-[#0A0A0A] hover:bg-white shadow-sm'
              }`}
              title={isRunning ? 'Pausar cronómetro' : 'Iniciar cronómetro'}
            >
              {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Period-transition button */}
          {period === '1st_half' && (
            <button
              onClick={handlePeriodTransition}
              className="h-8 sm:h-9 px-3.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm shrink-0"
            >
              ⏸ Pitar Descanso
            </button>
          )}
          {period === 'halftime' && (
            <button
              onClick={handlePeriodTransition}
              className="h-8 sm:h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm shrink-0"
            >
              ▶ Iniciar 2ª Parte
            </button>
          )}
          {period === '2nd_half' && (
            <button
              onClick={handlePeriodTransition}
              className="h-8 sm:h-9 px-3.5 bg-[#26262B] hover:bg-[#323238] border border-[#3A3A42] text-white text-xs sm:text-sm font-bold rounded-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm shrink-0"
            >
              ■ Finalizar Partido
            </button>
          )}
        </div>
      </div>

      {/* ── 3-COLUMN MAIN LAYOUT (GRID PROPORCIONADO) ── */}
      <div className="flex-1 overflow-y-auto w-full p-2.5 sm:p-4 lg:p-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4.5 items-start">

          {/* ── COL 1 — ACCIONES PRINCIPALES (GRID TÁCTIL GRANDE) ── */}
          <div className="col-span-12 lg:col-span-6 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Acciones de Partido
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMetricsModalOpen(true)}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30 cursor-pointer transition-colors"
                  title="Configurar qué estadísticas se muestran"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>⚙️ Configurar Métricas</span>
                </button>
                {(pendingEvent || goalFlow || teamSelectEvent) && (
                  <button
                    onClick={cancelEvent}
                    className="text-[11px] font-medium text-[#A1A1AA] hover:text-white flex items-center gap-1 bg-[#1A1A1E] px-2.5 py-1 rounded-md border border-[#2D2D35] cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Action Guidance Banner */}
            {(pendingEvent || goalFlow || teamSelectEvent) && (
              <div className="mb-2.5 p-3 bg-[#141418] border-2 border-emerald-500/60 rounded-xl shadow-lg animate-in fade-in duration-150 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <p className="text-white text-xs sm:text-sm font-bold truncate">
                    {teamSelectEvent && `¿De qué equipo es: ${getEventActionTitle(teamSelectEvent)}?`}
                    {goalFlow?.step === 'scorer' && '⚽ Selecciona el GOLEADOR en el campo'}
                    {goalFlow?.step === 'question' && '¿Hubo asistencia de gol?'}
                    {goalFlow?.step === 'assister' && '👟 Selecciona el ASISTENTE'}
                    {pendingEvent === 'assist' && '👟 Selecciona el ASISTENTE'}
                    {pendingEvent === 'shot_on_target' && '🎯 Tiro a Puerta — Selecciona jugador'}
                    {pendingEvent === 'shot_off_target' && '💨 Tiro Fuera — Selecciona jugador'}
                    {pendingEvent === 'foul' && '⚠️ Falta — Selecciona jugador'}
                    {(pendingEvent === 'yellow' || pendingEvent === 'yellow_card') && '🟨 Selecciona el jugador'}
                    {(pendingEvent === 'red' || pendingEvent === 'red_card') && '🟥 Selecciona el jugador'}
                    {pendingEvent === 'sub' && subStep === 'out' && '↑ ¿Quién SALE del campo?'}
                    {pendingEvent === 'sub' && subStep === 'in' && '↓ ¿Quién ENTRA del banquillo?'}
                  </p>
                </div>
                <button
                  onClick={cancelEvent}
                  className="text-xs text-[#888888] hover:text-white px-2 py-1 rounded bg-[#222228] shrink-0 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Goal Question (Individual vs Assisted) */}
            {goalFlow?.step === 'question' && (
              <div className="mb-3 flex gap-2.5">
                <button
                  onClick={() => handleGoalQuestion(false)}
                  className="flex-1 py-3 bg-[#18181D] border border-[#2B2B33] text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-[#222228] active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  Sin asistencia (Individual)
                </button>
                <button
                  onClick={() => handleGoalQuestion(true)}
                  className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm font-bold rounded-xl hover:bg-emerald-500/30 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  Con asistencia 👟
                </button>
              </div>
            )}

            {/* Fila Superior: Botones Grandes de Gol + Gol en Propia (P.P.) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2.5 sm:mb-3">
              {/* Gol a Favor */}
              <button
                onClick={() => handleEventSelect('goal')}
                className={`min-h-[72px] sm:min-h-[80px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                  goalFlow
                    ? 'bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20'
                    : 'bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-500/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/25 flex items-center justify-center text-emerald-300">
                    <Goal className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/35">
                    {matchConfig.condition === 'Local' ? score.home : score.away}
                  </span>
                </div>
                <div className="text-left mt-1.5">
                  <span className="font-black text-xs sm:text-sm text-emerald-300 tracking-tight block">
                    Gol a Favor
                  </span>
                </div>
              </button>

              {/* Gol Rival */}
              <button
                onClick={handleRivalGoal}
                className="min-h-[72px] sm:min-h-[80px] p-3 sm:p-3.5 rounded-xl border border-red-500/40 bg-red-500/15 hover:bg-red-500/25 hover:border-red-500/60 transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 shadow-sm"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/25 flex items-center justify-center text-red-300">
                    <Goal className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-black px-2 py-0.5 rounded-full bg-red-500/25 text-red-300 border border-red-500/35">
                    {matchConfig.condition === 'Local' ? score.away : score.home}
                  </span>
                </div>
                <div className="text-left mt-1.5">
                  <span className="font-black text-xs sm:text-sm text-red-300 tracking-tight block">
                    Gol Rival
                  </span>
                </div>
              </button>

              {/* Gol en Propia Puerta (P.P.) */}
              <button
                onClick={() => setOwnGoalModal('choose')}
                className="min-h-[72px] sm:min-h-[80px] p-3 sm:p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 hover:border-amber-500/60 transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 shadow-sm"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/25 flex items-center justify-center text-amber-300">
                    <Goal className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="font-mono text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/35">
                    P.P.
                  </span>
                </div>
                <div className="text-left mt-1.5">
                  <span className="font-black text-xs sm:text-sm text-amber-300 tracking-tight block">
                    ⚽ Gol (P.P.)
                  </span>
                </div>
              </button>
            </div>

            {/* Grid de Acciones Grandes (2 o 3 columnas táctiles) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Asistencia */}
              {statMetrics.assists !== false && (
                <button
                  onClick={() => handleEventSelect('assist')}
                  className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                    pendingEvent === 'assist'
                      ? 'bg-white/25 border-white ring-2 ring-white/40 shadow-md'
                      : 'bg-[#121215] border-[#222228] hover:bg-[#1A1A20] hover:border-[#33333E]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Handshake className="w-5 h-5 text-white shrink-0" />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#1A1A1E] text-[#D4D4D8] border border-[#2D2D35]">
                      {events.filter(e => e.type === 'assist').length}
                    </span>
                  </div>
                  <span className="font-bold text-white text-xs sm:text-sm tracking-tight text-left">
                    Asistencia
                  </span>
                </button>
              )}

              {/* Tiro a Puerta */}
              {statMetrics.shotsOnTarget !== false && (
                <button
                  onClick={() => handleEventSelect('shot_on_target')}
                  className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                    pendingEvent === 'shot_on_target' || teamSelectEvent === 'shot_on_target'
                      ? 'bg-cyan-500/30 border-cyan-400 ring-2 ring-cyan-400/40 shadow-md'
                      : 'bg-[#121215] border-[#222228] hover:bg-[#1A1A20] hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Crosshair className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                      {teamStats.myTeam.shotsOnTarget ?? 0}
                    </span>
                  </div>
                  <span className="font-bold text-cyan-400 text-xs sm:text-sm tracking-tight text-left">
                    Tiro a Puerta
                  </span>
                </button>
              )}

              {/* Tiro Fuera */}
              {statMetrics.shotsOffTarget !== false && (
                <button
                  onClick={() => handleEventSelect('shot_off_target')}
                  className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                    pendingEvent === 'shot_off_target' || teamSelectEvent === 'shot_off_target'
                      ? 'bg-zinc-500/30 border-zinc-400 ring-2 ring-zinc-400/40 shadow-md'
                      : 'bg-[#121215] border-[#222228] hover:bg-[#1A1A20] hover:border-zinc-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <CircleOff className="w-5 h-5 text-zinc-300 shrink-0" />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-300 border border-zinc-500/25">
                      {teamStats.myTeam.shotsOffTarget ?? 0}
                    </span>
                  </div>
                  <span className="font-bold text-zinc-300 text-xs sm:text-sm tracking-tight text-left">
                    Tiro Fuera
                  </span>
                </button>
              )}

              {/* Córner */}
              {statMetrics.corners !== false && (
                <button
                  onClick={() => handleEventSelect('corner')}
                  className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                    pendingEvent === 'corner' || teamSelectEvent === 'corner'
                      ? 'bg-lime-500/30 border-lime-400 ring-2 ring-lime-400/40 shadow-md'
                      : 'bg-[#121215] border-[#222228] hover:bg-[#1A1A20] hover:border-lime-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Flag className="w-5 h-5 text-lime-400 shrink-0" />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-300 border border-lime-500/25">
                      {teamStats.myTeam.corners ?? 0}
                    </span>
                  </div>
                  <span className="font-bold text-lime-400 text-xs sm:text-sm tracking-tight text-left">
                    Córner
                  </span>
                </button>
              )}

              {/* Falta */}
              {statMetrics.fouls !== false && (
                <button
                  onClick={() => handleEventSelect('foul')}
                  className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                    pendingEvent === 'foul' || teamSelectEvent === 'foul'
                      ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                      : 'bg-[#121215] border-[#222228] hover:bg-[#1A1A20] hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      {teamStats.myTeam.fouls ?? 0}
                    </span>
                  </div>
                  <span className="font-bold text-amber-400 text-xs sm:text-sm tracking-tight text-left">
                    Falta
                  </span>
                </button>
              )}

              {/* Fuera de Juego */}
              {statMetrics.offsides !== false && (
                <button
                  onClick={() => handleEventSelect('offside')}
                  className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                    pendingEvent === 'offside' || teamSelectEvent === 'offside'
                      ? 'bg-orange-500/30 border-orange-400 ring-2 ring-orange-400/40 shadow-md'
                      : 'bg-[#121215] border-[#222228] hover:bg-[#1A1A20] hover:border-orange-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <AlertOctagon className="w-5 h-5 text-orange-400 shrink-0" />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/25">
                      {teamStats.myTeam.offsides ?? 0}
                    </span>
                  </div>
                  <span className="font-bold text-orange-400 text-xs sm:text-sm tracking-tight text-left">
                    Fuera de Juego
                  </span>
                </button>
              )}

              {/* Tarjeta Amarilla */}
              {statMetrics.cards !== false && (
                <button
                  onClick={() => handleEventSelect('yellow_card')}
                  className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                    pendingEvent === 'yellow' || pendingEvent === 'yellow_card' || teamSelectEvent === 'yellow_card' || teamSelectEvent === 'yellow'
                      ? 'bg-yellow-500/35 border-yellow-400 ring-2 ring-yellow-400/40 shadow-md'
                      : 'bg-yellow-500/10 border-yellow-500/25 hover:bg-yellow-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-3.5 h-4.5 bg-yellow-400 rounded-sm shadow-sm" />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      {teamStats.myTeam.yellowCards ?? 0}
                    </span>
                  </div>
                  <span className="font-bold text-yellow-400 text-xs sm:text-sm tracking-tight text-left">
                    Amarilla
                  </span>
                </button>
              )}

              {/* Tarjeta Roja */}
              {statMetrics.cards !== false && (
                <button
                  onClick={() => handleEventSelect('red_card')}
                  className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                    pendingEvent === 'red' || pendingEvent === 'red_card' || teamSelectEvent === 'red_card' || teamSelectEvent === 'red'
                      ? 'bg-red-500/35 border-red-500 ring-2 ring-red-500/40 shadow-md'
                      : 'bg-red-500/10 border-red-500/25 hover:bg-red-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-3.5 h-4.5 bg-red-500 rounded-sm shadow-sm" />
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      {teamStats.myTeam.redCards ?? 0}
                    </span>
                  </div>
                  <span className="font-bold text-red-400 text-xs sm:text-sm tracking-tight text-left">
                    Roja
                  </span>
                </button>
              )}

              {/* Cambio */}
              <button
                onClick={() => handleEventSelect('sub')}
                className={`min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 ${
                  pendingEvent === 'sub'
                    ? 'bg-blue-500/35 border-blue-400 ring-2 ring-blue-400/40 shadow-md'
                    : 'bg-[#121215] border-[#222228] hover:bg-[#1A1A20] hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <ArrowRightLeft className="w-5 h-5 text-blue-400 shrink-0" />
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                    {events.filter(e => e.type === 'sub').length}
                  </span>
                </div>
                <span className="font-bold text-blue-400 text-xs sm:text-sm tracking-tight text-left">
                  Cambio
                </span>
              </button>

              {/* Nota Rápida */}
              <button
                onClick={handleAddNote}
                className="min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-xl bg-[#121215] border border-[#222228] hover:bg-[#1A1A20] hover:border-purple-500/30 transition-all flex flex-col justify-between select-none cursor-pointer active:scale-95 col-span-2 sm:col-span-3 lg:col-span-3"
              >
                <div className="flex items-center justify-between w-full">
                  <Edit3 className="w-5 h-5 text-purple-400 shrink-0" />
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
                    {events.filter(e => e.type === 'note').length}
                  </span>
                </div>
                <span className="font-bold text-purple-400 text-xs sm:text-sm tracking-tight text-left">
                  Nota Rápida
                </span>
              </button>
            </div>
          </div>

        {/* COL 2 — En el Campo (Squad Panel) & Estadísticas */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3.5 min-w-0">
          {/* Tarjeta En el Campo */}
          <div className="bg-[#0A0A0C] border border-[#1F1F24] rounded-xl p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                En el Campo
              </h2>
              <span className="text-[11px] font-mono font-bold text-zinc-400 bg-[#16161A] px-2 py-0.5 rounded-full border border-zinc-800">
                {onField.length} jug.
              </span>
            </div>

            {/* Grid de Jugadores Compacto (Tipo Chip/Píldora) */}
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 gap-1.5">
              {onField.map(p => {
                const isActionable = !!(pendingEvent || goalFlow?.step === 'scorer' || goalFlow?.step === 'assister');
                const isSubOut = pendingEvent === 'sub' && subStep === 'out';
                const isSubIn = pendingEvent === 'sub' && subStep === 'in';
                const goals = events.filter(e => e.type === 'goal' && e.playerId === p.id).length;
                const yellows = events.filter(e => (e.type === 'yellow' || e.type === 'yellow_card') && e.playerId === p.id).length;
                const reds = events.filter(e => (e.type === 'red' || e.type === 'red_card') && e.playerId === p.id).length;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (!isActionable && !isSubOut) return;
                      assignEventToPlayer(p.id);
                    }}
                    disabled={isSubIn}
                    className={`relative flex items-center gap-1.5 py-1.5 px-2 rounded-lg border transition-all text-left select-none ${
                      isActionable || isSubOut
                        ? 'border-emerald-500/70 bg-emerald-500/15 hover:bg-emerald-500/25 ring-2 ring-emerald-500/50 shadow-sm active:scale-95 animate-pulse cursor-pointer'
                        : 'border-[#222228] bg-[#121215] hover:border-zinc-700 cursor-pointer'
                    } ${isSubIn ? 'opacity-35 cursor-not-allowed' : ''}`}
                    title={`${p.number} - ${p.name}`}
                  >
                    {/* Dorsal badge */}
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black font-mono shrink-0 shadow-inner ${
                      isActionable || isSubOut ? 'bg-emerald-400 text-black' : 'bg-[#1F1F24] text-zinc-200'
                    }`}>
                      {p.number}
                    </span>

                    {/* Nombre corto */}
                    <span className="text-[11px] font-bold text-zinc-200 truncate flex-1 leading-tight">
                      {p.name.split(' ')[0]}
                    </span>

                    {/* Mini badges: Goles / Tarjetas */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {goals > 0 && (
                        <span className="text-[9px] font-mono font-black text-emerald-400 leading-none">
                          ⚽{goals > 1 ? goals : ''}
                        </span>
                      )}
                      {yellows > 0 && (
                        <div className="w-1.5 h-2.5 bg-yellow-400 rounded-[1px] shadow-sm" title="Tarjeta amarilla" />
                      )}
                      {reds > 0 && (
                        <div className="w-1.5 h-2.5 bg-red-500 rounded-[1px] shadow-sm" title="Tarjeta roja" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banquillo — ¿Quién entra? (Cuando subStep === 'in') */}
          {pendingEvent === 'sub' && subStep === 'in' && (
            <div className="bg-[#0A0A0C] border-2 border-blue-500/50 rounded-xl p-3 shadow-lg animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Banquillo (¿Quién entra?)
                </h3>
                <span className="text-[11px] font-mono font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {availableBench.length}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 gap-1.5">
                {availableBench.map(p => (
                  <button
                    key={p.id}
                    onClick={() => assignEventToPlayer(p.id)}
                    className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg border border-blue-500/50 bg-blue-500/15 hover:bg-blue-500/30 transition-all text-left cursor-pointer active:scale-95 shadow-sm"
                  >
                    <span className="w-5 h-5 rounded-md bg-blue-500 text-white flex items-center justify-center font-black font-mono text-xs shrink-0">
                      {p.number}
                    </span>
                    <span className="text-[11px] font-bold text-white truncate leading-tight flex-1">
                      {p.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
                {availableBench.length === 0 && (
                  <p className="col-span-full text-center text-zinc-500 text-xs italic py-2">Sin suplentes disponibles</p>
                )}
              </div>
            </div>
          )}

          {/* Estadísticas de Equipo en Directo (Ajustadas y Compactas) */}
          <div className="bg-[#0A0A0C] border border-[#1F1F24] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#1F1F24]">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                Estadísticas
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="text-emerald-400 truncate max-w-[70px]">{matchConfig.myTeamName}</span>
                <span className="text-zinc-600">vs</span>
                <span className="text-zinc-300 truncate max-w-[70px]">{matchConfig.opponent}</span>
              </div>
            </div>

            {/* Posesión bar & slider */}
            <div className="mb-2.5 bg-[#121215] border border-[#1F1F24] rounded-lg p-2">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updatePossession((teamStats.myTeam.possession ?? 50) - 5)}
                    className="w-5 h-5 rounded bg-[#1A1A1E] border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-90"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">{teamStats.myTeam.possession ?? 50}%</span>
                  <button
                    type="button"
                    onClick={() => updatePossession((teamStats.myTeam.possession ?? 50) + 5)}
                    className="w-5 h-5 rounded bg-[#1A1A1E] border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-90"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Posesión</span>
                <span className="text-zinc-300 font-mono text-[11px] font-bold">{teamStats.rival.possession ?? 50}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={teamStats.myTeam.possession ?? 50}
                onChange={(e) => updatePossession(Number(e.target.value))}
                className="w-full h-1 bg-[#1F1F24] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Quick counters */}
            <div className="space-y-1">
              {([
                ...(statMetrics.shotsOnTarget !== false ? [{ key: 'shotsOnTarget', label: 'Tiros puerta' }] : []),
                ...(statMetrics.shotsOffTarget !== false ? [{ key: 'shotsOffTarget', label: 'Tiros fuera' }] : []),
                ...(statMetrics.corners !== false ? [{ key: 'corners', label: 'Córners' }] : []),
                ...(statMetrics.fouls !== false ? [{ key: 'fouls', label: 'Faltas' }] : []),
                ...(statMetrics.offsides !== false ? [{ key: 'offsides', label: 'Fueras j.' }] : []),
                ...(statMetrics.cards !== false
                  ? [
                      { key: 'yellowCards', label: 'Amarillas' },
                      { key: 'redCards', label: 'Rojas' },
                    ]
                  : []),
              ] as { key: keyof Omit<TeamSideStats, 'possession'>; label: string }[]).map(({ key, label }) => (
                <div key={key} className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 bg-[#121215] border border-[#1F1F24]/80 rounded-md px-2 py-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustTeamStat('myTeam', key, -1)}
                      className="w-5 h-5 rounded bg-[#18181C] border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-90"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="font-mono font-bold text-xs text-emerald-400 min-w-[16px] text-center">
                      {teamStats.myTeam[key] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustTeamStat('myTeam', key, 1)}
                      className="w-5 h-5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center cursor-pointer active:scale-90"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <span className="text-[10px] font-semibold text-zinc-400 text-center truncate">{label}</span>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => adjustTeamStat('rival', key, -1)}
                      className="w-5 h-5 rounded bg-[#18181C] border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-90"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="font-mono font-bold text-xs text-zinc-300 min-w-[16px] text-center">
                      {teamStats.rival[key] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustTeamStat('rival', key, 1)}
                      className="w-5 h-5 rounded bg-[#18181C] border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer active:scale-90"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COL 3 — Timeline */}
        <div className="col-span-12 lg:col-span-3 flex flex-col h-80 lg:h-[calc(100vh-190px)] min-h-[320px] bg-[#0A0A0C] border border-[#1F1F24] rounded-xl overflow-hidden shrink-0">
          <div className="p-3 border-b border-[#1F1F24] flex items-center justify-between">
            <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Timeline
            </h3>
            <span className="text-[11px] font-mono text-zinc-400 bg-[#16161A] px-2 py-0.5 rounded-full border border-zinc-800">
              {events.length} ev.
            </span>
          </div>
          <div className="p-2.5 flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar">
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

                if (ev.type === 'own_goal' || ev.isOwnGoal) {
                  const isFavor = ev.ownGoalSide === 'favor';
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-2 p-2.5 rounded-md border group relative ${
                        isFavor
                          ? 'bg-emerald-500/10 border-emerald-500/25'
                          : 'bg-amber-500/10 border-amber-500/25'
                      }`}
                    >
                      <span className="text-amber-300 font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                      <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-xs ${isFavor ? 'text-emerald-300' : 'text-amber-300'}`}>
                          ⚽ Gol (P.P.)
                        </span>
                        <span className="text-zinc-400 text-xs">
                          {isFavor
                            ? `a Favor (${matchConfig.opponent})`
                            : p
                            ? `en Contra · (${p.number}) ${p.name.split(' ')[0]}`
                            : 'en Contra'}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#888888] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

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

                const actorLabel = p ? `(${p.number}) ${p.name.split(' ')[0]}` : matchConfig.myTeamName;

                return (
                  <div key={ev.id} className="flex items-center gap-2 bg-[#111111] p-2.5 rounded-md border border-[#1F1F1F]/50 group relative">
                    <span className="text-[#EDEDED] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                    <div className="flex-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                      {ev.type === 'goal' && (
                        <span className="text-white font-medium text-xs flex items-center gap-1">
                          ⚽ <span className="text-[#888888]">{actorLabel}</span>
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
                      {ev.type === 'assist' && <><Handshake className="w-3 h-3 text-white" /><span className="text-white font-medium text-xs">Asist: <span className="text-[#888888]">{actorLabel}</span></span></>}
                      {ev.type === 'shot_on_target' && <><Crosshair className="w-3 h-3 text-cyan-400" /><span className="text-cyan-400 font-medium text-xs">Tiro a puerta: <span className="text-[#888888]">{actorLabel}</span></span></>}
                      {ev.type === 'shot_off_target' && <><CircleOff className="w-3 h-3 text-zinc-300" /><span className="text-zinc-300 font-medium text-xs">Tiro fuera: <span className="text-[#888888]">{actorLabel}</span></span></>}
                      {ev.type === 'corner' && <><Flag className="w-3 h-3 text-lime-400" /><span className="text-lime-400 font-medium text-xs">Córner: <span className="text-[#888888]">{actorLabel}</span></span></>}
                      {ev.type === 'offside' && <><AlertOctagon className="w-3 h-3 text-orange-400" /><span className="text-orange-400 font-medium text-xs">Fuera de juego: <span className="text-[#888888]">{actorLabel}</span></span></>}
                      {ev.type === 'foul' && <><AlertTriangle className="w-3 h-3 text-amber-400" /><span className="text-amber-400 font-medium text-xs">Falta: <span className="text-[#888888]">{actorLabel}</span></span></>}
                      {(ev.type === 'yellow' || ev.type === 'yellow_card') && <><div className="w-2 h-3 bg-yellow-400 rounded-sm" /><span className="text-white font-medium text-xs">Amarilla: <span className="text-[#888888]">{actorLabel}</span></span></>}
                      {(ev.type === 'red' || ev.type === 'red_card') && <><div className="w-2 h-3 bg-red-500 rounded-sm" /><span className="text-white font-medium text-xs">Roja: <span className="text-[#888888]">{actorLabel}</span></span></>}
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
                  {goalFlow.step === 'scorer' && 'Selecciona al goleador en el campo o marca Gol en Propia del Rival.'}
                  {goalFlow.step === 'question' && 'Indica si fue una jugada individual o hubo asistencia.'}
                  {goalFlow.step === 'assister' && 'Selecciona al asistente en el campo.'}
                </p>
              </div>
              <button onClick={cancelEvent} className="w-10 h-10 bg-[#111111] rounded-full flex items-center justify-center text-[#888888] hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto pb-6 custom-scrollbar pr-2 space-y-6">
              {goalFlow.step === 'scorer' && (
                <button
                  type="button"
                  onClick={handleOwnGoalFavor}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  ⚽ Gol en Propia Puerta del Rival (+1 a nuestro favor sin asignar goleador)
                </button>
              )}

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

      {/* Modal de Gol en Propia Puerta (A Favor vs En Contra) */}
      {ownGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#1F1F1F] mb-5">
              <div>
                <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  ⚽ Gol en Propia Puerta (P.P.)
                </h3>
                <p className="text-xs text-[#888888]">
                  {ownGoalModal === 'choose'
                    ? '¿A favor de qué equipo sube el gol en propia?'
                    : 'Selecciona qué jugador lo cometió (o déjalo genérico)'}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEvent}
                className="w-8 h-8 rounded-full bg-[#111111] border border-[#1F1F1F] flex items-center justify-center text-[#888888] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {ownGoalModal === 'choose' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={handleOwnGoalFavor}
                  className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 flex flex-col items-center text-center gap-2 transition-all cursor-pointer"
                >
                  <div className="text-xs font-black uppercase text-emerald-400">P.P. A FAVOR (+1 Nosotros)</div>
                  <div className="text-xs text-zinc-300">Un jugador rival marca en su propia portería</div>
                  <span className="text-[10px] text-emerald-400/80 font-mono">No suma gol a ningún jugador nuestro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOwnGoalModal('contra_player')}
                  className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 flex flex-col items-center text-center gap-2 transition-all cursor-pointer"
                >
                  <div className="text-xs font-black uppercase text-red-400">P.P. EN CONTRA (+1 Rival)</div>
                  <div className="text-xs text-zinc-300">Un jugador nuestro marca en nuestra portería</div>
                  <span className="text-[10px] text-red-400/80 font-mono">Opcional indicar jugador</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => handleOwnGoalContra(undefined)}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Registrar genérico: "Gol en Propia (P.P.)" sin jugador
                </button>
                <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {onField.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleOwnGoalContra(p.id)}
                      className="flex flex-col items-center justify-center p-2 bg-[#111111] border border-[#1F1F1F] rounded-md hover:border-red-500/50 transition-all cursor-pointer"
                    >
                      <span className="text-sm font-bold text-white font-mono">{p.number}</span>
                      <span className="text-[10px] text-zinc-400 truncate w-full text-center">{p.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                  {pendingEvent === 'foul' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                  {(pendingEvent === 'yellow' || pendingEvent === 'yellow_card') && <div className="w-4 h-5 bg-yellow-400 rounded-sm" />}
                  {(pendingEvent === 'red' || pendingEvent === 'red_card') && <div className="w-4 h-5 bg-red-500 rounded-sm" />}
                  {pendingEvent === 'sub' && <ArrowRightLeft className="w-6 h-6 text-blue-400" />}
                  
                  {pendingEvent === 'sub' 
                    ? (subStep === 'out' ? 'Paso 1: Selecciona jugador que SALE' : 'Paso 2: Selecciona jugador que ENTRA')
                    : pendingEvent === 'shot_on_target' ? 'Registrar Tiro a Puerta (+1 Equipo)'
                    : pendingEvent === 'shot_off_target' ? 'Registrar Tiro Fuera (+1 Equipo)'
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
                className="p-5 rounded-lg border border-[#1F1F1F] bg-[#111111] hover:bg-[#161616] hover:border-emerald-500/60 flex flex-col items-center justify-center text-center gap-2.5 group transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Mi Equipo</div>
                  <div className="font-bold text-white text-sm line-clamp-1">{matchConfig?.myTeamName || 'Mi Equipo'}</div>
                </div>
                <span className="text-[11px] text-[#888888] group-hover:text-emerald-400/90 transition-colors">
                  {teamSelectEvent === 'corner' || teamSelectEvent === 'offside'
                    ? 'Sumar a estadística colectiva (+1)'
                    : 'Preguntar por jugador (+1)'}
                </span>
              </button>

              {/* Opción 2: Rival */}
              <button
                type="button"
                onClick={() => handleSelectTeamForAction('rival')}
                className="p-5 rounded-lg border border-[#1F1F1F] bg-[#111111] hover:bg-[#161616] hover:border-red-500/60 flex flex-col items-center justify-center text-center gap-2.5 group transition-all cursor-pointer"
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

            {saveToast && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>✅ Partido guardado correctamente</span>
              </div>
            )}

            <p className="text-[#888888] text-sm text-center mb-8">
              ¿Guardar en el Historial? El resultado se sincronizará automáticamente con el planificador de temporada.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => !isSaving && setIsEndMatchModalOpen(false)}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-[#111111] text-white font-bold rounded-md hover:bg-[#1A1A1A] transition-colors border border-[#1F1F1F] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmEndMatch}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-[#EDEDED] text-[#0A0A0A] font-bold rounded-md hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando partido...</span>
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <MetricsConfigModal isOpen={isMetricsModalOpen} onClose={() => setIsMetricsModalOpen(false)} />
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
