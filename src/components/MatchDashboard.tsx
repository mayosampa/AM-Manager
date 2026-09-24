import React, { useState, useEffect } from 'react';
import { Play, Plus, Minus, Calendar, Users, Zap, Clock, ShieldAlert, ClipboardEdit } from 'lucide-react';
import { MOCK_PLAYERS } from '../data/players';
import { Player } from '../types';
import { LiveMatch } from './LiveMatch';
import { ManualMatchEntry } from './ManualMatchEntry';
import { useTeam } from '../context/TeamContext';

type MatchPhase = 'hub' | 'callup' | 'live' | 'manual';

interface MatchDashboardProps {
  onNavigate?: (view: any) => void;
}

export function MatchDashboard({ onNavigate }: MatchDashboardProps) {
  const [phase, setPhase] = useState<MatchPhase>('hub');
  const { activeTeam } = useTeam();
  
  // Filter out injured and suspended players for the match day
  const basePlayers = activeTeam 
    ? activeTeam.players.filter(p => !p.isSuspended && p.status === 'available') 
    : MOCK_PLAYERS.filter(p => !p.isSuspended && p.status === 'available');

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(basePlayers);
  const [squad, setSquad] = useState<Player[]>([]);
  const [upcomingMatch, setUpcomingMatch] = useState<any>(null);
  const [allUnplayed, setAllUnplayed] = useState<any[]>([]);
  const [isAdHoc, setIsAdHoc] = useState(false);

  // Load upcoming match from Season Planner — catches all formats
  useEffect(() => {
    const plan = JSON.parse(localStorage.getItem('am_manager_season_plan') || '{}');
    const today = new Date().toISOString().split('T')[0];

    const dates = Object.keys(plan).sort();
    const unplayed: any[] = [];
    for (const date of dates) {
      const day = plan[date];
      if (!day) continue;
      // Support both old (isMatchDay) and new (type==='match') schemas
      const isMatch = day.isMatchDay === true || day.type === 'match';
      const isPlayed = day.played === true || (day.matchDetails && day.matchDetails.played === true);
      const matchesTeam = day.teamId === activeTeam?.id;
      
      if (isMatch && !isPlayed && matchesTeam) {
        unplayed.push({ date: day.dateString || date, ...day });
      }
    }

    console.log('[MatchDashboard] Unplayed matches found:', unplayed.length, unplayed);
    setAllUnplayed(unplayed);
    // Default to first upcoming match on or after today, fallback to first in list
    const next = unplayed.find(m => m.date >= today) || unplayed[0] || null;
    setUpcomingMatch(next);
  }, [phase, activeTeam?.id]);

  // Load persistent call-up when entering callup phase
  useEffect(() => {
    if (phase === 'callup') {
      let callupIds: string[] = [];
      if (!isAdHoc && upcomingMatch?.calledUpPlayers) {
        callupIds = upcomingMatch.calledUpPlayers;
      } else if (activeTeam?.activeCallUp) {
        // Fallback for ad-hoc or legacy
        callupIds = activeTeam.activeCallUp;
      }

      const calledUp = basePlayers.filter(p => callupIds.includes(p.id));
      const notCalledUp = basePlayers.filter(p => !callupIds.includes(p.id));
      setSquad(calledUp);
      setAvailablePlayers(notCalledUp);
    }
  }, [phase, isAdHoc, upcomingMatch]);

  const moveToSquad = (p: Player) => {
    setAvailablePlayers(prev => prev.filter(x => x.id !== p.id));
    setSquad(prev => [...prev, p]);
  };

  const removeFromSquad = (p: Player) => {
    setSquad(prev => prev.filter(x => x.id !== p.id));
    setAvailablePlayers(prev => [...prev, p]);
  };

  const saveCallUpAndReturn = () => {
    const squadIds = squad.map(p => p.id);
    if (!isAdHoc && upcomingMatch) {
      // Save to planner
      const plan = JSON.parse(localStorage.getItem('am_manager_season_plan') || '{}');
      if (plan[upcomingMatch.date]) {
        plan[upcomingMatch.date].calledUpPlayers = squadIds;
        localStorage.setItem('am_manager_season_plan', JSON.stringify(plan));
      }
    } else {
      // Legacy ad-hoc fallback (would require updateTeamCallUp from Context ideally, but local works for now)
      // activeTeam?.activeCallUp = squadIds; (Context hook can handle this, for simplicity skipped in this decoupled version)
    }
    setPhase('hub');
  };

  const startLiveMatch = (adHoc: boolean) => {
    console.log('[MatchDashboard] startLiveMatch called, adHoc:', adHoc, 'squad:', squad.length);
    setIsAdHoc(adHoc);
    if (!adHoc && upcomingMatch) {
      const callupIds = upcomingMatch.calledUpPlayers || [];
      // Load callup squad if available, otherwise use all available players
      const calledUp = callupIds.length > 0
        ? basePlayers.filter(p => callupIds.includes(p.id))
        : basePlayers;
      setSquad(calledUp);
      setAvailablePlayers(basePlayers.filter(p => !calledUp.map((x: Player) => x.id).includes(p.id)));
    }
    // Always transition — no blocking
    setPhase('live');
  };

  const [hasActiveSession, setHasActiveSession] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('activeMatchSession');
      if (saved) {
        const data = JSON.parse(saved);
        if (data && data.matchConfig) {
          setHasActiveSession(true);
        }
      }
    } catch (e) {}
  }, [phase]);

  if (hasActiveSession && phase === 'hub') {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto w-full justify-center items-center h-[80vh]">
        <div className="bg-[#121215] border-2 border-yellow-500 rounded-3xl p-8 w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.2)]">
          <ShieldAlert className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Partido en Curso</h2>
          <p className="text-[#6E6E75] mb-10 text-lg">Se ha detectado una sesión de partido activa.</p>
          <button
            onClick={() => {
              setHasActiveSession(false);
              setPhase('live');
            }}
            className="w-full py-6 bg-yellow-500 text-black font-black text-2xl rounded-2xl shadow-xl hover:bg-yellow-400 active:scale-95 transition-all uppercase tracking-wide"
          >
            Reanudar Partido
          </button>
          <button
            onClick={() => {
              if (window.confirm("¿Seguro que deseas descartar este partido? Los datos no guardados se perderán.")) {
                localStorage.removeItem('activeMatchSession');
                setHasActiveSession(false);
              }
            }}
            className="w-full mt-4 py-4 text-[#FF4B4B] font-bold text-lg rounded-2xl hover:bg-[#FF4B4B]/10 active:scale-95 transition-all"
          >
            Descartar Partido
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'live') {
    return <LiveMatch squad={squad} bench={[]} onNavigate={onNavigate || (() => {})} scheduledMatch={!isAdHoc ? upcomingMatch : null} />;
  }

  if (phase === 'manual') {
    return (
      <ManualMatchEntry 
        activeTeam={activeTeam} 
        upcomingMatch={!isAdHoc ? upcomingMatch : null} 
        onComplete={() => setPhase('hub')} 
        onCancel={() => setPhase('hub')} 
      />
    );
  }

  if (phase === 'callup') {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-20">
        <div className="flex justify-between items-center bg-[#121215] p-6 rounded-2xl border border-[#2A2A2E]">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {isAdHoc ? 'Convocatoria Rápida' : `Convocatoria: vs ${upcomingMatch?.opponent || upcomingMatch?.matchDetails?.opponent || 'Rival'}`}
            </h1>
            <p className="text-[#6E6E75]">Selecciona los jugadores disponibles para el partido.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPhase('hub')}
              className="bg-[#1C1C1F] text-white border border-[#2A2A2E] font-bold py-3 px-6 rounded-xl hover:bg-[#2A2A2E] transition-colors"
            >
              {isAdHoc ? 'Cancelar' : 'Guardar y Volver'}
            </button>
            {!isAdHoc && (
              <button
                onClick={saveCallUpAndReturn}
                className="bg-[#FF4B4B] text-black font-bold py-3 px-6 rounded-xl hover:bg-[#FF4B4B]/90 transition-colors"
              >
                Guardar Convocatoria
              </button>
            )}
            {isAdHoc && (
              <button
                onClick={() => {
                  console.log('[MatchDashboard] Continuar a Partido (adHoc), squad:', squad.length);
                  setPhase('live');
                }}
                className="bg-[#FF4B4B] text-black font-bold py-3 px-6 rounded-xl hover:bg-[#FF4B4B]/90 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Continuar a Partido
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Disponibles */}
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4 flex items-center justify-between">
              Disponibles
              <span className="bg-[#1C1C1F] text-[#6E6E75] px-3 py-1 rounded-full text-sm">{availablePlayers.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {availablePlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-[#1C1C1F] rounded-xl border border-[#2A2A2E]">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#2A2A2E] flex items-center justify-center font-bold text-sm text-[#6E6E75]">
                      {p.number}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-white leading-tight">{p.name}</span>
                      <span className="text-xs text-[#6E6E75]">{p.positionGroup}{p.position ? ` - ${p.position}` : ''}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => moveToSquad(p)}
                    className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Convocados */}
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4 flex items-center justify-between">
              Convocados
              <span className="bg-[#FF4B4B]/10 text-[#FF4B4B] px-3 py-1 rounded-full text-sm">{squad.length}</span>
            </h2>
            {squad.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[#2A2A2E] rounded-xl">
                <p className="text-[#6E6E75] font-semibold">Sin convocar</p>
                <p className="text-[#6E6E75] text-sm">Añade jugadores desde la lista</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {squad.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[#FF4B4B]/5 rounded-xl border border-[#FF4B4B]/20">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#FF4B4B] flex items-center justify-center font-bold text-sm text-black shadow-sm shadow-[#FF4B4B]/30">
                        {p.number}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-bold text-white leading-tight">{p.name}</span>
                        <span className="text-xs text-[#FF4B4B]/70">{p.positionGroup}{p.position ? ` - ${p.position}` : ''}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromSquad(p)}
                      className="p-2 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded-lg hover:bg-[#FF4B4B]/20 transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MATCH HUB PHASE
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full pb-20">
      
      <div className="text-center md:text-left mb-4">
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Match Hub</h1>
        <p className="text-[#6E6E75] text-lg">Central de gestión para la competición y partidos amistosos.</p>
      </div>

      {upcomingMatch ? (
        <div className="bg-gradient-to-br from-[#FF4B4B]/10 to-[#121215] border border-[#FF4B4B]/30 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-[#FF4B4B]/5">
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
            <ShieldAlert className="w-48 h-48 text-[#FF4B4B]" />
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-[#FF4B4B]" />
                <span className="text-[#FF4B4B] font-bold tracking-widest uppercase text-sm">Próximo Partido Oficial</span>
              </div>
              {allUnplayed.length > 1 && (
                <select 
                  className="bg-[#1C1C1F] border border-[#2A2A2E] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#FF4B4B]/50"
                  value={upcomingMatch.date}
                  onChange={(e) => {
                    const selected = allUnplayed.find(m => m.date === e.target.value);
                    if (selected) setUpcomingMatch(selected);
                  }}
                >
                  {allUnplayed.map(m => (
                    <option key={m.date} value={m.date}>{m.date} - vs {m.opponent || m.matchDetails?.opponent || 'Rival'}</option>
                  ))}
                </select>
              )}
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-white mb-2">vs {upcomingMatch.opponent || upcomingMatch.matchDetails?.opponent || 'Rival'}</h2>
            <div className="flex items-center gap-6 text-[#6E6E75] font-medium text-lg mb-10">
              <span className="flex items-center gap-2"><Clock className="w-5 h-5" /> {upcomingMatch.date}</span>
              <span className="flex items-center gap-2 px-3 py-1 bg-[#1C1C1F] rounded-lg border border-[#2A2A2E]">
                {upcomingMatch.location === 'home' ? 'Local' : (upcomingMatch.matchDetails?.isHome ? 'Local' : 'Visitante')}
              </span>
              <span className="px-3 py-1 bg-[#1C1C1F] rounded-lg border border-[#2A2A2E]">
                {upcomingMatch.matchDetails?.competition || 'Competición'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => { setIsAdHoc(false); setPhase('callup'); }}
                className="flex items-center justify-center gap-2 bg-[#1C1C1F] text-white font-bold py-4 px-6 rounded-xl border border-[#2A2A2E] hover:bg-[#2A2A2E] transition-colors text-sm"
              >
                <Users className="w-4 h-4" />
                Convocatoria
                {upcomingMatch.calledUpPlayers && (
                  <span className="ml-1 bg-[#FF4B4B] text-black text-xs px-2 py-0.5 rounded-full">
                    {upcomingMatch.calledUpPlayers.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => { setIsAdHoc(false); setPhase('manual'); }}
                className="flex items-center justify-center gap-2 bg-[#1C1C1F] text-white font-bold py-4 px-6 rounded-xl border border-[#2A2A2E] hover:bg-[#2A2A2E] transition-colors text-sm"
              >
                <ClipboardEdit className="w-4 h-4" />
                Añadir Manual
              </button>

              <button
                onClick={() => startLiveMatch(false)}
                className="flex items-center justify-center gap-2 bg-[#FF4B4B] text-black font-bold py-4 px-8 rounded-xl hover:scale-105 transition-all text-lg shadow-lg shadow-[#FF4B4B]/20 ml-auto sm:ml-0"
              >
                <Play className="w-5 h-5 fill-current" />
                Iniciar Partido
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-3xl p-10 text-center flex flex-col items-center justify-center">
          <Calendar className="w-12 h-12 text-[#6E6E75] mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-white mb-2">No hay partidos programados</h2>
          <p className="text-[#6E6E75] max-w-md">Ve al Planificador de Temporada para agendar tu próximo encuentro oficial.</p>
        </div>
      )}

      {/* Acciones Secundarias */}
      <div className="mt-4 flex flex-col gap-3">
        <h3 className="text-[#6E6E75] font-bold uppercase tracking-widest text-xs mb-2 px-2">Acciones Rápidas</h3>
        <button
          onClick={() => { setIsAdHoc(true); setPhase('callup'); }}
          className="w-full flex items-center justify-between bg-[#121215] border border-[#2A2A2E] p-6 rounded-2xl hover:border-[#FF4B4B]/50 hover:bg-[#1C1C1F] transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <div className="text-left">
              <h4 className="text-white font-bold text-lg">Partido Rápido / Amistoso</h4>
              <p className="text-[#6E6E75] text-sm mt-1">Inicia un partido no programado en el calendario.</p>
            </div>
          </div>
          <Play className="w-6 h-6 text-[#6E6E75] group-hover:text-[#FF4B4B] transition-colors" />
        </button>

        <button
          onClick={() => { setIsAdHoc(true); setPhase('manual'); }}
          className="w-full flex items-center justify-between bg-[#121215] border border-[#2A2A2E] p-6 rounded-2xl hover:border-purple-500/50 hover:bg-[#1C1C1F] transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ClipboardEdit className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-left">
              <h4 className="text-white font-bold text-lg">Completar partido finalizado</h4>
              <p className="text-[#6E6E75] text-sm mt-1">Añade el resultado y las estadísticas manualmente.</p>
            </div>
          </div>
          <Plus className="w-6 h-6 text-[#6E6E75] group-hover:text-purple-500 transition-colors" />
        </button>
      </div>

    </div>
  );
}
