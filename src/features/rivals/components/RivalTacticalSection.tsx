import React from 'react';
import { Plus, Trash2, AlertTriangle, Shield, Swords, Zap, Flag, Target } from 'lucide-react';
import { KeyRivalPlayer, RivalScoutingReport } from '../../../types';

interface RivalTacticalSectionProps {
  scouting: RivalScoutingReport;
  onChange: (updater: (prev: RivalScoutingReport) => RivalScoutingReport) => void;
}

const FORMATIONS = ['1-4-4-2', '1-4-3-3', '1-4-2-3-1', '1-5-3-2', '1-3-5-2', '1-4-1-4-1', '1-5-4-1', 'Otro'];
const STYLES = [
  'Juego Directo / 2ª Jugada',
  'Combinativo / Asociativo',
  'Transiciones Rápidas (Vertical)',
  'Bloque Bajo + Contraataque',
  'Presión Alta e Intensidad',
  'Mixto / Adaptativo',
];
const BLOCK_HEIGHTS: Array<RivalScoutingReport['defensivePhase']['blockHeight']> = [
  'Bloque Alto (Presión)',
  'Bloque Medio',
  'Bloque Bajo (Repliegue)',
];

export const RivalTacticalSection: React.FC<RivalTacticalSectionProps> = ({ scouting, onChange }) => {
  const addKeyPlayer = () => {
    const newPlayer: KeyRivalPlayer = {
      id: `kp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      number: '', name: '', position: 'DC', foot: 'Diestro', threatLevel: 'Alta', notes: '',
    };
    onChange(prev => ({ ...prev, keyPlayers: [...(prev.keyPlayers || []), newPlayer] }));
  };

  const updateKeyPlayer = (id: string, patch: Partial<KeyRivalPlayer>) => {
    onChange(prev => ({
      ...prev,
      keyPlayers: (prev.keyPlayers || []).map(p => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const removeKeyPlayer = (id: string) => {
    onChange(prev => ({ ...prev, keyPlayers: (prev.keyPlayers || []).filter(p => p.id !== id) }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-lime-400 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Estructura y Modelo de Juego
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Sistema Base</label>
            <select value={scouting.baseFormation} onChange={e => onChange(prev => ({ ...prev, baseFormation: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500">
              {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Sistema Defensivo</label>
            <input type="text" value={scouting.defensiveFormation || ''} onChange={e => onChange(prev => ({ ...prev, defensiveFormation: e.target.value }))} placeholder="Ej. 1-4-4-2 / 1-5-4-1" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500" />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Estilo Predominante</label>
            <select value={scouting.playingStyle} onChange={e => onChange(prev => ({ ...prev, playingStyle: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500">
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
          <h5 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5"><Swords className="w-3.5 h-3.5" /> 1. Fase Ofensiva (Ataque)</h5>
          <textarea rows={2} value={scouting.attackPhase.buildUp} onChange={e => onChange(prev => ({ ...prev, attackPhase: { ...prev.attackPhase, buildUp: e.target.value } }))} placeholder="Salida de balón (¿juegan en corto o buscan directo al punta?)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none" />
          <textarea rows={2} value={scouting.attackPhase.progressionAndFinish} onChange={e => onChange(prev => ({ ...prev, attackPhase: { ...prev.attackPhase, progressionAndFinish: e.target.value } }))} placeholder="Progresión y finalización (bandas, centros laterales, juego interior)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none" />
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> 2. Fase Defensiva</h5>
            <select value={scouting.defensivePhase.blockHeight} onChange={e => onChange(prev => ({ ...prev, defensivePhase: { ...prev.defensivePhase, blockHeight: e.target.value as any } }))} className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-[11px] text-amber-300 focus:outline-none">
              {BLOCK_HEIGHTS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <textarea rows={4} value={scouting.defensivePhase.weaknessesToExploit} onChange={e => onChange(prev => ({ ...prev, defensivePhase: { ...prev.defensivePhase, weaknessesToExploit: e.target.value } }))} placeholder="Debilidades a explotar (espalda de laterales, lentitud centrales, espacios entre líneas)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none" />
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
          <h5 className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> 3. Transiciones</h5>
          <textarea rows={2} value={scouting.transitions.offensiveTransition} onChange={e => onChange(prev => ({ ...prev, transitions: { ...prev.transitions, offensiveTransition: e.target.value } }))} placeholder="Transición Ofensiva (Contraataque rival tras robo)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none" />
          <textarea rows={2} value={scouting.transitions.defensiveTransition} onChange={e => onChange(prev => ({ ...prev, transitions: { ...prev.transitions, defensiveTransition: e.target.value } }))} placeholder="Transición Defensiva (Reacción tras pérdida: ¿presionan o repliegan?)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none" />
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
          <h5 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> 4. Balón Parado (ABP)</h5>
          <textarea rows={2} value={scouting.setPieces.attackingCornersAndFreeKicks} onChange={e => onChange(prev => ({ ...prev, setPieces: { ...prev.setPieces, attackingCornersAndFreeKicks: e.target.value } }))} placeholder="ABP Ofensivo (Lanzadores, rematadores, jugadas ensayadas)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500 resize-none" />
          <textarea rows={2} value={scouting.setPieces.defendingCornersAndFreeKicks} onChange={e => onChange(prev => ({ ...prev, setPieces: { ...prev.setPieces, defendingCornersAndFreeKicks: e.target.value } }))} placeholder="ABP Defensivo (¿Marcaje zonal, individual o mixto? Puntos débiles)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500 resize-none" />
        </div>
      </div>

      <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Jugadores Clave / Amenazas ({scouting.keyPlayers?.length || 0})
          </h4>
          <button type="button" onClick={addKeyPlayer} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors">
            <Plus className="w-3.5 h-3.5" /> Añadir Jugador
          </button>
        </div>
        {(!scouting.keyPlayers || scouting.keyPlayers.length === 0) ? (
          <p className="text-xs text-zinc-500 italic">Sin jugadores clave registrados todavía.</p>
        ) : (
          <div className="space-y-2">
            {scouting.keyPlayers.map(kp => (
              <div key={kp.id} className="grid grid-cols-12 gap-2 items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-2">
                <input type="text" value={kp.number} onChange={e => updateKeyPlayer(kp.id, { number: e.target.value })} placeholder="#" className="col-span-2 sm:col-span-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-center text-white font-bold" />
                <input type="text" value={kp.name} onChange={e => updateKeyPlayer(kp.id, { name: e.target.value })} placeholder="Nombre / Apodo" className="col-span-5 sm:col-span-3 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white" />
                <input type="text" value={kp.position} onChange={e => updateKeyPlayer(kp.id, { position: e.target.value })} placeholder="Pos" className="col-span-2 sm:col-span-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-center text-zinc-300" />
                <select value={kp.foot || 'Diestro'} onChange={e => updateKeyPlayer(kp.id, { foot: e.target.value as any })} className="col-span-3 sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1.5 text-[11px] text-zinc-300">
                  <option value="Diestro">Diestro</option>
                  <option value="Zurdo">Zurdo</option>
                  <option value="Ambidiestro">Ambidiestro</option>
                </select>
                <select value={kp.threatLevel} onChange={e => updateKeyPlayer(kp.id, { threatLevel: e.target.value as any })} className="col-span-4 sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1.5 text-[11px] font-bold text-amber-300">
                  <option value="Alta">🔴 Amenaza Alta</option>
                  <option value="Media">🟡 Amenaza Media</option>
                  <option value="Controlada">🟢 Controlada</option>
                </select>
                <input type="text" value={kp.notes} onChange={e => updateKeyPlayer(kp.id, { notes: e.target.value })} placeholder="Características / Cómo defenderle..." className="col-span-7 sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white" />
                <button type="button" onClick={() => removeKeyPlayer(kp.id)} className="col-span-1 flex justify-center text-zinc-500 hover:text-red-400 transition-colors" title="Eliminar jugador">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-lime-500/5 border border-lime-500/30 rounded-xl p-4 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-lime-400 flex items-center gap-2">
          <Target className="w-4 h-4" /> Plan de Partido y Claves para Ganar
        </h4>
        <textarea rows={3} value={scouting.generalPlanAndKeys} onChange={e => onChange(prev => ({ ...prev, generalPlanAndKeys: e.target.value }))} placeholder="Consignas clave para nuestro equipo (ej. Presionar su perfil zurdo, buscar espalda del lateral derecho, evitar faltas frontales)..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-lime-500 resize-none" />
      </div>
    </div>
  );
};
