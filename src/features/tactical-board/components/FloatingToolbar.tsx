import React, { useState } from 'react';
import { Plus, Users, Box, Triangle, AlignCenterVertical, Goal, Activity, Circle, MousePointer2, ArrowRight, MoveRight, TrendingUp, Undo, Settings, Trash2, X, UserPlus, Grid, LayoutDashboard, LayoutPanelTop, ChevronLeft, ChevronRight, Minus } from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import { useBoardManager } from '../controllers/useBoardManager';

const COLORS = [
  '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#14b8a6', '#000000',
];

interface Props {
  manager: ReturnType<typeof useBoardManager>;
  onEditSelection: (id: string) => void;
  onClearBoard: () => void;
}

export function FloatingToolbar({ manager, onEditSelection, onClearBoard }: Props) {
  const { activeTeam } = useTeam();
  const isF7 = activeTeam?.modality === 'F7';
  const { boardState, addPlayer, addToken, addFormation, handleToolChange, handlePathTypeChange, handleColorChange, undoPath, deleteSelectedToken, setLaneOverlay } = manager;
  
  const [activeTab, setActiveTab] = useState<'squad' | 'materials' | 'zones'>('materials');
  const [isOpen, setIsOpen] = useState(true);

  const MOCK_PLAYERS = activeTeam?.players || [];

  if (!isOpen) {
    return (
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-3 bg-[#0A0A0C]/70 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl text-[#6E6E75] hover:text-white transition-colors pointer-events-auto"
          title="Abrir Herramientas"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex gap-4 pointer-events-none h-[85vh]">
      
      {/* 1) Columna de Herramientas de Dibujo y Control */}
      <div className="w-16 shrink-0 flex flex-col gap-2 pointer-events-auto h-full">
        <div className="w-full h-full bg-[#0A0A0C]/70 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col items-center py-4 gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-2xl">
          <button onClick={() => setIsOpen(false)} className="p-2 mb-2 rounded-lg text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F]/80 transition-colors" title="Ocultar Panel">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button onClick={() => handleToolChange('pointer')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'pointer' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F]/80 hover:text-white'}`} title="Seleccionar/Mover"><MousePointer2 className="w-4 h-4" /></button>
          <div className="w-8 h-px bg-[#2A2A2E] my-1 shrink-0" />
          <button onClick={() => handlePathTypeChange('pass')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'pass' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F]/80 hover:text-white'}`} title="Pase (Continuo)"><ArrowRight className="w-4 h-4" /></button>
          <button onClick={() => handlePathTypeChange('dribble')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'dribble' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F]/80 hover:text-white'}`} title="ConducciÃ³n (Ondulada)"><MoveRight className="w-4 h-4" strokeDasharray="2 2" /></button>
          <button onClick={() => handlePathTypeChange('run')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'run' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F]/80 hover:text-white'}`} title="Desmarque (Discontinua)"><TrendingUp className="w-4 h-4" /></button>
          
          <div className="w-8 h-px bg-[#2A2A2E] my-1 shrink-0" />
          <button onClick={() => handleToolChange('rectangle')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'rectangle' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F]/80 hover:text-white'}`} title="Zona Rectangular"><Box className="w-4 h-4" /></button>
          <button onClick={() => handleToolChange('circle')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'circle' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F]/80 hover:text-white'}`} title="Zona Circular"><Circle className="w-4 h-4" /></button>
          <button onClick={() => handleToolChange('polygon')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'polygon' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F]/80 hover:text-white'}`} title="PolÃ­gono Libre"><Triangle className="w-4 h-4" /></button>
          <button onClick={() => handleToolChange('line')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'line' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F]/80 hover:text-white'}`} title="LÃ­nea Recta"><Minus className="w-4 h-4" /></button>
          
          <div className="w-8 h-px bg-[#2A2A2E] my-1 shrink-0" />
          <div className="flex flex-col gap-3 w-full px-2 items-center py-1">
            {COLORS.map(color => (
              <button key={color} onClick={() => handleColorChange(color)} className={`w-5 h-5 shrink-0 rounded-full border-2 transition-transform hover:scale-125 ${boardState.drawingColor === color ? 'border-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>

      {/* 2) Panel de Inventario */}
      <div className="w-[280px] h-full bg-[#0A0A0C]/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
        <div className="flex border-b border-[#2A2A2E]/50">
          <button onClick={() => setActiveTab('materials')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'materials' ? 'text-[#FF4B4B] bg-[#1C1C1F]/80' : 'text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F]/40'}`}><Box className="w-4 h-4" /> Material</button>
          <button onClick={() => setActiveTab('squad')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'squad' ? 'text-[#FF4B4B] bg-[#1C1C1F]/80' : 'text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F]/40'}`}><Users className="w-4 h-4" /> Plantilla</button>
          <button onClick={() => setActiveTab('zones')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'zones' ? 'text-[#FF4B4B] bg-[#1C1C1F]/80' : 'text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F]/40'}`}><Grid className="w-4 h-4" /> Zonas</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {activeTab === 'materials' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                  { type: 'cone', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF4B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 22h20L12 2z"/></svg>, label: 'Cono' },
                  { type: 'flat-cone', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="18" rx="10" ry="4"/><path d="M7 15l5-10 5 10"/></svg>, label: 'Chino' },
                  { type: 'pole', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><ellipse cx="12" cy="22" rx="4" ry="2"/></svg>, label: 'Pica' },
                  { type: 'pole-ground', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/></svg>, label: 'Pica Suelo' },
                  { type: 'goal', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V6c0-2 2-4 4-4h8c2 0 4 2 4 4v16"/><path d="M4 10h16"/></svg>, label: 'Portería' },
                  { type: 'ladder', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v20M18 2v20M6 6h12M6 12h12M6 18h12"/></svg>, label: 'Escalera' },
                  { type: 'ring', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>, label: 'Aro' },
                  { type: 'hurdle-high', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V8c0-2 2-4 4-4h8c2 0 4 2 4 4v14"/></svg>, label: 'V. Alta' },
                  { type: 'hurdle-low', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22v-6c0-2 2-4 4-4h8c2 0 4 2 4 4v6"/></svg>, label: 'V. Baja' },
                  { type: 'dummy', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><path d="M16 22v-9c0-2-1-4-4-4s-4 2-4 4v9" /></svg>, label: 'Silueta' },
                  { type: 'ball', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6"/></svg>, label: 'Balón' },
                  { type: 'medicine-ball', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>, label: 'Med. Ball' }
                ].map((item) => (
                <button key={item.type} onClick={() => { addToken(item.type as any); }} className="flex flex-col items-center justify-center gap-3 p-4 bg-[#1C1C1F]/60 border border-[#2A2A2E] rounded-xl hover:border-[#FF4B4B] hover:bg-[#2A2A2E]/80 transition-all group shadow-sm">
                  <div className="h-10 flex items-center justify-center group-hover:scale-110 transition-transform">{item.icon}</div>
                  <span className="text-[11px] font-bold text-[#6E6E75] uppercase tracking-wider group-hover:text-white">{item.label}</span>
                </button>
              ))}
            </div>
          )}
          
          {activeTab === 'squad' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider">AÃ±adir RÃ¡pido</span>
                <div className="flex gap-2">
                  <button onClick={() => addPlayer('home')} className="w-6 h-6 rounded-full bg-[#ef4444] border-2 border-transparent hover:border-white transition-all shadow-[0_0_10px_rgba(239,68,68,0.3)]" title="Jugador Local" />
                  <button onClick={() => addPlayer('away')} className="w-6 h-6 rounded-full bg-[#3b82f6] border-2 border-transparent hover:border-white transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]" title="Jugador Visitante" />
                  <button onClick={() => addPlayer('neutral')} className="w-6 h-6 rounded-full bg-white border-2 border-transparent hover:border-[#FF4B4B] transition-all shadow-[0_0_10px_rgba(255,255,255,0.2)]" title="Jugador Neutral" />
                </div>
              </div>
              <div className="w-full h-px bg-[#2A2A2E] mb-2" />
              <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider px-1">{isF7 ? 'Formaciones (F7)' : 'Formaciones (11v11)'}</span>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-center text-[#f43f5e] font-bold">Local</span>
                  <button onClick={() => addFormation('home', isF7 ? '2-3-1' : '4-4-2')} className="text-xs py-1.5 bg-[#1C1C1F]/60 border border-[#2A2A2E] rounded hover:border-[#f43f5e] text-[#6E6E75] hover:text-white transition-all">{isF7 ? '2-3-1' : '4-4-2'}</button>
                  <button onClick={() => addFormation('home', isF7 ? '3-2-1' : '4-3-3')} className="text-xs py-1.5 bg-[#1C1C1F]/60 border border-[#2A2A2E] rounded hover:border-[#f43f5e] text-[#6E6E75] hover:text-white transition-all">{isF7 ? '3-2-1' : '4-3-3'}</button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-center text-[#3b82f6] font-bold">Visitante</span>
                  <button onClick={() => addFormation('away', isF7 ? '2-3-1' : '4-4-2')} className="text-xs py-1.5 bg-[#1C1C1F]/60 border border-[#2A2A2E] rounded hover:border-[#3b82f6] text-[#6E6E75] hover:text-white transition-all">{isF7 ? '2-3-1' : '4-4-2'}</button>
                  <button onClick={() => addFormation('away', isF7 ? '3-2-1' : '4-3-3')} className="text-xs py-1.5 bg-[#1C1C1F]/60 border border-[#2A2A2E] rounded hover:border-[#3b82f6] text-[#6E6E75] hover:text-white transition-all">{isF7 ? '3-2-1' : '4-3-3'}</button>
                </div>
              </div>
              <div className="w-full h-px bg-[#2A2A2E] mb-2" />
              <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider px-1">Jugadores</span>
              {MOCK_PLAYERS.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-[#1C1C1F]/60 border border-[#2A2A2E] rounded-xl hover:border-[#FF4B4B] group transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center font-bold text-xs text-white shadow-sm">{player.number}</div>
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-bold">{player.name}</span>
                      <span className="text-[11px] font-medium text-[#6E6E75]">{player.positionGroup}</span>
                    </div>
                  </div>
                  <button onClick={() => addPlayer('home', String(player.number), player.id, undefined, player.color, player.name)} className="opacity-0 group-hover:opacity-100 p-2 bg-[#FF4B4B] text-black rounded-lg hover:bg-[#E63939] transition-all"><UserPlus className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'zones' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider px-1">Zonas TÃ¡cticas</span>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setLaneOverlay('none')} className={`flex flex-col items-center gap-2 p-4 bg-[#1C1C1F]/60 border rounded-xl transition-all shadow-sm ${boardState.laneOverlay === 'none' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2A2A2E] hover:border-[#FF4B4B]'}`}><X className="w-6 h-6 text-[#6E6E75]" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Ninguno</span></button>
                <button onClick={() => setLaneOverlay('thirds')} className={`flex flex-col items-center gap-2 p-4 bg-[#1C1C1F]/60 border rounded-xl transition-all shadow-sm ${boardState.laneOverlay === 'thirds' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2A2A2E] hover:border-[#FF4B4B]'}`}><LayoutPanelTop className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Tercios</span></button>
                <button onClick={() => setLaneOverlay('quarters')} className={`flex flex-col items-center gap-2 p-4 bg-[#1C1C1F]/60 border rounded-xl transition-all shadow-sm ${boardState.laneOverlay === 'quarters' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2A2A2E] hover:border-[#FF4B4B]'}`}><LayoutPanelTop className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Cuartos</span></button>
                <button onClick={() => setLaneOverlay('5-lanes')} className={`flex flex-col items-center gap-2 p-4 bg-[#1C1C1F]/60 border rounded-xl transition-all shadow-sm ${boardState.laneOverlay === '5-lanes' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2A2A2E] hover:border-[#FF4B4B]'}`}><LayoutDashboard className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">5 Carriles</span></button>
                <button onClick={() => setLaneOverlay('position-play')} className={`flex flex-col items-center gap-2 p-4 bg-[#1C1C1F]/60 border rounded-xl transition-all shadow-sm ${boardState.laneOverlay === 'position-play' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2A2A2E] hover:border-[#FF4B4B]'}`}><Grid className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">PosiciÃ³n</span></button>
                <button onClick={() => setLaneOverlay('zone-14')} className={`flex flex-col items-center gap-2 p-4 bg-[#1C1C1F]/60 border rounded-xl transition-all shadow-sm ${boardState.laneOverlay === 'zone-14' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2A2A2E] hover:border-[#FF4B4B]'}`}><Goal className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Zona 14</span></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

