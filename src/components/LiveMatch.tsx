import { useState, useEffect, useRef } from 'react';
import { Player, MatchEvent, EventType } from '../types';
import { useTeam } from '../context/TeamContext';
import { Play, Pause, Goal, Handshake, ArrowRightLeft, Square, Trash2, Edit3 } from 'lucide-react';

interface LiveMatchProps {
  squad: Player[];
  bench: Player[];
  onNavigate: (view: any) => void;
  scheduledMatch?: any;
}

const loadState = (key: string, defaultVal: any) => {
  try {
    const saved = localStorage.getItem('activeMatchSession');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.matchConfig && data[key] !== undefined) {
        return data[key];
      }
    }
  } catch (e) {}
  return defaultVal;
};

export function LiveMatch({ squad, bench, onNavigate, scheduledMatch }: LiveMatchProps) {
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

  // --- Modal / Sub State ---
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null);
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState(false);
  const [matchSyncDate, setMatchSyncDate] = useState(scheduledMatch ? scheduledMatch.date : new Date().toISOString().split('T')[0]);
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
  const stateRef = useRef({ onField, availableBench, isRunning, accumulated, startTime, displayTime, period, addedTime, score, events, matchConfig, initialStarters, initialBenchPlayers, captainId });
  useEffect(() => {
    stateRef.current = { onField, availableBench, isRunning, accumulated, startTime, displayTime, period, addedTime, score, events, matchConfig, initialStarters, initialBenchPlayers, captainId };
  });

  const saveSession = () => {
    if (stateRef.current.matchConfig) {
      localStorage.setItem('activeMatchSession', JSON.stringify(stateRef.current));
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
  }, [events, period, isRunning, score]);

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
      return;
    }
    setPendingEvent(type);
    if (type === 'sub') {
      setSubStep('out');
      setPlayerOutId(null);
    }
  };

  const cancelEvent = () => {
    setPendingEvent(null);
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
    cancelEvent();
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!window.confirm("¿Seguro que deseas deshacer este evento?")) return;

    setEvents(prev => {
      const eventToDel = prev.find(e => e.id === eventId);
      if (!eventToDel) return prev;
      
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

      return prev.filter(e => e.id !== eventId);
    });
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
      matchResult,
      myTeamName: matchConfig.myTeamName,
      condition: matchConfig.condition,
      myScore,
      rivalScore
    };

    const { db } = await import('../services/db');
    await db.saveMatch(matchData);
    
    // Sync with Season Planner (Macrocycle)
    let seasonPlan = await db.getSeasonPlan(); if (!seasonPlan || Object.keys(seasonPlan).length === 0) { const local = localStorage.getItem('am_manager_season_plan'); if (local) seasonPlan = JSON.parse(local); }
    const planKey = activeTeam?.id ? `${activeTeam.id}_${matchSyncDate}` : matchSyncDate;
    
    const existingDayPlan = seasonPlan[planKey] || seasonPlan[matchSyncDate] || {
      dateString: matchSyncDate,
      teamId: activeTeam?.id,
      plannedExercises: [],
      isMatchDay: true,
      isRestDay: false,
      playersNeeded: 18
    };

    seasonPlan[planKey] = {
      ...existingDayPlan,
      teamId: activeTeam?.id || existingDayPlan.teamId,
      isMatchDay: true,
      matchDetails: {
        ...(existingDayPlan.matchDetails || {
          opponent: matchConfig.opponent,
          isHome: isLocal,
          competition: matchConfig.type
        }),
        played: true,
        score: `${score.home} - ${score.away}` // keeping the traditional format for planner
      }
    };
    
    // Delete old non-namespaced key if it was migrated
    if (planKey !== matchSyncDate && seasonPlan[matchSyncDate]) {
       delete seasonPlan[matchSyncDate];
    }
    
    localStorage.setItem('am_manager_season_plan', JSON.stringify(seasonPlan)); await db.saveSeasonPlan(seasonPlan);
    localStorage.removeItem('activeMatchSession');

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


  if (!matchConfig) {
    return (
      <div className="flex flex-col h-full bg-[#0A0A0C] w-full items-center justify-center p-4">
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Configurar Partido</h2>
          
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Mi Equipo</label>
                <input 
                  type="text" 
                  value={setupForm.myTeamName}
                  readOnly
                  disabled
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-[#6E6E75] cursor-not-allowed focus:outline-none opacity-70"
                />
              </div>
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Condición</label>
                <div className="flex bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-1">
                  <button 
                    onClick={() => !scheduledMatch && setSetupForm({...setupForm, condition: 'Local'})}
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
                      setupForm.condition === 'Local' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'
                    } ${scheduledMatch ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    Local
                  </button>
                  <button 
                    onClick={() => !scheduledMatch && setSetupForm({...setupForm, condition: 'Visitante'})}
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
                      setupForm.condition === 'Visitante' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'
                    } ${scheduledMatch ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    Visitante
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1 flex items-center gap-2">
                  Nombre del Rival
                  {scheduledMatch && (
                    <span className="text-[10px] font-bold bg-[#FF4B4B]/10 text-[#FF4B4B] px-2 py-0.5 rounded-full border border-[#FF4B4B]/20">
                      📅 Desde Calendario
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Atlético de Madrid"
                  value={setupForm.opponent}
                  onChange={(e) => !scheduledMatch && setSetupForm({...setupForm, opponent: e.target.value})}
                  disabled={!!scheduledMatch}
                  readOnly={!!scheduledMatch}
                  className={`w-full bg-[#1C1C1F] border rounded-xl px-4 py-3 text-sm focus:outline-none ${
                    scheduledMatch
                      ? 'border-[#FF4B4B]/30 text-[#FF4B4B] cursor-not-allowed opacity-80'
                      : 'border-[#2A2A2E] text-white focus:border-[#FF4B4B]/50'
                  }`}
                  autoFocus={!scheduledMatch}
                />
              </div>
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Tipo de Partido</label>
                <select 
                  value={setupForm.type}
                  onChange={(e) => setSetupForm({...setupForm, type: e.target.value as any})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
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
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Duración por Parte (min)</label>
                <input 
                  type="number" 
                  value={setupForm.halfDuration}
                  onChange={(e) => setSetupForm({...setupForm, halfDuration: parseInt(e.target.value) || 45})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                  min="1"
                  max="60"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[#6E6E75] text-sm font-medium">Titulares</label>
                <span className={`text-xs font-bold px-2 py-1 rounded-md border ${
                  selectedStartersIds.length === (activeTeam?.modality === 'F7' ? 7 : 11) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#1C1C1F] text-white border-[#2A2A2E]'
                }`}>
                  {selectedStartersIds.length} Seleccionados
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-3 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl">
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
                            : 'bg-[#121215] border-[#2A2A2E] text-[#6E6E75] hover:border-[#FF4B4B]/50'
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
                              : 'bg-[#1C1C1F] text-[#6E6E75] border-[#2A2A2E] hover:border-yellow-500/50 hover:text-yellow-500'
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

          <button 
            onClick={startMatch}
            className="w-full py-4 bg-[#FF4B4B] text-black font-bold rounded-xl hover:bg-[#FF4B4B]/90 transition-colors shadow-lg shadow-[#FF4B4B]/20 text-lg"
          >
            Iniciar Partido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0C] w-full relative">
      <div className="sticky top-0 z-10 bg-[#121215] border-b border-[#2A2A2E] p-4 pb-6 flex flex-col items-center shadow-lg">
        <div className="text-[#6E6E75] font-medium text-sm mb-4 text-center">
          AM Manager <span className="mx-2">|</span> 🏆 {matchConfig.type}
        </div>
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-4">
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-widest mb-1 truncate max-w-[100px]">
              {matchConfig.condition === 'Local' ? matchConfig.myTeamName : matchConfig.opponent}
            </span>
            <span className="text-5xl font-black text-white">
              {score.home}
            </span>
          </div>
          <div className="text-[#2A2A2E] text-3xl font-bold px-4">-</div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-widest mb-1 truncate max-w-[100px]">
              {matchConfig.condition === 'Local' ? matchConfig.opponent : matchConfig.myTeamName}
            </span>
            <span className="text-5xl font-black text-white">
              {score.away}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
          {/* Period label */}
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF4B4B]">
            {period === '1st_half' && '1ª Parte'}
            {period === 'halftime' && 'Descanso'}
            {period === '2nd_half' && '2ª Parte'}
            {period === 'finished' && 'Finalizado'}
          </span>

          {/* Clock row */}
          <div className="flex items-center gap-4">
            <div className="text-4xl font-mono font-bold text-[#FF4B4B] bg-[#1C1C1F] px-6 py-2 rounded-xl border border-[#FF4B4B]/30 shadow-[0_0_15px_rgba(255,75,75,0.2)]">
              {formatTime(displayTime)}
            </div>
            <button
              onClick={toggleTimer}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                isRunning ? 'bg-[#2A2A2E] text-white hover:bg-[#3A3A3E]' : 'bg-[#FF4B4B] text-black hover:bg-[#FF4B4B]/80 hover:scale-105'
              }`}
            >
              {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>
          </div>

          {/* Period-transition button — always visible, full width */}
          {period === '1st_half' && (
            <button
              onClick={handlePeriodTransition}
              className="w-full bg-red-600 text-white py-3 text-base font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all"
            >
              ⏸ Pitar Descanso
            </button>
          )}
          {period === 'halftime' && (
            <button
              onClick={handlePeriodTransition}
              className="w-full bg-blue-600 text-white py-3 text-base font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
            >
              ▶ Iniciar 2ª Parte
            </button>
          )}
          {period === '2nd_half' && (
            <button
              onClick={handlePeriodTransition}
              className="w-full bg-gray-700 text-white py-3 text-base font-bold rounded-xl hover:bg-gray-800 active:scale-95 transition-all"
            >
              ■ Finalizar Partido
            </button>
          )}
        </div>
      </div>

      {/* ── 3-COLUMN MAIN LAYOUT ── */}
      <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-3 lg:p-5 gap-4">

        {/* COL 1 — Acciones Rápidas */}
        <div className="lg:w-52 xl:w-60 flex flex-col shrink-0">
          <h2 className="text-xs font-bold text-[#6E6E75] uppercase tracking-widest mb-3">Acciones</h2>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            <button
              onClick={() => handleEventSelect('goal')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-95 ${
                goalFlow ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30' : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              <Goal className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-400 text-sm">Gol a Favor</span>
            </button>

            <button
              onClick={handleRivalGoal}
              className="flex items-center gap-3 px-4 py-3 bg-[#FF4B4B]/10 border border-[#FF4B4B]/30 rounded-xl hover:bg-[#FF4B4B]/20 active:scale-95 transition-all"
            >
              <Goal className="w-5 h-5 text-[#FF4B4B] shrink-0" />
              <span className="font-bold text-[#FF4B4B] text-sm">Gol Rival</span>
            </button>

            <button
              onClick={() => handleEventSelect('assist')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-95 ${
                pendingEvent === 'assist' ? 'bg-white/20 border-white ring-2 ring-white/30' : 'bg-[#1C1C1F] border-[#2A2A2E] hover:bg-[#2A2A2E]'
              }`}
            >
              <Handshake className="w-5 h-5 text-white shrink-0" />
              <span className="font-bold text-white text-sm">Asistencia</span>
            </button>

            <button
              onClick={() => handleEventSelect('yellow')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-95 ${
                pendingEvent === 'yellow' ? 'bg-yellow-500/30 border-yellow-400 ring-2 ring-yellow-400/30' : 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20'
              }`}
            >
              <div className="w-3.5 h-5 bg-yellow-400 rounded-sm shrink-0" />
              <span className="font-bold text-yellow-400 text-sm">Amarilla</span>
            </button>

            <button
              onClick={() => handleEventSelect('red')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-95 ${
                pendingEvent === 'red' ? 'bg-[#FF4B4B]/30 border-[#FF4B4B] ring-2 ring-[#FF4B4B]/30' : 'bg-[#FF4B4B]/10 border-[#FF4B4B]/20 hover:bg-[#FF4B4B]/20'
              }`}
            >
              <div className="w-3.5 h-5 bg-[#FF4B4B] rounded-sm shrink-0" />
              <span className="font-bold text-[#FF4B4B] text-sm">Roja</span>
            </button>

            <button
              onClick={() => handleEventSelect('sub')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all active:scale-95 ${
                pendingEvent === 'sub' ? 'bg-blue-500/30 border-blue-400 ring-2 ring-blue-400/30' : 'bg-[#1C1C1F] border-[#2A2A2E] hover:bg-[#2A2A2E]'
              }`}
            >
              <ArrowRightLeft className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="font-bold text-blue-400 text-sm">Cambio</span>
            </button>

            <button
              onClick={handleAddNote}
              className="flex items-center gap-3 px-4 py-3 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl hover:bg-[#2A2A2E] active:scale-95 transition-all"
            >
              <Edit3 className="w-5 h-5 text-purple-400 shrink-0" />
              <span className="font-bold text-purple-400 text-sm">Nota Rápida</span>
            </button>
          </div>

          {/* Action status indicator */}
          {(pendingEvent || goalFlow) && (
            <div className="mt-3 p-3 bg-[#FF4B4B]/5 border border-[#FF4B4B]/30 rounded-xl">
              <p className="text-[#FF4B4B] text-xs font-bold text-center">
                {goalFlow?.step === 'scorer' && '⚽ Selecciona el GOLEADOR'}
                {goalFlow?.step === 'question' && '¿Hubo asistencia?'}
                {goalFlow?.step === 'assister' && '👟 Selecciona el ASISTENTE'}
                {pendingEvent === 'assist' && '👟 Selecciona el ASISTENTE'}
                {pendingEvent === 'yellow' && '🟨 Selecciona el jugador'}
                {pendingEvent === 'red' && '🟥 Selecciona el jugador'}
                {pendingEvent === 'sub' && subStep === 'out' && '↑ ¿Quién SALE?'}
                {pendingEvent === 'sub' && subStep === 'in' && '↓ ¿Quién ENTRA?'}
              </p>
              <button onClick={cancelEvent} className="w-full mt-2 text-[#6E6E75] text-xs hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          )}

          {/* Goal flow question */}
          {goalFlow?.step === 'question' && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleGoalQuestion(false)}
                className="flex-1 py-2 bg-[#1C1C1F] border border-[#2A2A2E] text-white text-xs font-bold rounded-xl hover:bg-[#2A2A2E]"
              >
                Sin asistencia
              </button>
              <button
                onClick={() => handleGoalQuestion(true)}
                className="flex-1 py-2 bg-white/10 border border-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/20"
              >
                Con asistencia
              </button>
            </div>
          )}
        </div>

        {/* COL 2 — En el Campo (Squad Panel) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-[#6E6E75] uppercase tracking-widest">En el Campo</h2>
            <span className="text-xs text-[#6E6E75]">{onField.length} jugadores</span>
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
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 ${
                    isActionable || isSubOut
                      ? 'border-[#FF4B4B]/50 bg-[#FF4B4B]/5 hover:bg-[#FF4B4B]/15 cursor-pointer ring-1 ring-[#FF4B4B]/20'
                      : 'border-[#2A2A2E] bg-[#1C1C1F] cursor-default'
                  } ${isSubIn ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-base mb-1 ${
                    isActionable || isSubOut ? 'bg-[#FF4B4B] text-black' : 'bg-[#2A2A2E] text-white'
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
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/15 transition-all active:scale-95"
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
                  <p className="col-span-full text-center text-[#6E6E75] text-xs italic py-4">Sin jugadores en el banquillo</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COL 3 — Timeline */}
        <div className="w-full lg:w-72 xl:w-80 flex flex-col h-72 lg:h-full bg-[#121215] border border-[#2A2A2E] rounded-2xl overflow-hidden shrink-0">
          <div className="p-3 border-b border-[#2A2A2E]">
            <h3 className="font-bold text-white uppercase tracking-wider text-xs">Timeline</h3>
          </div>
          <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
            {events.length === 0 ? (
              <p className="text-center text-[#6E6E75] text-xs italic mt-8">Esperando eventos...</p>
            ) : (
              events.map(ev => {
                if (ev.type === 'sub') {
                  const pOut = allPlayers.find(x => x.id === ev.playerId);
                  const pIn = allPlayers.find(x => x.id === ev.playerInId);
                  return (
                    <div key={ev.id} className="flex flex-col gap-1 bg-[#1C1C1F] p-2.5 rounded-xl border border-[#2A2A2E]/50 group relative">
                      <div className="flex items-center gap-2">
                        <span className="text-[#FF4B4B] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-white font-medium text-xs">Cambio</span>
                      </div>
                      <div className="text-[#6E6E75] text-[10px] pl-[50px]">
                        Sale: <span className="font-bold text-white/80">({pOut?.number}) {pOut?.name.split(' ')[0]}</span>
                        {' '}→ Entra: <span className="font-bold text-white">({pIn?.number}) {pIn?.name.split(' ')[0]}</span>
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#6E6E75] hover:text-[#FF4B4B] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                if (ev.type === 'period_end') {
                  return (
                    <div key={ev.id} className="flex items-center gap-2 bg-[#FF4B4B]/5 p-2.5 rounded-xl border border-[#FF4B4B]/20 group relative">
                      <span className="text-[#FF4B4B] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-white font-bold text-xs">{ev.periodLabel}</span>
                        {ev.addedMinutes !== undefined && ev.addedMinutes > 0 && (
                          <span className="text-[#FF4B4B] text-[10px] font-bold bg-[#FF4B4B]/10 px-1.5 py-0.5 rounded-full">
                            +{ev.addedMinutes}'
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#6E6E75] hover:text-[#FF4B4B] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                if (ev.type === 'note') {
                  return (
                    <div key={ev.id} className="flex flex-col gap-1 bg-[#1C1C1F] p-2.5 rounded-xl border border-[#2A2A2E]/50 group relative">
                      <div className="flex items-center gap-2">
                        <span className="text-[#FF4B4B] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                        <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-purple-400 font-medium text-xs">Nota</span>
                      </div>
                      <div className="text-[#6E6E75] text-[10px] pl-[50px] italic">
                        "{ev.notes}"
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#6E6E75] hover:text-[#FF4B4B] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                const p = allPlayers.find(x => x.id === ev.playerId);

                if (ev.playerId === 'rival') {
                  return (
                    <div key={ev.id} className="flex items-center gap-2 bg-[#FF4B4B]/10 p-2.5 rounded-xl border border-[#FF4B4B]/30 group relative">
                      <span className="text-[#FF4B4B] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                      <div className="flex-1 flex items-center gap-1.5">
                        <Goal className="w-3.5 h-3.5 text-[#FF4B4B]" />
                        <span className="text-[#FF4B4B] font-medium text-xs">Gol de {matchConfig.opponent}</span>
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#FF4B4B]/50 hover:text-[#FF4B4B] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={ev.id} className="flex items-center gap-2 bg-[#1C1C1F] p-2.5 rounded-xl border border-[#2A2A2E]/50 group relative">
                    <span className="text-[#FF4B4B] font-mono font-bold text-xs min-w-[42px]">[{formatTime(ev.time)}]</span>
                    <div className="flex-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                      {ev.type === 'goal' && (
                        <span className="text-white font-medium text-xs flex items-center gap-1">
                          ⚽ <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span>
                        </span>
                      )}
                      {ev.type === 'goal' && ev.assistId && (() => {
                        const assister = allPlayers.find(x => x.id === ev.assistId);
                        return (
                          <span className="text-white/60 font-medium text-[10px] flex items-center gap-1">
                            👟 <span className="text-[#6E6E75]">({assister?.number}) {assister?.name.split(' ')[0]}</span>
                          </span>
                        );
                      })()}
                      {ev.type === 'assist' && <><Handshake className="w-3 h-3 text-white" /><span className="text-white font-medium text-xs">Asist: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'yellow' && <><div className="w-2 h-3 bg-yellow-400 rounded-sm" /><span className="text-white font-medium text-xs">Amarilla: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'red' && <><div className="w-2 h-3 bg-[#FF4B4B] rounded-sm" /><span className="text-white font-medium text-xs">Roja: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                    </div>
                    <button onClick={() => handleDeleteEvent(ev.id)} className="absolute top-2 right-2 p-1 text-[#6E6E75] hover:text-[#FF4B4B] opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="bg-[#121215] w-full max-w-2xl mx-auto border-t md:border border-[#2A2A2E] md:rounded-t-3xl md:mb-0 rounded-t-3xl p-6 animate-in slide-in-from-bottom-full duration-200 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Goal className="w-6 h-6 text-emerald-400" />
                  {goalFlow.step === 'scorer' && 'Paso 1: ¿Quién marcó el gol?'}
                  {goalFlow.step === 'question' && 'Paso 2: ¿Hubo asistencia?'}
                  {goalFlow.step === 'assister' && 'Paso 3: ¿Quién dio la asistencia?'}
                </h2>
                <p className="text-[#6E6E75] text-sm mt-1">
                  {goalFlow.step === 'scorer' && 'Selecciona al goleador en el campo.'}
                  {goalFlow.step === 'question' && 'Indica si fue una jugada individual o hubo asistencia.'}
                  {goalFlow.step === 'assister' && 'Selecciona al asistente en el campo.'}
                </p>
              </div>
              <button onClick={cancelEvent} className="w-10 h-10 bg-[#1C1C1F] rounded-full flex items-center justify-center text-[#6E6E75] hover:text-white transition-colors">
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
                      className="flex flex-col items-center justify-center p-3 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl hover:border-emerald-500 hover:bg-[#2A2A2E] active:scale-95 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#2A2A2E] text-white flex items-center justify-center font-bold text-xl mb-2 shadow-inner">
                        {p.number}
                      </div>
                      <span className="text-xs font-bold text-white text-center line-clamp-1 w-full">{p.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              )}

              {goalFlow.step === 'question' && (
                <div className="flex gap-4">
                  <button onClick={() => handleGoalQuestion(true)} className="flex-1 flex flex-col items-center justify-center gap-3 py-8 bg-[#1C1C1F] border border-[#2A2A2E] rounded-2xl active:scale-95 transition-all hover:bg-[#2A2A2E]">
                    <Handshake className="w-8 h-8 text-white" />
                    <span className="font-bold text-white text-lg">Sí, hubo asistencia</span>
                  </button>
                  <button onClick={() => handleGoalQuestion(false)} className="flex-1 flex flex-col items-center justify-center gap-3 py-8 bg-[#1C1C1F] border border-[#2A2A2E] rounded-2xl active:scale-95 transition-all hover:bg-[#2A2A2E]">
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
          <div className="bg-[#121215] w-full max-w-2xl mx-auto border-t md:border border-[#2A2A2E] md:rounded-t-3xl md:mb-0 rounded-t-3xl p-6 animate-in slide-in-from-bottom-full duration-200 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {pendingEvent === 'goal' && <Goal className="w-6 h-6 text-emerald-400" />}
                  {pendingEvent === 'assist' && <Handshake className="w-6 h-6 text-white" />}
                  {pendingEvent === 'yellow' && <div className="w-4 h-5 bg-yellow-400 rounded-sm" />}
                  {pendingEvent === 'red' && <div className="w-4 h-5 bg-[#FF4B4B] rounded-sm" />}
                  {pendingEvent === 'sub' && <ArrowRightLeft className="w-6 h-6 text-blue-400" />}
                  
                  {pendingEvent === 'sub' 
                    ? (subStep === 'out' ? 'Paso 1: Selecciona jugador que SALE' : 'Paso 2: Selecciona jugador que ENTRA')
                    : 'Asignar a Jugador'}
                </h2>
                <p className="text-[#6E6E75] text-sm mt-1">
                  {pendingEvent === 'sub' 
                    ? (subStep === 'out' ? 'Mostrando jugadores en el campo.' : 'Mostrando jugadores en el banquillo.') 
                    : 'Toca a un jugador para registrar la acción.'}
                </p>
              </div>
              <button onClick={cancelEvent} className="w-10 h-10 bg-[#1C1C1F] rounded-full flex items-center justify-center text-[#6E6E75] hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto pb-6 custom-scrollbar pr-2 space-y-6">
              {pendingEvent !== 'sub' ? (
                <>
                  <div>
                    <h3 className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-3">En el campo</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {onField.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => assignEventToPlayer(p.id)}
                          className="flex flex-col items-center justify-center p-2 bg-[#1C1C1F] border border-[#FF4B4B]/30 rounded-xl hover:bg-[#FF4B4B]/10 active:scale-95 transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#2A2A2E] text-white flex items-center justify-center font-bold text-lg mb-1 shadow-inner">
                            {p.number}
                          </div>
                          <span className="text-[10px] font-bold text-white text-center line-clamp-1 w-full">{p.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-3">Banquillo</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 opacity-60 hover:opacity-100 transition-opacity">
                      {availableBench.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => assignEventToPlayer(p.id)}
                          className="flex flex-col items-center justify-center p-2 bg-[#121215] border border-[#2A2A2E] rounded-xl hover:border-[#6E6E75] active:scale-95 transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#1C1C1F] text-[#6E6E75] flex items-center justify-center font-bold text-lg mb-1 shadow-inner">
                            {p.number}
                          </div>
                          <span className="text-[10px] font-medium text-[#6E6E75] text-center line-clamp-1 w-full">{p.name.split(' ')[0]}</span>
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
                      className="flex flex-col items-center justify-center p-3 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl hover:border-[#FF4B4B] hover:bg-[#2A2A2E] active:scale-95 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#2A2A2E] text-white flex items-center justify-center font-bold text-xl mb-2 shadow-inner">
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

      {/* End Match Confirmation Modal */}
      {isEndMatchModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 md:p-8 max-w-md w-full animate-in zoom-in-95 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Fin del Partido</h2>
            
            <div className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-6 mb-6 text-center shadow-inner">
              <div className="text-[#6E6E75] text-sm font-bold uppercase tracking-wider mb-3">Resultado final</div>
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-widest mb-1 truncate max-w-[80px]">
                    {matchConfig?.condition === 'Local' ? matchConfig?.myTeamName : matchConfig?.opponent}
                  </span>
                  <span className="text-4xl font-black text-white">{score.home}</span>
                </div>
                <div className="text-[#2A2A2E] text-2xl font-bold px-2">-</div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-widest mb-1 truncate max-w-[80px]">
                    {matchConfig?.condition === 'Local' ? matchConfig?.opponent : matchConfig?.myTeamName}
                  </span>
                  <span className="text-4xl font-black text-white">{score.away}</span>
                </div>
              </div>
            </div>

            <p className="text-[#6E6E75] text-sm text-center mb-8">
              ¿Guardar en el Historial? El resultado se sincronizará automáticamente con el planificador de temporada.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsEndMatchModalOpen(false)}
                className="flex-1 px-4 py-3 bg-[#1C1C1F] text-white font-bold rounded-xl hover:bg-[#2A2A2E] transition-colors border border-[#2A2A2E]"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmEndMatch}
                className="flex-1 px-4 py-3 bg-[#FF4B4B] text-black font-bold rounded-xl hover:bg-[#FF4B4B]/90 transition-colors shadow-lg shadow-[#FF4B4B]/20"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


