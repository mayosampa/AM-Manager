import React, { useState, useEffect } from 'react';
import { Player, MatchRecord, MatchEvent } from '../types';
import { Save, Loader, Plus, Trash2, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { db } from '../services/db';

interface ManualMatchEntryProps {
  activeTeam: any;
  upcomingMatch?: any;
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

export function ManualMatchEntry({ activeTeam, upcomingMatch, onComplete, onCancel }: ManualMatchEntryProps) {
  const [date, setDate] = useState(upcomingMatch?.date || new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState(upcomingMatch?.opponent || upcomingMatch?.matchDetails?.opponent || '');
  const [matchType, setMatchType] = useState<'Liga'|'Amistoso'|'Copa'|'Torneo'>(upcomingMatch?.matchDetails?.competition || 'Amistoso');
  const [condition, setCondition] = useState<'Local'|'Visitante'>(
    upcomingMatch?.location === 'home' || upcomingMatch?.matchDetails?.isHome ? 'Local' : 'Visitante'
  );
  const [myTeamName] = useState(activeTeam.name);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [matchDuration, setMatchDuration] = useState<number>(90);
  const [isSaving, setIsSaving] = useState(false);

  // ── Substitution rows ──
  const [substitutions, setSubstitutions] = useState<SubstitutionRow[]>([]);

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
    availablePlayers.forEach((p: Player) => {
      stats[p.id] = { 
        starter: false, 
        played: false, 
        minutes: 0, 
        goals: 0, 
        assists: 0, 
        yellow: 0, 
        red: 0, 
        manualOverride: false 
      };
    });
    return stats;
  });

  // Trigger recalculation on subs or duration change
  useEffect(() => {
    setPlayerStats(prev => recalculateMinutes(prev, substitutions, matchDuration));
  }, [substitutions, matchDuration]);

  const toggleStarter = (id: string) => {
    setPlayerStats(prev => recalculateMinutes({
      ...prev,
      [id]: { ...prev[id], starter: !prev[id].starter, manualOverride: false }
    }, substitutions, matchDuration));
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

      const squadIds = Object.keys(playerStats).filter(id => playerStats[id].played || playerStats[id].starter);
      const squad = availablePlayers.filter((p: Player) => squadIds.includes(p.id));

      // Goals / assists / cards from the individual stats table
      squadIds.forEach(id => {
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

      // Sort all events by time descending
      events.sort((a, b) => b.time - a.time);

      const matchId = Math.random().toString(36).substring(2, 9);

      const newMatch: MatchRecord = {
        id: matchId,
        teamId: activeTeam.id,
        date,
        score,
        events,
        duration: matchDuration * 60,
        squad,
        bench: availablePlayers.filter((p: Player) => !squadIds.includes(p.id)),
        opponent,
        matchType,
        matchResult,
        myTeamName,
        condition,
        myScore,
        rivalScore,
        notes: 'Partido añadido manualmente.',
      };

      await db.saveMatch(newMatch);

      if (upcomingMatch?.date) {
        let plan = await db.getSeasonPlan();
        if (plan && plan[upcomingMatch.date]) {
          plan[upcomingMatch.date].completed = true;
          plan[upcomingMatch.date].matchId = matchId;
          plan[upcomingMatch.date].score = `${score.home} - ${score.away}`;
          await db.saveSeasonPlan(plan);
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
      <div className="flex justify-between items-center bg-[#121215] p-6 rounded-2xl border border-[#2A2A2E]">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Añadir Resultado Manual</h1>
          <p className="text-[#6E6E75]">Registra un partido finalizado y las estadísticas de tus jugadores.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="bg-[#1C1C1F] text-white border border-[#2A2A2E] font-bold py-3 px-6 rounded-xl hover:bg-[#2A2A2E] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#FF4B4B] text-black font-bold py-3 px-6 rounded-xl hover:bg-[#FF4B4B]/90 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Guardando...' : 'Guardar Partido'}
          </button>
        </div>
      </div>

      {/* Match info + Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4">Datos del Partido</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#6E6E75] mb-1">Fecha</label>
                <input
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6E6E75] mb-1">Duración (min)</label>
                <input
                  type="number" value={matchDuration} onChange={e => setMatchDuration(parseInt(e.target.value) || 90)}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#6E6E75] mb-1">Equipo Rival</label>
              <input
                type="text" value={opponent} onChange={e => setOpponent(e.target.value)}
                className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#6E6E75] mb-1">Condición</label>
                <select
                  value={condition} onChange={e => setCondition(e.target.value as 'Local'|'Visitante')}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white"
                >
                  <option value="Local">Local</option>
                  <option value="Visitante">Visitante</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#6E6E75] mb-1">Competición</label>
                <select
                  value={matchType} onChange={e => setMatchType(e.target.value as any)}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white"
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

        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 flex flex-col items-center justify-center">
          <h2 className="font-bold text-[#6E6E75] uppercase tracking-widest text-sm mb-6">Resultado Final</h2>
          <div className="flex items-center gap-8 w-full justify-center">
            <div className="flex flex-col items-center">
              <span className="text-[#6E6E75] text-xs font-bold uppercase mb-2 truncate w-24 text-center">
                {condition === 'Local' ? myTeamName : opponent}
              </span>
              <input
                type="number" min="0" value={homeScore}
                onChange={e => setHomeScore(parseInt(e.target.value) || 0)}
                className="w-20 h-24 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl text-5xl font-black text-center text-white"
              />
            </div>
            <span className="text-[#2A2A2E] text-4xl font-black">-</span>
            <div className="flex flex-col items-center">
              <span className="text-[#6E6E75] text-xs font-bold uppercase mb-2 truncate w-24 text-center">
                {condition === 'Visitante' ? myTeamName : opponent}
              </span>
              <input
                type="number" min="0" value={awayScore}
                onChange={e => setAwayScore(parseInt(e.target.value) || 0)}
                className="w-20 h-24 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl text-5xl font-black text-center text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────
          SUSTITUCIONES
      ────────────────────────────────────────────────── */}
      <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
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
          <p className="text-[#6E6E75] text-sm italic text-center py-4">
            No hay cambios registrados. Pulsa "+ Añadir Cambio" y se calcularán automáticamente los minutos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_40px] gap-3 text-xs font-bold uppercase text-[#6E6E75] px-1">
              <span>Minuto</span>
              <span className="text-red-400">↑ Sale</span>
              <span className="text-green-400">↓ Entra</span>
              <span></span>
            </div>

            {substitutions.map((sub) => (
              <div
                key={sub.id}
                className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_40px] gap-3 items-center bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E]"
              >
                <div>
                  <label className="block text-xs text-[#6E6E75] mb-1 sm:hidden">Minuto</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="1" max={matchDuration}
                      value={sub.minute}
                      onChange={e => updateSub(sub.id, 'minute', parseInt(e.target.value) || 1)}
                      className="w-full bg-[#121215] border border-[#2A2A2E] rounded-lg p-2 text-white text-center font-bold"
                    />
                    <span className="text-[#6E6E75] text-sm">'</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-red-400 font-semibold mb-1 sm:hidden">↑ Jugador que SALE</label>
                  <select
                    value={sub.playerOutId}
                    onChange={e => updateSub(sub.id, 'playerOutId', e.target.value)}
                    className="w-full bg-[#121215] border border-red-500/40 rounded-lg p-2 text-white text-sm"
                  >
                    <option value="">Sale: selecciona...</option>
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id}>({p.number}) {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-green-400 font-semibold mb-1 sm:hidden">↓ Jugador que ENTRA</label>
                  <select
                    value={sub.playerInId}
                    onChange={e => updateSub(sub.id, 'playerInId', e.target.value)}
                    className="w-full bg-[#121215] border border-green-500/40 rounded-lg p-2 text-white text-sm"
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
                  className="flex items-center justify-center text-[#6E6E75] hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                  title="Eliminar cambio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estadísticas Individuales */}
      <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 overflow-hidden">
        <h2 className="font-bold text-white mb-4">Estadísticas Individuales</h2>
        <div className="overflow-x-auto custom-scrollbar pb-4">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="sticky top-0 z-10 bg-[#121215] border-b border-[#2A2A2E] text-[#6E6E75] text-xs uppercase tracking-wider">
                <th className="py-3 px-2 text-center">Titular</th>
                <th className="py-3 px-2">Jugador</th>
                <th className="py-3 px-2 text-center">Minutos</th>
                <th className="py-3 px-2 text-center">Goles</th>
                <th className="py-3 px-2 text-center">Asist.</th>
                <th className="py-3 px-2 text-center">Amarillas</th>
                <th className="py-3 px-2 text-center">Rojas</th>
              </tr>
            </thead>
            <tbody>
              {availablePlayers.map((p: Player) => {
                const s = playerStats[p.id];
                if (!s) return null;
                const isParticipating = s.played || s.starter;
                
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-[#2A2A2E]/50 hover:bg-[#1C1C1F] transition-colors ${!isParticipating ? 'opacity-50 grayscale' : ''}`}
                  >
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={s.starter}
                        onChange={() => toggleStarter(p.id)}
                        className="w-5 h-5 rounded border-[#2A2A2E] text-[#FF4B4B] focus:ring-[#FF4B4B] bg-[#1C1C1F]"
                      />
                    </td>
                    <td className="py-2 px-2 font-semibold text-white">
                      <span className="text-[#6E6E75] mr-2 text-xs">{p.number}</span>
                      {p.name}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number" min="0" max="120" value={s.minutes}
                          onChange={e => updateManualMinutes(p.id, parseInt(e.target.value) || 0)}
                          className={`w-16 bg-[#1C1C1F] border ${s.manualOverride ? 'border-yellow-500/50' : 'border-[#2A2A2E]'} rounded p-1 text-center text-white`}
                        />
                        {s.manualOverride && (
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
                        onChange={e => updatePlayerStat(p.id, 'goals', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number" min="0" value={s.assists}
                        onChange={e => updatePlayerStat(p.id, 'assists', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number" min="0" max="2" value={s.yellow}
                        onChange={e => updatePlayerStat(p.id, 'yellow', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number" min="0" max="1" value={s.red}
                        onChange={e => updatePlayerStat(p.id, 'red', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto"
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
