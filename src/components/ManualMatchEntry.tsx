import React, { useState } from 'react';
import { Player, MatchRecord, MatchEvent } from '../types';
import { Save, X, Calendar, MapPin, Trophy, Shield, Clock } from 'lucide-react';
import { db } from '../services/db';

interface ManualMatchEntryProps {
  activeTeam: any;
  upcomingMatch?: any;
  onComplete: () => void;
  onCancel: () => void;
}

export function ManualMatchEntry({ activeTeam, upcomingMatch, onComplete, onCancel }: ManualMatchEntryProps) {
  const [date, setDate] = useState(upcomingMatch?.date || new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState(upcomingMatch?.opponent || upcomingMatch?.matchDetails?.opponent || '');
  const [matchType, setMatchType] = useState<'Liga'|'Amistoso'|'Copa'|'Torneo'>(upcomingMatch?.matchDetails?.competition || 'Amistoso');
  const [condition, setCondition] = useState<'Local'|'Visitante'>(upcomingMatch?.location === 'home' || upcomingMatch?.matchDetails?.isHome ? 'Local' : 'Visitante');
  const [myTeamName, setMyTeamName] = useState(activeTeam.name);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [matchDuration, setMatchDuration] = useState<number>(90);

  const initialSquadIds = upcomingMatch?.calledUpPlayers || [];
  
  const availablePlayers = (activeTeam.players || []).filter((p: Player) => p.isActive !== false);

  const [playerStats, setPlayerStats] = useState<Record<string, { played: boolean, minutes: number, goals: number, assists: number, yellow: number, red: number }>>(() => {
    const stats: Record<string, any> = {};
    availablePlayers.forEach((p: Player) => {
      const inSquad = initialSquadIds.includes(p.id);
      stats[p.id] = {
        played: inSquad,
        minutes: inSquad ? 90 : 0,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0
      };
    });
    return stats;
  });

  const updatePlayerStat = (playerId: string, field: string, value: any) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value }
    }));
  };

  const handleSave = async () => {
    if (!opponent.trim()) return alert('El nombre del rival es obligatorio');

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
    
    const squadIds = Object.keys(playerStats).filter(id => playerStats[id].played);
    const squad = availablePlayers.filter((p: Player) => squadIds.includes(p.id));

    squadIds.forEach(id => {
      const stats = playerStats[id];
      for (let i = 0; i < stats.goals; i++) addEvent('goal', id);
      for (let i = 0; i < stats.assists; i++) addEvent('assist', id);
      for (let i = 0; i < stats.yellow; i++) addEvent('yellow', id);
      for (let i = 0; i < stats.red; i++) addEvent('red', id);
      
      if (stats.played && stats.minutes < matchDuration && stats.minutes > 0) {
        events.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'sub',
          time: stats.minutes * 60,
          playerId: id,
          playerInId: ''
        });
      }
    });

    const matchId = Math.random().toString(36).substring(2, 9);
    
    const newMatch: MatchRecord = {
      id: matchId,
      teamId: activeTeam.id,
      date,
      score,
      events,
      duration: matchDuration * 60,
      squad,
      bench: [],
      opponent,
      matchType,
      matchResult,
      myTeamName,
      condition,
      myScore,
      rivalScore,
      notes: 'Partido añadido manualmente.'
    };

    await db.saveMatch(newMatch);

    if (upcomingMatch?.date) {
      let plan = await db.getSeasonPlan();
      if (!plan || Object.keys(plan).length === 0) {
        const local = localStorage.getItem('am_manager_season_plan');
        if (local) plan = JSON.parse(local);
      }
      if (plan && plan[upcomingMatch.date]) {
        plan[upcomingMatch.date].completed = true;
        plan[upcomingMatch.date].matchId = matchId;
        plan[upcomingMatch.date].score = `${score.home} - ${score.away}`;
        localStorage.setItem('am_manager_season_plan', JSON.stringify(plan));
        await db.saveSeasonPlan(plan);
      }
    }

    onComplete();
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full pb-20 gap-6 animate-in slide-in-from-bottom-4">
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
            className="bg-[#FF4B4B] text-black font-bold py-3 px-6 rounded-xl hover:bg-[#FF4B4B]/90 transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Guardar Partido
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4">Datos del Partido</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#6E6E75] mb-1">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-xs text-[#6E6E75] mb-1">Equipo Rival</label>
              <input type="text" value={opponent} onChange={e => setOpponent(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#6E6E75] mb-1">Condición</label>
                <select value={condition} onChange={e => setCondition(e.target.value as 'Local'|'Visitante')} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white">
                  <option value="Local">Local</option>
                  <option value="Visitante">Visitante</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#6E6E75] mb-1">Competición</label>
                <select value={matchType} onChange={e => setMatchType(e.target.value as any)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 text-white">
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
              <input type="number" min="0" value={homeScore} onChange={e => setHomeScore(parseInt(e.target.value)||0)} className="w-20 h-24 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl text-5xl font-black text-center text-white" />
            </div>
            <span className="text-[#2A2A2E] text-4xl font-black">-</span>
            <div className="flex flex-col items-center">
              <span className="text-[#6E6E75] text-xs font-bold uppercase mb-2 truncate w-24 text-center">
                {condition === 'Visitante' ? myTeamName : opponent}
              </span>
              <input type="number" min="0" value={awayScore} onChange={e => setAwayScore(parseInt(e.target.value)||0)} className="w-20 h-24 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl text-5xl font-black text-center text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 overflow-hidden">
        <h2 className="font-bold text-white mb-4">Estadísticas Individuales</h2>
        <div className="overflow-x-auto custom-scrollbar pb-4">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#2A2A2E] text-[#6E6E75] text-xs uppercase tracking-wider">
                <th className="py-3 px-2">Jugó</th>
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
                return (
                  <tr key={p.id} className={`border-b border-[#2A2A2E]/50 hover:bg-[#1C1C1F] transition-colors ${!s.played ? 'opacity-50 grayscale' : ''}`}>
                    <td className="py-2 px-2">
                      <input 
                        type="checkbox" 
                        checked={s.played} 
                        onChange={e => {
                          const played = e.target.checked;
                          updatePlayerStat(p.id, 'played', played);
                          if (played && s.minutes === 0) updatePlayerStat(p.id, 'minutes', matchDuration);
                        }}
                        className="w-5 h-5 rounded border-[#2A2A2E] text-[#FF4B4B] focus:ring-[#FF4B4B] bg-[#1C1C1F]"
                      />
                    </td>
                    <td className="py-2 px-2 font-semibold text-white">
                      <span className="text-[#6E6E75] mr-2 text-xs">{p.number}</span>
                      {p.name}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input type="number" min="0" max="120" value={s.minutes} onChange={e => updatePlayerStat(p.id, 'minutes', parseInt(e.target.value)||0)} disabled={!s.played} className="w-16 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto disabled:opacity-50" />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input type="number" min="0" value={s.goals} onChange={e => updatePlayerStat(p.id, 'goals', parseInt(e.target.value)||0)} disabled={!s.played} className="w-12 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto disabled:opacity-50" />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input type="number" min="0" value={s.assists} onChange={e => updatePlayerStat(p.id, 'assists', parseInt(e.target.value)||0)} disabled={!s.played} className="w-12 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto disabled:opacity-50" />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input type="number" min="0" max="2" value={s.yellow} onChange={e => updatePlayerStat(p.id, 'yellow', parseInt(e.target.value)||0)} disabled={!s.played} className="w-12 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto disabled:opacity-50" />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input type="number" min="0" max="1" value={s.red} onChange={e => updatePlayerStat(p.id, 'red', parseInt(e.target.value)||0)} disabled={!s.played} className="w-12 bg-[#1C1C1F] border border-[#2A2A2E] rounded p-1 text-center text-white mx-auto disabled:opacity-50" />
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
