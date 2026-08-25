import { useState, useEffect } from 'react';
import { Player, MatchEvent, EventType } from '../types';
import { useTeam } from '../context/TeamContext';
import { Play, Pause, Goal, Handshake, ArrowRightLeft, Square } from 'lucide-react';

interface LiveMatchProps {
  squad: Player[];
  bench: Player[];
  onNavigate: (view: any) => void;
}

export function LiveMatch({ squad, bench, onNavigate }: LiveMatchProps) {
  const { activeTeam } = useTeam();
  // --- Match Roster State ---
  const [onField, setOnField] = useState<Player[]>(squad);
  const [availableBench, setAvailableBench] = useState<Player[]>(bench);

  // --- Timer State (requestAnimationFrame based) ---
  const [isRunning, setIsRunning] = useState(true);
  const [accumulated, setAccumulated] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [displayTime, setDisplayTime] = useState(0);

  // --- Match State ---
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [events, setEvents] = useState<MatchEvent[]>([]);

  // --- Modal / Sub State ---
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null);
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState(false);
  const [matchSyncDate, setMatchSyncDate] = useState(new Date().toISOString().split('T')[0]);
  const [matchConfig, setMatchConfig] = useState<{opponent: string, type: 'Liga' | 'Amistoso' | 'Copa' | 'Torneo', myTeamName: string, condition: 'Local' | 'Visitante'} | null>(null);
  const [setupForm, setSetupForm] = useState({ opponent: '', type: 'Liga' as const, myTeamName: activeTeam?.name || 'Mi Equipo', condition: 'Local' as 'Local' | 'Visitante' });
  const allAvailable = [...squad, ...bench];
  const [selectedStartersIds, setSelectedStartersIds] = useState<string[]>(squad.map(p => p.id));
  const [subStep, setSubStep] = useState<'out' | 'in'>('out');
  const [goalFlow, setGoalFlow] = useState<{ step: 'scorer' | 'question' | 'assister', scorerId?: string } | null>(null);
  const [playerOutId, setPlayerOutId] = useState<string | null>(null);

  useEffect(() => {
    let reqId: number;
    const update = () => {
      if (isRunning) {
        setDisplayTime(accumulated + Math.floor((Date.now() - startTime) / 1000));
        reqId = requestAnimationFrame(update);
      }
    };
    if (isRunning) {
      setStartTime(Date.now());
      reqId = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(reqId);
  }, [isRunning, accumulated]);

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

  const confirmEndMatch = () => {
    if (!matchConfig) return;

    setIsRunning(false);
    
    const isLocal = matchConfig.condition === 'Local';
    const myScore = isLocal ? score.home : score.away;
    const rivalScore = isLocal ? score.away : score.home;

    const matchResult = myScore > rivalScore ? 'Victoria' : (myScore < rivalScore ? 'Derrota' : 'Empate');

    const matchData = {
      id: Math.random().toString(36).substring(2, 9),
      date: matchSyncDate, // Use the synced date instead of current time
      score,
      events,
      duration: displayTime,
      squad: onField,
      bench: availableBench,
      opponent: matchConfig.opponent,
      matchType: matchConfig.type,
      matchResult,
      myTeamName: matchConfig.myTeamName,
      condition: matchConfig.condition,
      myScore,
      rivalScore
    };

    const history = JSON.parse(localStorage.getItem('matchHistory') || '[]');
    localStorage.setItem('matchHistory', JSON.stringify([matchData, ...history]));
    
    // Sync with Season Planner (Macrocycle)
    const seasonPlan = JSON.parse(localStorage.getItem('am_manager_season_plan') || '{}');
    const existingDayPlan = seasonPlan[matchSyncDate] || {
      dateString: matchSyncDate,
      plannedExercises: [],
      isMatchDay: true,
      isRestDay: false,
      playersNeeded: 18
    };

    seasonPlan[matchSyncDate] = {
      ...existingDayPlan,
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
    
    localStorage.setItem('am_manager_season_plan', JSON.stringify(seasonPlan));

    setIsEndMatchModalOpen(false);
    onNavigate('history');
  };

  const handleFinishMatch_UNUSED = () => {
    if (window.confirm("¿Finalizar y guardar partido?")) {
      setIsRunning(false); // Detener el reloj por seguridad
      
      const matchData = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
        score,
        events,
        duration: displayTime,
        squad: onField,
        bench: availableBench
      };

      const existingMatches = JSON.parse(localStorage.getItem('matchHistory') || '[]');
      localStorage.setItem('matchHistory', JSON.stringify([matchData, ...existingMatches]));
      
      onNavigate('history');
    }
  };

  const allPlayers = [...onField, ...availableBench];

  const startMatch = () => {
    if (!setupForm.opponent.trim() || !setupForm.myTeamName.trim()) return;
    
    const newOnField = allAvailable.filter(p => selectedStartersIds.includes(p.id));
    const newBench = allAvailable.filter(p => !selectedStartersIds.includes(p.id));
    setOnField(newOnField);
    setAvailableBench(newBench);
    
    setMatchConfig({ opponent: setupForm.opponent, type: setupForm.type, myTeamName: setupForm.myTeamName, condition: setupForm.condition });
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
                    onClick={() => setSetupForm({...setupForm, condition: 'Local'})}
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
                      setupForm.condition === 'Local' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'
                    }`}
                  >
                    Local
                  </button>
                  <button 
                    onClick={() => setSetupForm({...setupForm, condition: 'Visitante'})}
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
                      setupForm.condition === 'Visitante' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'
                    }`}
                  >
                    Visitante
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Nombre del Rival</label>
                <input 
                  type="text" 
                  placeholder="Ej: Atlético de Madrid"
                  value={setupForm.opponent}
                  onChange={(e) => setSetupForm({...setupForm, opponent: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                  autoFocus
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
                    <button
                      key={p.id}
                      onClick={() => {
                        const limit = activeTeam?.modality === 'F7' ? 7 : 11;
                        if (isSelected) {
                          setSelectedStartersIds(prev => prev.filter(id => id !== p.id));
                        } else if (selectedStartersIds.length < limit) {
                          setSelectedStartersIds(prev => [...prev, p.id]);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                          : 'bg-[#121215] border-[#2A2A2E] text-[#6E6E75] hover:border-[#FF4B4B]/50'
                      }`}
                    >
                      <div className="text-sm font-bold mb-1">{p.number}</div>
                      <div className="text-[10px] truncate w-full text-center">{p.name.split(' ')[0]}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <button 
            onClick={startMatch}
            disabled={!setupForm.opponent.trim()}
            className="w-full py-3 bg-[#FF4B4B] text-black font-bold rounded-xl hover:bg-[#FF4B4B]/90 transition-colors shadow-lg shadow-[#FF4B4B]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
              {matchConfig.condition === 'Local' ? score.home : score.away}
            </span>
          </div>
          <div className="text-[#2A2A2E] text-3xl font-bold px-4">-</div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-widest mb-1 truncate max-w-[100px]">
              {matchConfig.condition === 'Local' ? matchConfig.opponent : matchConfig.myTeamName}
            </span>
            <span className="text-5xl font-black text-white">
              {matchConfig.condition === 'Local' ? score.away : score.home}
            </span>
          </div>
        </div>

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
          <button 
            onClick={() => setIsEndMatchModalOpen(true)}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#1C1C1F] text-[#6E6E75] border border-[#2A2A2E] hover:text-[#FF4B4B] hover:border-[#FF4B4B]/50 transition-colors"
            title="Finalizar Partido"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row max-w-6xl mx-auto w-full p-4 lg:p-6 gap-6">
        <div className="flex-1 flex flex-col">
          <h2 className="text-sm font-bold text-[#6E6E75] uppercase tracking-widest mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 flex-1 content-start">
            <button onClick={() => handleEventSelect('goal')} className="flex flex-col items-center justify-center gap-3 py-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl active:scale-95 transition-all hover:bg-emerald-500/20">
              <Goal className="w-8 h-8 text-emerald-400" />
              <span className="font-bold text-emerald-400 text-sm md:text-base">Gol a Favor</span>
            </button>
            
            <button onClick={handleRivalGoal} className="flex flex-col items-center justify-center gap-3 py-6 bg-[#FF4B4B]/10 border border-[#FF4B4B]/30 rounded-2xl active:scale-95 transition-all hover:bg-[#FF4B4B]/20">
              <Goal className="w-8 h-8 text-[#FF4B4B]" />
              <span className="font-bold text-[#FF4B4B] text-sm md:text-base">Gol Rival</span>
            </button>

            <button onClick={() => handleEventSelect('assist')} className="flex flex-col items-center justify-center gap-3 py-6 bg-[#1C1C1F] border border-[#2A2A2E] rounded-2xl active:scale-95 transition-all hover:bg-[#2A2A2E]">
              <Handshake className="w-8 h-8 text-white" />
              <span className="font-bold text-white text-lg">Asistencia</span>
            </button>

            <button onClick={() => handleEventSelect('yellow')} className="flex flex-col items-center justify-center gap-3 py-8 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl active:scale-95 transition-all hover:bg-yellow-500/20">
              <div className="w-6 h-8 bg-yellow-400 rounded-sm shadow-sm shadow-yellow-400/50" />
              <span className="font-bold text-yellow-400 text-lg">Amarilla</span>
            </button>

            <button onClick={() => handleEventSelect('red')} className="flex flex-col items-center justify-center gap-3 py-8 bg-[#FF4B4B]/10 border border-[#FF4B4B]/20 rounded-2xl active:scale-95 transition-all hover:bg-[#FF4B4B]/20">
              <div className="w-6 h-8 bg-[#FF4B4B] rounded-sm shadow-sm shadow-[#FF4B4B]/50" />
              <span className="font-bold text-[#FF4B4B] text-lg">Roja</span>
            </button>

            <button onClick={() => handleEventSelect('sub')} className="flex flex-col items-center justify-center gap-3 py-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl active:scale-95 transition-all hover:bg-blue-500/20 col-span-2 sm:col-span-1">
              <ArrowRightLeft className="w-8 h-8 text-blue-400" />
              <span className="font-bold text-blue-400 text-lg">Cambio</span>
            </button>
          </div>
        </div>

        <div className="w-full lg:w-96 flex flex-col h-64 lg:h-full bg-[#121215] border border-[#2A2A2E] rounded-2xl overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#2A2A2E] bg-[#121215] sticky top-0">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Timeline del Partido</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
            {events.length === 0 ? (
              <p className="text-center text-[#6E6E75] text-sm italic mt-10">Esperando eventos...</p>
            ) : (
              events.map(ev => {
                if (ev.type === 'sub') {
                  const pOut = allPlayers.find(x => x.id === ev.playerId);
                  const pIn = allPlayers.find(x => x.id === ev.playerInId);
                  return (
                    <div key={ev.id} className="flex flex-col gap-1 bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E]/50">
                      <div className="flex items-center gap-2">
                        <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">
                          [{formatTime(ev.time)}]
                        </span>
                        <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                        <span className="text-white font-medium">Cambio</span>
                      </div>
                      <div className="text-[#6E6E75] text-xs pl-[60px]">
                        Sale: <span className="font-bold text-white/80">({pOut?.number}) {pOut?.name.split(' ')[0]}</span> | 
                        Entra: <span className="font-bold text-white">({pIn?.number}) {pIn?.name.split(' ')[0]}</span>
                      </div>
                    </div>
                  );
                }

                const p = allPlayers.find(x => x.id === ev.playerId);
                
                if (ev.playerId === 'rival') {
                  return (
                    <div key={ev.id} className="flex items-center gap-3 bg-[#FF4B4B]/10 p-3 rounded-xl border border-[#FF4B4B]/30">
                      <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">
                        [{formatTime(ev.time)}]
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <Goal className="w-4 h-4 text-[#FF4B4B]" />
                        <span className="text-[#FF4B4B] font-medium">Gol de {matchConfig.opponent}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={ev.id} className="flex items-center gap-3 bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E]/50">
                    <span className="text-[#FF4B4B] font-mono font-bold text-sm min-w-[50px]">
                      [{formatTime(ev.time)}]
                    </span>
                    <div className="flex-1 flex items-center flex-wrap gap-x-2 gap-y-1">
                      {ev.type === 'goal' && (
                        <span className="text-white font-medium flex items-center gap-1">
                          ⚽ Gol: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span>
                        </span>
                      )}
                      
                      {ev.type === 'goal' && ev.assistId && (() => {
                        const assister = allPlayers.find(x => x.id === ev.assistId);
                        return (
                          <span className="text-white/70 font-medium flex items-center gap-1">
                            <span className="text-[#2A2A2E] mx-1">|</span>
                            👟 Asistencia: <span className="text-[#6E6E75]">({assister?.number}) {assister?.name.split(' ')[0]}</span>
                          </span>
                        );
                      })()}
                      
                      {ev.type === 'assist' && <><Handshake className="w-4 h-4 text-white" /><span className="text-white font-medium">Asistencia: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'yellow' && <><div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm" /><span className="text-white font-medium">Amarilla: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                      {ev.type === 'red' && <><div className="w-2.5 h-3.5 bg-[#FF4B4B] rounded-sm" /><span className="text-white font-medium">Roja: <span className="text-[#6E6E75]">({p?.number}) {p?.name.split(' ')[0]}</span></span></>}
                    </div>
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
