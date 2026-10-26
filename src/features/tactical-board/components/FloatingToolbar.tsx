import React, { useState } from 'react';
import {
  Plus, Users, Box, Triangle, Goal, Circle, MousePointer2,
  ArrowRight, MoveRight, TrendingUp, Undo2, Settings,
  Trash2, X, UserPlus, Grid, LayoutDashboard, LayoutPanelTop,
  ChevronLeft, ChevronRight, Minus, Type
} from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import { useBoardManager } from '../controllers/useBoardManager';

const COLORS = [
  '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#14b8a6', '#000000',
];

const CUSTOM_PLAYER_COLORS = [
  { color: '#EF4444', name: 'Rojo' },
  { color: '#3B82F6', name: 'Azul' },
  { color: '#EAB308', name: 'Amarillo' },
  { color: '#10B981', name: 'Verde' },
  { color: '#F97316', name: 'Naranja' },
  { color: '#8B5CF6', name: 'Morado' },
  { color: '#18181B', name: 'Negro' },
  { color: '#F8FAFC', name: 'Blanco' },
];

interface Props {
  manager: ReturnType<typeof useBoardManager>;
  onEditSelection: (id: string) => void;
  onClearBoard: () => void;
}

export function FloatingToolbar({ manager, onEditSelection, onClearBoard }: Props) {
  const { activeTeam } = useTeam();
  const isF7 = activeTeam?.modality === 'F7';
  const {
    boardState,
    addPlayer,
    addToken,
    addFormation,
    handleToolChange,
    handlePathTypeChange,
    handleColorChange,
    undoPath,
    deleteSelectedToken,
    setLaneOverlay,
    arrowMode,
    toggleArrowMode
  } = manager;
  
  const [activeTab, setActiveTab] = useState<'squad' | 'materials' | 'zones'>('materials');
  const [isOpen, setIsOpen] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));

  // Custom player creation form state
  const [customNumber, setCustomNumber] = useState('10');
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#EF4444');

  const MOCK_PLAYERS = activeTeam?.players || [];

  if (!isOpen) {
    return (
      <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-3 bg-[#050505]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-md text-[#888888] hover:text-white transition-colors pointer-events-auto"
          title="Abrir Herramientas"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 flex gap-2 sm:gap-4 pointer-events-none h-[78vh] sm:h-[85vh]">
      
      {/* 1) Columna de Herramientas de Dibujo y Control */}
      <div className="w-14 sm:w-16 shrink-0 flex flex-col gap-2 pointer-events-auto h-full">
        <div className="w-full h-full bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-lg flex flex-col items-center py-3 sm:py-4 gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-2xl">
          <button onClick={() => setIsOpen(false)} className="p-2 mb-1 rounded-lg text-[#888888] hover:text-white hover:bg-[#111111]/80 transition-colors" title="Ocultar Herramientas">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setIsInventoryOpen(!isInventoryOpen)} className={`p-2 mb-1 rounded-lg transition-colors ${isInventoryOpen ? 'bg-[#1A1A1A] text-[#EDEDED]' : 'text-[#888888] hover:text-white hover:bg-[#111111]/80'}`} title={isInventoryOpen ? 'Ocultar Material/Plantilla' : 'Mostrar Material/Plantilla'}>
            <Box className="w-4 h-4" />
          </button>

          {/* Selector / Mover */}
          <button onClick={() => handleToolChange('pointer')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'pointer' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:bg-[#111111]/80 hover:text-white'}`} title="Seleccionar/Mover"><MousePointer2 className="w-4 h-4" /></button>

          {/* Deshacer última flecha */}
          <button
            onClick={undoPath}
            className="p-2.5 rounded-lg transition-colors text-[#888888] hover:bg-[#111111]/80 hover:text-white"
            title="Deshacer Última Flecha (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <div className="w-8 h-px bg-[#1A1A1A] my-1 shrink-0" />

          {/* Selector Recta / Curva */}
          <button
            onClick={toggleArrowMode}
            className={`px-1.5 py-1 rounded text-[9px] font-bold border transition-colors ${
              (arrowMode || 'straight') === 'straight'
                ? 'text-[#888888] border-[#222222] hover:text-white hover:border-[#444444]'
                : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
            }`}
            title={`Modo Flecha: ${(arrowMode || 'straight') === 'straight' ? 'Recta Vectorial (Clic para Curva)' : 'Curva Suave (Clic para Recta)'}`}
          >
            {(arrowMode || 'straight') === 'straight' ? 'RECTA' : 'CURVA'}
          </button>

          {/* Flechas Tácticas */}
          <button onClick={() => handlePathTypeChange('pass')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'pass' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:bg-[#111111]/80 hover:text-white'}`} title="Pase (Continuo)"><ArrowRight className="w-4 h-4" /></button>
          <button onClick={() => handlePathTypeChange('dribble')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'dribble' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:bg-[#111111]/80 hover:text-white'}`} title="Conducción (Ondulada)"><MoveRight className="w-4 h-4" strokeDasharray="2 2" /></button>
          <button onClick={() => handlePathTypeChange('run')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'run' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:bg-[#111111]/80 hover:text-white'}`} title="Desmarque (Discontinua)"><TrendingUp className="w-4 h-4" /></button>
          
          <div className="w-8 h-px bg-[#1A1A1A] my-1 shrink-0" />

          {/* Formas y Zonas */}
          <button onClick={() => handleToolChange('rectangle')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'rectangle' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:bg-[#111111]/80 hover:text-white'}`} title="Zona Rectangular"><Box className="w-4 h-4" /></button>
          <button onClick={() => handleToolChange('circle')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'circle' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:bg-[#111111]/80 hover:text-white'}`} title="Zona Circular"><Circle className="w-4 h-4" /></button>
          <button onClick={() => handleToolChange('polygon')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'polygon' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:bg-[#111111]/80 hover:text-white'}`} title="Polígono Libre"><Triangle className="w-4 h-4" /></button>
          <button onClick={() => handleToolChange('line')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'line' ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:bg-[#111111]/80 hover:text-white'}`} title="Línea Recta"><Minus className="w-4 h-4" /></button>
          <button
            onClick={() => {
              const id = addToken('text', 'Nota táctica en campo');
              onEditSelection(id);
            }}
            className="p-2.5 rounded-lg transition-colors text-[#888888] hover:bg-[#111111]/80 hover:text-yellow-400"
            title="Añadir Cuadro de Texto"
          >
            <Type className="w-4 h-4" />
          </button>
          
          <div className="w-8 h-px bg-[#1A1A1A] my-1 shrink-0" />

          {/* Paleta de Colores para Dibujo */}
          <div className="flex flex-col gap-3 w-full px-2 items-center py-1">
            {COLORS.map(color => (
              <button key={color} onClick={() => handleColorChange(color)} className={`w-5 h-5 shrink-0 rounded-full border-2 transition-transform hover:scale-125 ${boardState.drawingColor === color ? 'border-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>

      {/* 2) Panel de Inventario */}
      {isInventoryOpen && (
      <div className="w-[260px] sm:w-[300px] h-full bg-[#050505]/85 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
        <div className="flex border-b border-[#1F1F1F]/50">
          <button onClick={() => setActiveTab('materials')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'materials' ? 'text-[#EDEDED] bg-[#111111]/80' : 'text-[#888888] hover:text-white hover:bg-[#111111]/40'}`}><Box className="w-4 h-4" /> Material</button>
          <button onClick={() => setActiveTab('squad')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'squad' ? 'text-[#EDEDED] bg-[#111111]/80' : 'text-[#888888] hover:text-white hover:bg-[#111111]/40'}`}><Users className="w-4 h-4" /> Plantilla</button>
          <button onClick={() => setActiveTab('zones')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'zones' ? 'text-[#EDEDED] bg-[#111111]/80' : 'text-[#888888] hover:text-white hover:bg-[#111111]/40'}`}><Grid className="w-4 h-4" /> Zonas</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {activeTab === 'materials' && (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                  {
                    type: 'cone',
                    label: 'Cono',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
                        <polygon points="10,80 50,68 90,80 50,92" fill="#9a3412" stroke="#7c2d12" strokeWidth="3" />
                        <path d="M 24 78 L 44 14 C 46 10, 54 10, 56 14 L 76 78 Q 50 86 24 78 Z" fill="#f97316" stroke="#ea580c" strokeWidth="2" />
                        <path d="M 34 46 Q 50 50 66 46 L 63 36 Q 50 40 37 36 Z" fill="rgba(255,255,255,0.45)" />
                        <ellipse cx="50" cy="14" rx="6" ry="2.5" fill="#7c2d12" />
                      </svg>
                    ),
                  },
                  {
                    type: 'flat-cone',
                    label: 'Chino',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
                        <ellipse cx="50" cy="64" rx="42" ry="20" fill="#c2410c" />
                        <path d="M 8,64 L 28,36 C 34,30 66,30 72,36 L 92,64 C 80,78 20,78 8,64 Z" fill="#f97316" stroke="#fdba74" strokeWidth="2" />
                        <ellipse cx="50" cy="36" rx="18" ry="8" fill="#7c2d12" stroke="#fdba74" strokeWidth="2" />
                        <ellipse cx="50" cy="37" rx="10" ry="4" fill="#09090b" />
                      </svg>
                    ),
                  },
                  {
                    type: 'pole',
                    label: 'Pica',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 40 48" fill="none">
                        <ellipse cx="20" cy="43" rx="10" ry="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                        <rect x="19" y="38" width="2" height="5" fill="#94a3b8" />
                        <rect x="17.5" y="4" width="5" height="35" rx="2.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                        <rect x="17.2" y="3" width="5.6" height="4" rx="1.5" fill="#ef4444" />
                      </svg>
                    ),
                  },
                  {
                    type: 'pole-ground',
                    label: 'Pica Suelo',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 56 24" fill="none">
                        <rect x="5" y="9" width="46" height="6" rx="3" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
                        <rect x="2" y="8" width="6" height="8" rx="2" fill="#ef4444" />
                        <rect x="48" y="8" width="6" height="8" rx="2" fill="#334155" />
                      </svg>
                    ),
                  },
                  {
                    type: 'goal',
                    label: 'Portería',
                    icon: (
                      <svg width="34" height="30" viewBox="0 0 64 44" fill="none">
                        <path d="M 8 36 L 14 10 L 50 10 L 56 36" fill="rgba(255,255,255,0.08)" stroke="#94a3b8" strokeWidth="2" />
                        <line x1="14" y1="18" x2="50" y2="18" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1="11" y1="27" x2="53" y2="27" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1="24" y1="10" x2="22" y2="36" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1="40" y1="10" x2="42" y2="36" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
                        <path d="M 6 38 L 6 14 L 58 14 L 58 38" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ),
                  },
                  {
                    type: 'ladder',
                    label: 'Escalera',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 40 48" fill="none">
                        <rect x="8" y="3" width="3.5" height="42" rx="1" fill="#475569" />
                        <rect x="28.5" y="3" width="3.5" height="42" rx="1" fill="#475569" />
                        {[8, 16, 24, 32, 40].map(y => (
                          <rect key={y} x="9" y={y - 2} width="22" height="3.5" rx="1" fill="#facc15" />
                        ))}
                      </svg>
                    ),
                  },
                  {
                    type: 'ring',
                    label: 'Aro',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                        <circle cx="20" cy="20" r="14" stroke="#2563eb" strokeWidth="5" />
                        <circle cx="20" cy="20" r="14" stroke="#60a5fa" strokeWidth="2.5" />
                      </svg>
                    ),
                  },
                  {
                    type: 'hurdle-high',
                    label: 'V. Alta',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 48 36" fill="none">
                        <path d="M 4 32 L 10 26 L 16 31" stroke="#475569" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 44 32 L 38 26 L 32 31" stroke="#475569" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 10 28 L 10 7 C 10 4.5, 12 3, 15 3 L 33 3 C 36 3, 38 4.5, 38 7 L 38 28" stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="17" y1="3" x2="21" y2="3" stroke="#ffffff" strokeWidth="3.5" />
                        <line x1="27" y1="3" x2="31" y2="3" stroke="#ffffff" strokeWidth="3.5" />
                        <line x1="10" y1="16" x2="38" y2="16" stroke="#e11d48" strokeWidth="2" strokeDasharray="3,2" />
                      </svg>
                    ),
                  },
                  {
                    type: 'hurdle-low',
                    label: 'V. Baja',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 48 36" fill="none">
                        <path d="M 4 30 L 10 25 L 16 29" stroke="#475569" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 44 30 L 38 25 L 32 29" stroke="#475569" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 10 27 L 10 16 C 10 13.5, 12 12, 15 12 L 33 12 C 36 12, 38 13.5, 38 16 L 38 27" stroke="#fb923c" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="19" y1="12" x2="29" y2="12" stroke="#fef08a" strokeWidth="3.5" />
                      </svg>
                    ),
                  },
                  {
                    type: 'dummy',
                    label: 'Silueta',
                    icon: (
                      <svg width="32" height="32" viewBox="0 0 100 110" fill="none">
                        <ellipse cx="50" cy="98" rx="32" ry="7" fill="#334155" />
                        <rect x="37" y="84" width="6" height="13" fill="#64748b" />
                        <rect x="57" y="84" width="6" height="13" fill="#64748b" />
                        <path d="M 28 84 L 24 44 C 24 34, 30 30, 39 29 L 39 25 C 34 23, 33 12, 40 7 C 45 3, 55 3, 60 7 C 67 12, 66 23, 61 25 L 61 29 C 70 30, 76 34, 76 44 L 72 84 Z" fill="#ef4444" stroke="#fca5a5" strokeWidth="3" />
                        <path d="M 33 45 L 67 45 M 35 62 L 65 62 M 50 32 L 50 80" stroke="#fca5a5" strokeWidth="2.5" strokeOpacity="0.6" />
                      </svg>
                    ),
                  },
                  {
                    type: 'ball',
                    label: 'Balón',
                    icon: (
                      <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="44" fill="#f8fafc" stroke="#334155" strokeWidth="4" />
                        <line x1="50" y1="26" x2="50" y2="8" stroke="#334155" strokeWidth="3.5" />
                        <line x1="72" y1="42" x2="90" y2="34" stroke="#334155" strokeWidth="3.5" />
                        <line x1="64" y1="68" x2="77" y2="85" stroke="#334155" strokeWidth="3.5" />
                        <line x1="36" y1="68" x2="23" y2="85" stroke="#334155" strokeWidth="3.5" />
                        <line x1="28" y1="42" x2="10" y2="34" stroke="#334155" strokeWidth="3.5" />
                        <polygon points="50,26 72,42 64,68 36,68 28,42" fill="#0f172a" />
                      </svg>
                    ),
                  },
                  {
                    type: 'medicine-ball',
                    label: 'Med. Ball',
                    icon: (
                      <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="44" fill="#1e293b" stroke="#64748b" strokeWidth="4" />
                        <path d="M 18 24 Q 50 42 82 24" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
                        <path d="M 18 76 Q 50 58 82 76" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
                        <text x="50" y="56" fontFamily="sans-serif" fontSize="22" fontWeight="900" fill="#f8fafc" textAnchor="middle">5K</text>
                      </svg>
                    ),
                  },
                  { type: 'bench', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="8" width="20" height="5" rx="1" /><path d="M5 13v5M19 13v5M5 16h14" /></svg>, label: 'Banco' },
                  { type: 'dumbbell', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5v14M18 5v14M2 8v8M22 8v8M6 12h12" /></svg>, label: 'Mancuerna' },
                  { type: 'text', icon: <Type className="w-7 h-7 text-yellow-400" />, label: 'Cuadro Texto' }
                ].map((item) => (
                <button key={item.type} onClick={() => {
                  const id = addToken(item.type as any);
                  if (item.type === 'text') onEditSelection(id);
                }} className="flex flex-col items-center justify-center gap-3 p-4 bg-[#111111]/60 border border-[#1F1F1F] rounded-md hover:border-[#3A3A3A] hover:bg-[#1A1A1A]/80 transition-all group shadow-sm">
                  <div className="h-10 flex items-center justify-center transition-transform group-hover:scale-105">{item.icon}</div>
                  <span className="text-[11px] font-bold text-[#888888] uppercase tracking-wider group-hover:text-white">{item.label}</span>
                </button>
              ))}
            </div>
          )}
          
          {activeTab === 'squad' && (
            <div className="flex flex-col gap-3">
              {/* Añadir Rápido Predeterminados */}
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-[#888888] uppercase tracking-wider">Añadir Rápido</span>
                <div className="flex gap-2">
                  <button onClick={() => addPlayer('home')} className="w-6 h-6 rounded-full bg-[#ef4444] border-2 border-transparent hover:border-white transition-all shadow-[0_0_10px_rgba(239,68,68,0.3)]" title="Jugador Local (Rojo)" />
                  <button onClick={() => addPlayer('away')} className="w-6 h-6 rounded-full bg-[#3b82f6] border-2 border-transparent hover:border-white transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]" title="Jugador Visitante (Azul)" />
                  <button onClick={() => addPlayer('neutral')} className="w-6 h-6 rounded-full bg-[#eab308] border-2 border-transparent hover:border-white transition-all shadow-[0_0_10px_rgba(234,179,8,0.3)]" title="Jugador Neutral (Amarillo)" />
                </div>
              </div>

              {/* SECCIÓN JUGADOR PERSONALIZADO */}
              <div className="p-3 bg-[#111111]/90 border border-[#222225] rounded-lg flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Jugador Personalizado</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#888888] block mb-1">Dorsal / Sigla</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={customNumber}
                      onChange={(e) => setCustomNumber(e.target.value)}
                      placeholder="Ej: 10"
                      className="w-full bg-[#18181B] border border-[#27272A] rounded px-2 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#888888] block mb-1">Nombre (Opcional)</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ej: Extremo"
                      className="w-full bg-[#18181B] border border-[#27272A] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#888888] block mb-1.5">Color de Ficha</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CUSTOM_PLAYER_COLORS.map((col) => (
                      <button
                        key={col.color}
                        type="button"
                        onClick={() => setCustomColor(col.color)}
                        className={`h-6 rounded border transition-all flex items-center justify-center ${
                          customColor.toLowerCase() === col.color.toLowerCase()
                            ? 'border-white scale-105 shadow-[0_0_6px_rgba(255,255,255,0.5)]'
                            : 'border-transparent opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col.color }}
                        title={col.name}
                      >
                        {customColor.toLowerCase() === col.color.toLowerCase() && (
                          <span className={`w-1.5 h-1.5 rounded-full ${['#F8FAFC', '#EAB308'].includes(col.color) ? 'bg-black' : 'bg-white'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addPlayer(
                      'home',
                      customNumber.trim() || '10',
                      undefined,
                      { x: 50, y: 50 },
                      customColor,
                      customName.trim() || undefined
                    );
                  }}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir al Campo</span>
                </button>
              </div>

              <div className="w-full h-px bg-[#1A1A1A] my-1" />

              <span className="text-xs font-bold text-[#888888] uppercase tracking-wider px-1">Formaciones (11v11)</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-center text-[#ef4444] font-bold">Local</span>
                  <button onClick={() => addFormation('home', '4-4-2')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#ef4444] text-[#888888] hover:text-white transition-all font-mono font-semibold">4-4-2</button>
                  <button onClick={() => addFormation('home', '4-3-3')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#ef4444] text-[#888888] hover:text-white transition-all font-mono font-semibold">4-3-3</button>
                  <button onClick={() => addFormation('home', '3-5-2')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#ef4444] text-[#888888] hover:text-white transition-all font-mono font-semibold">3-5-2</button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-center text-[#3b82f6] font-bold">Visitante</span>
                  <button onClick={() => addFormation('away', '4-4-2')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#3b82f6] text-[#888888] hover:text-white transition-all font-mono font-semibold">4-4-2</button>
                  <button onClick={() => addFormation('away', '4-3-3')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#3b82f6] text-[#888888] hover:text-white transition-all font-mono font-semibold">4-3-3</button>
                  <button onClick={() => addFormation('away', '3-5-2')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#3b82f6] text-[#888888] hover:text-white transition-all font-mono font-semibold">3-5-2</button>
                </div>
              </div>

              <span className="text-xs font-bold text-[#888888] uppercase tracking-wider px-1 mt-1">Formaciones (7v7 - Fútbol 7)</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-center text-[#ef4444] font-bold">Local</span>
                  <button onClick={() => addFormation('home', '1-2-3-1')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#ef4444] text-[#888888] hover:text-white transition-all font-mono font-semibold">1-2-3-1</button>
                  <button onClick={() => addFormation('home', '1-3-2-1')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#ef4444] text-[#888888] hover:text-white transition-all font-mono font-semibold">1-3-2-1</button>
                  <button onClick={() => addFormation('home', '1-3-1-2')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#ef4444] text-[#888888] hover:text-white transition-all font-mono font-semibold">1-3-1-2</button>
                  <button onClick={() => addFormation('home', '1-2-1-2-1')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#ef4444] text-[#888888] hover:text-white transition-all font-mono font-semibold">1-2-1-2-1</button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-center text-[#3b82f6] font-bold">Visitante</span>
                  <button onClick={() => addFormation('away', '1-2-3-1')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#3b82f6] text-[#888888] hover:text-white transition-all font-mono font-semibold">1-2-3-1</button>
                  <button onClick={() => addFormation('away', '1-3-2-1')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#3b82f6] text-[#888888] hover:text-white transition-all font-mono font-semibold">1-3-2-1</button>
                  <button onClick={() => addFormation('away', '1-3-1-2')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#3b82f6] text-[#888888] hover:text-white transition-all font-mono font-semibold">1-3-1-2</button>
                  <button onClick={() => addFormation('away', '1-2-1-2-1')} className="text-xs py-1.5 bg-[#111111]/60 border border-[#1F1F1F] rounded hover:border-[#3b82f6] text-[#888888] hover:text-white transition-all font-mono font-semibold">1-2-1-2-1</button>
                </div>
              </div>

              <div className="w-full h-px bg-[#1A1A1A] my-1" />

              <span className="text-xs font-bold text-[#888888] uppercase tracking-wider px-1">Jugadores de Plantilla</span>
              <div className="flex flex-col gap-1.5">
                {MOCK_PLAYERS.map(player => {
                  const playerColor = (player.color && player.color !== '#3b82f6') ? player.color : '#ef4444';
                  return (
                    <div 
                      key={player.id} 
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ ...player, color: playerColor }));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="flex items-center justify-between p-2.5 bg-[#111111]/60 border border-[#1F1F1F] rounded-md hover:border-[#3A3A3A] group transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-7 h-7 rounded-full bg-[#ef4444] flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                          style={{ backgroundColor: playerColor }}
                        >
                          {player.number}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-white font-bold">{player.name}</span>
                          <span className="text-[10px] font-medium text-[#888888]">{player.positionGroup}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => addPlayer('home', String(player.number), player.id, undefined, playerColor, player.name)} 
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-[#EDEDED] text-[#0A0A0A] rounded hover:bg-[#ef4444] hover:text-white transition-all shadow-sm"
                        title={`Añadir ${player.name} a la pizarra`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'zones' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-[#888888] uppercase tracking-wider px-1">Zonas Tácticas</span>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setLaneOverlay('none')} className={`flex flex-col items-center gap-2 p-4 bg-[#111111]/60 border rounded-md transition-all shadow-sm ${boardState.laneOverlay === 'none' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#1F1F1F] hover:border-[#3A3A3A]'}`}><X className="w-6 h-6 text-[#888888]" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Ninguno</span></button>
                <button onClick={() => setLaneOverlay('thirds')} className={`flex flex-col items-center gap-2 p-4 bg-[#111111]/60 border rounded-md transition-all shadow-sm ${boardState.laneOverlay === 'thirds' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#1F1F1F] hover:border-[#3A3A3A]'}`}><LayoutPanelTop className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Tercios</span></button>
                <button onClick={() => setLaneOverlay('quarters')} className={`flex flex-col items-center gap-2 p-4 bg-[#111111]/60 border rounded-md transition-all shadow-sm ${boardState.laneOverlay === 'quarters' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#1F1F1F] hover:border-[#3A3A3A]'}`}><LayoutPanelTop className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Cuartos</span></button>
                <button onClick={() => setLaneOverlay('5-lanes')} className={`flex flex-col items-center gap-2 p-4 bg-[#111111]/60 border rounded-md transition-all shadow-sm ${boardState.laneOverlay === '5-lanes' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#1F1F1F] hover:border-[#3A3A3A]'}`}><LayoutDashboard className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">5 Carriles</span></button>
                <button onClick={() => setLaneOverlay('position-play')} className={`flex flex-col items-center gap-2 p-4 bg-[#111111]/60 border rounded-md transition-all shadow-sm ${boardState.laneOverlay === 'position-play' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#1F1F1F] hover:border-[#3A3A3A]'}`}><Grid className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Posición</span></button>
                <button onClick={() => setLaneOverlay('zone-14')} className={`flex flex-col items-center gap-2 p-4 bg-[#111111]/60 border rounded-md transition-all shadow-sm ${boardState.laneOverlay === 'zone-14' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#1F1F1F] hover:border-[#3A3A3A]'}`}><Goal className="w-6 h-6 text-emerald-400" /><span className="text-[11px] font-bold text-white uppercase tracking-wider text-center mt-1">Zona 14</span></button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
