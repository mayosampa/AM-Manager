import React, { useState } from 'react';
import {
  Plus, Users, Box, Triangle, Goal, Circle, MousePointer2,
  ArrowRight, MoveRight, TrendingUp,
  X, UserPlus, Grid, LayoutDashboard, LayoutPanelTop,
  Minus, Type, Film, Play, Pause, Video, Loader2, Spline, ChevronUp
} from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import { useBoardManager } from '../controllers/useBoardManager';
import { FloatingTimeline } from './FloatingTimeline';
import { SavedScene } from '../../../types';

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

const MATERIAL_ITEMS = [
  {
    type: 'cone',
    label: 'Cono',
    icon: (
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
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
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
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
      <svg width="28" height="28" viewBox="0 0 40 48" fill="none">
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
      <svg width="28" height="28" viewBox="0 0 56 24" fill="none">
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
      <svg width="30" height="26" viewBox="0 0 64 44" fill="none">
        <path d="M 8 36 L 14 10 L 50 10 L 56 36" fill="rgba(15,23,42,0.06)" stroke="#94a3b8" strokeWidth="2" />
        <line x1="14" y1="18" x2="50" y2="18" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="11" y1="27" x2="53" y2="27" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="24" y1="10" x2="22" y2="36" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="40" y1="10" x2="42" y2="36" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" />
        <path d="M 6 38 L 6 14 L 58 14 L 58 38" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: 'ladder',
    label: 'Escalera',
    icon: (
      <svg width="28" height="28" viewBox="0 0 40 48" fill="none">
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
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="14" stroke="#2563eb" strokeWidth="5" />
        <circle cx="20" cy="20" r="14" stroke="#60a5fa" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    type: 'hurdle-high',
    label: 'V. Alta',
    icon: (
      <svg width="28" height="28" viewBox="0 0 48 36" fill="none">
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
      <svg width="28" height="28" viewBox="0 0 48 36" fill="none">
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
      <svg width="28" height="28" viewBox="0 0 100 110" fill="none">
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
      <svg width="26" height="26" viewBox="0 0 100 100" fill="none">
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
      <svg width="26" height="26" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="44" fill="#1e293b" stroke="#64748b" strokeWidth="4" />
        <path d="M 18 24 Q 50 42 82 24" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
        <path d="M 18 76 Q 50 58 82 76" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
        <text x="50" y="56" fontFamily="sans-serif" fontSize="22" fontWeight="900" fill="#f8fafc" textAnchor="middle">5K</text>
      </svg>
    ),
  },
  {
    type: 'bench',
    label: 'Banco',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="8" width="20" height="5" rx="1" />
        <path d="M5 13v5M19 13v5M5 16h14" />
      </svg>
    ),
  },
  {
    type: 'dumbbell',
    label: 'Mancuerna',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5v14M18 5v14M2 8v8M22 8v8M6 12h12" />
      </svg>
    ),
  },
  {
    type: 'text',
    label: 'Cuadro Texto',
    icon: <Type className="w-6 h-6 text-amber-600" />,
  },
] as const;

const ZONE_OVERLAYS = [
  { id: 'none', label: 'Sin Zonas', icon: X },
  { id: 'thirds', label: 'Tercios', icon: LayoutPanelTop },
  { id: 'quarters', label: 'Cuartos', icon: LayoutPanelTop },
  { id: '5-lanes', label: '5 Carriles', icon: LayoutDashboard },
  { id: 'position-play', label: 'Posición', icon: Grid },
  { id: 'zone-14', label: 'Zona 14', icon: Goal },
] as const;

interface Props {
  manager: ReturnType<typeof useBoardManager>;
  onEditSelection: (id: string) => void;
  savedScenes: SavedScene[];
  saveScene: (title: string) => void;
  loadScene: (sceneOrId: SavedScene | string) => void;
  deleteScene?: (id: string) => void;
  playAnimation?: () => void;
  isPlaying?: boolean;
  onExportVideo?: () => Promise<void>;
  videoExportProgress?: number | null;
}

export function FloatingToolbar({
  manager,
  onEditSelection,
  savedScenes,
  saveScene,
  loadScene,
  deleteScene,
  playAnimation,
  isPlaying,
  onExportVideo,
  videoExportProgress,
}: Props) {
  const { activeTeam } = useTeam();
  const {
    boardState,
    addPlayer,
    addToken,
    addFormation,
    handleToolChange,
    handlePathTypeChange,
    handleColorChange,
    setLaneOverlay,
    arrowMode,
    setArrowMode,
    toggleArrowMode,
  } = manager;

  const [activeDrawer, setActiveDrawer] = useState<'material' | 'squad' | 'timeline' | null>(null);

  // Custom player creation form state
  const [customNumber, setCustomNumber] = useState('10');
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#EF4444');

  const MOCK_PLAYERS = activeTeam?.players || [];
  const isRecording = videoExportProgress !== null && videoExportProgress !== undefined;
  const canAnimate = savedScenes.length >= 2;
  const isCurveMode = (arrowMode || 'straight') === 'curve';

  const toggleDrawer = (drawer: 'material' | 'squad' | 'timeline') => {
    setActiveDrawer(prev => (prev === drawer ? null : drawer));
  };

  return (
    <>
      {/* BANDEJAS DESPLEGABLES BAJO DEMANDA (ancladas justo encima de la barra inferior h-14) */}
      {activeDrawer !== null && (
        <div className="absolute bottom-14 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-[720px] md:w-[860px] z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg max-h-[42vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Cabecera de la bandeja */}
          <div className="h-9 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              {activeDrawer === 'material' && (
                <>
                  <Box className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Material de Entrenamiento y Zonas Tácticas</span>
                  <span className="text-[10px] font-normal text-slate-500 normal-case hidden sm:inline">
                    (Haz clic o arrastra al césped)
                  </span>
                </>
              )}
              {activeDrawer === 'squad' && (
                <>
                  <Users className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Plantilla, Jugador Personalizado y Formaciones</span>
                </>
              )}
              {activeDrawer === 'timeline' && (
                <>
                  <Film className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Línea de Tiempo y Animación ({savedScenes.length})</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar bandeja"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cuerpo con scroll de la bandeja activa */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {activeDrawer === 'material' && (
              <div className="p-3.5 space-y-3.5">
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                  {MATERIAL_ITEMS.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ tokenType: item.type }));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => {
                        const id = addToken(item.type as any);
                        if (item.type === 'text') {
                          onEditSelection(id);
                          setActiveDrawer(null);
                        }
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-700 hover:text-slate-900 transition-all group shadow-xs cursor-pointer"
                    >
                      <div className="h-8 flex items-center justify-center transition-transform group-hover:scale-105">
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide group-hover:text-slate-900 text-center leading-tight">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Zonas Tácticas sobre el césped */}
                <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Zonas Tácticas de Campo:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ZONE_OVERLAYS.map(({ id, label, icon: IconComp }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLaneOverlay(id as any)}
                        className={`h-7 px-2.5 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          boardState.laneOverlay === id
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 hover:border-emerald-300 text-slate-700'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5 text-[#059669]" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDrawer === 'squad' && (
              <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Columna 1: Añadir rápido + Jugador Personalizado */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Ficha Rápida</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addPlayer('home')}
                        className="px-2 py-1 rounded bg-[#ef4444] text-white text-[10px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                        title="Añadir Jugador Local (Rojo)"
                      >
                        + Local
                      </button>
                      <button
                        type="button"
                        onClick={() => addPlayer('away')}
                        className="px-2 py-1 rounded bg-[#3b82f6] text-white text-[10px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                        title="Añadir Jugador Visitante (Azul)"
                      >
                        + Rival
                      </button>
                      <button
                        type="button"
                        onClick={() => addPlayer('neutral')}
                        className="px-2 py-1 rounded bg-[#eab308] text-slate-900 text-[10px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                        title="Añadir Comodín (Amarillo)"
                      >
                        + Comodín
                      </button>
                    </div>
                  </div>

                  {/* Jugador Personalizado */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Jugador Personalizado</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        maxLength={3}
                        value={customNumber}
                        onChange={(e) => setCustomNumber(e.target.value)}
                        placeholder="Dorsal (10)"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-[#059669]"
                      />
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Nombre / Rol"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
                      />
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {CUSTOM_PLAYER_COLORS.map((col) => (
                        <button
                          key={col.color}
                          type="button"
                          onClick={() => setCustomColor(col.color)}
                          className={`h-5 rounded border transition-all flex items-center justify-center cursor-pointer ${
                            customColor.toLowerCase() === col.color.toLowerCase()
                              ? 'border-slate-900 ring-2 ring-[#059669]'
                              : 'border-slate-300'
                          }`}
                          style={{ backgroundColor: col.color }}
                          title={col.name}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        addPlayer(
                          'home',
                          customNumber.trim() || '10',
                          undefined,
                          { x: 50, y: 50 },
                          customColor,
                          customName.trim() || undefined
                        )
                      }
                      className="w-full py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir al Campo</span>
                    </button>
                  </div>
                </div>

                {/* Columna 2: Formaciones F11 & F7 + Zonas */}
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Formaciones F11 (11v11)
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#ef4444] block text-center">Local</span>
                        <div className="grid grid-cols-3 gap-1">
                          {(['4-4-2', '4-3-3', '3-5-2'] as const).map(f => (
                            <button
                              key={`h-${f}`}
                              type="button"
                              onClick={() => addFormation('home', f)}
                              className="py-1 bg-white border border-slate-200 rounded hover:border-[#ef4444] text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#3b82f6] block text-center">Visitante</span>
                        <div className="grid grid-cols-3 gap-1">
                          {(['4-4-2', '4-3-3', '3-5-2'] as const).map(f => (
                            <button
                              key={`a-${f}`}
                              type="button"
                              onClick={() => addFormation('away', f)}
                              className="py-1 bg-white border border-slate-200 rounded hover:border-[#3b82f6] text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block pt-1">
                      Formaciones F7 (7v7)
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="grid grid-cols-2 gap-1">
                        {(['1-2-3-1', '1-3-2-1', '1-3-1-2', '1-2-1-2-1'] as const).map(f => (
                          <button
                            key={`hf7-${f}`}
                            type="button"
                            onClick={() => addFormation('home', f)}
                            className="py-1 bg-white border border-slate-200 rounded hover:border-[#ef4444] text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                          >
                            L {f}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {(['1-2-3-1', '1-3-2-1', '1-3-1-2', '1-2-1-2-1'] as const).map(f => (
                          <button
                            key={`af7-${f}`}
                            type="button"
                            onClick={() => addFormation('away', f)}
                            className="py-1 bg-white border border-slate-200 rounded hover:border-[#3b82f6] text-[10px] font-mono font-bold text-slate-700 cursor-pointer"
                          >
                            V {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna 3: Jugadores de la Plantilla Activa */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col max-h-[240px]">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 shrink-0">
                    Jugadores de Plantilla ({MOCK_PLAYERS.length})
                  </span>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {MOCK_PLAYERS.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        No hay jugadores registrados en la plantilla activa.
                      </p>
                    ) : (
                      MOCK_PLAYERS.map(player => {
                        const playerColor = player.color && player.color !== '#3b82f6' ? player.color : '#ef4444';
                        return (
                          <div
                            key={player.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/json', JSON.stringify({ ...player, color: playerColor }));
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onClick={() =>
                              addPlayer('home', String(player.number), player.id, undefined, playerColor, player.name)
                            }
                            className="flex items-center justify-between px-2 py-1.5 bg-white border border-slate-200 rounded-md hover:border-emerald-400 group transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                                style={{ backgroundColor: playerColor }}
                              >
                                {player.number}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-slate-900 font-semibold truncate">{player.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{player.positionGroup}</p>
                              </div>
                            </div>
                            <span className="p-1 rounded bg-emerald-50 text-[#059669] group-hover:bg-[#059669] group-hover:text-white transition-colors shrink-0">
                              <Plus className="w-3 h-3" />
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDrawer === 'timeline' && (
              <FloatingTimeline
                savedScenes={savedScenes}
                saveScene={saveScene}
                loadScene={loadScene}
                deleteScene={deleteScene}
                playAnimation={playAnimation}
                isPlaying={isPlaying}
                onExportVideo={onExportVideo}
                videoExportProgress={videoExportProgress}
              />
            )}
          </div>
        </div>
      )}

      {/* FRANJA 3 — BARRA INFERIOR ÚNICA DE HERRAMIENTAS (Estilo TacticalPad / bcoach) */}
      <footer className="h-14 shrink-0 bg-white border-t border-slate-200 px-3 flex items-center justify-between gap-2 z-30 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {/* GRUPO IZQUIERDO: Dibujo Directo a 1 Toque + Colores */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Selección / Mover */}
          <button
            type="button"
            onClick={() => handleToolChange('pointer')}
            className={`h-9 px-2.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              boardState.currentTool === 'pointer'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Seleccionar y Mover Fichas"
          >
            <MousePointer2 className="w-4 h-4" />
            <span className="hidden xl:inline">Selección</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-0.5 shrink-0" />

          {/* Flecha Recta (Pase) */}
          <button
            type="button"
            onClick={() => {
              setArrowMode('straight');
              handlePathTypeChange('pass');
            }}
            className={`h-9 px-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
              boardState.currentTool === 'draw' && boardState.currentPathType === 'pass' && !isCurveMode
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Flecha Continua (Pase)"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden 2xl:inline">Pase</span>
          </button>

          {/* Discontinua (Desmarque) */}
          <button
            type="button"
            onClick={() => handlePathTypeChange('run')}
            className={`h-9 px-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
              boardState.currentTool === 'draw' && boardState.currentPathType === 'run'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Flecha Discontinua (Movimiento / Desmarque)"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden 2xl:inline">Desmarque</span>
          </button>

          {/* Conducción (Ondulada) */}
          <button
            type="button"
            onClick={() => handlePathTypeChange('dribble')}
            className={`h-9 px-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
              boardState.currentTool === 'draw' && boardState.currentPathType === 'dribble'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Flecha de Conducción"
          >
            <MoveRight className="w-4 h-4" />
            <span className="hidden 2xl:inline">Conducción</span>
          </button>

          {/* Toggle Curva / Recta */}
          <button
            type="button"
            onClick={() => {
              toggleArrowMode();
              if (boardState.currentTool !== 'draw') {
                handlePathTypeChange(boardState.currentPathType || 'pass');
              }
            }}
            className={`h-9 px-2 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
              isCurveMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
            title={isCurveMode ? 'Modo Curva Activo (clic para Recta)' : 'Activar Flecha Curva'}
          >
            <Spline className="w-3.5 h-3.5" />
            <span>{isCurveMode ? 'Curva' : 'Recta'}</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-0.5 shrink-0" />

          {/* Formas / Zonas y Texto */}
          <button
            type="button"
            onClick={() => handleToolChange('rectangle')}
            className={`h-9 w-9 rounded-md transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
              boardState.currentTool === 'rectangle'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Zona Rectangular"
          >
            <Box className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToolChange('circle')}
            className={`h-9 w-9 rounded-md transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
              boardState.currentTool === 'circle'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Zona Circular"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToolChange('polygon')}
            className={`h-9 w-9 rounded-md transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
              boardState.currentTool === 'polygon'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Polígono Libre"
          >
            <Triangle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToolChange('line')}
            className={`h-9 w-9 rounded-md transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
              boardState.currentTool === 'line'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Línea Recta"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const id = addToken('text', 'Nota táctica en campo');
              onEditSelection(id);
            }}
            className="h-9 w-9 rounded-md transition-colors text-slate-600 hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center shrink-0 cursor-pointer"
            title="Añadir Cuadro de Texto"
          >
            <Type className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-0.5 shrink-0" />

          {/* Paleta Compacta de Colores */}
          <div className="flex items-center gap-1 px-1 shrink-0">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorChange(color)}
                className={`w-4 h-4 shrink-0 rounded-full border transition-transform hover:scale-125 cursor-pointer ${
                  boardState.drawingColor === color
                    ? 'border-slate-900 ring-2 ring-[#059669] scale-110'
                    : 'border-slate-300'
                }`}
                style={{ backgroundColor: color }}
                title="Color de dibujo"
              />
            ))}
          </div>
        </div>

        {/* GRUPO CENTRAL: 3 Botones de Bandejas Desplegables */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => toggleDrawer('material')}
            className={`h-9 px-3 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeDrawer === 'material'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-[#059669]" />
            <span>Material</span>
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${activeDrawer === 'material' ? 'rotate-180 text-[#059669]' : 'text-slate-400'}`} />
          </button>

          <button
            type="button"
            onClick={() => toggleDrawer('squad')}
            className={`h-9 px-3 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeDrawer === 'squad'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#059669]" />
            <span>Plantilla</span>
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${activeDrawer === 'squad' ? 'rotate-180 text-[#059669]' : 'text-slate-400'}`} />
          </button>

          <button
            type="button"
            onClick={() => toggleDrawer('timeline')}
            className={`h-9 px-3 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeDrawer === 'timeline'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-[#059669]" />
            <span>Animación ({savedScenes.length})</span>
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${activeDrawer === 'timeline' ? 'rotate-180 text-[#059669]' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* GRUPO DERECHO: Accesos Rápidos de Animación */}
        <div className="flex items-center gap-1.5 shrink-0">
          {playAnimation && (
            <button
              type="button"
              onClick={playAnimation}
              disabled={isPlaying || !canAnimate}
              className={`h-9 w-9 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                canAnimate && !isPlaying
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                  : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={
                !canAnimate
                  ? 'Necesitas al menos 2 fotogramas para reproducir'
                  : isPlaying
                  ? 'Reproduciendo animación…'
                  : 'Reproducir animación'
              }
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => saveScene(`Fotograma ${savedScenes.length + 1}`)}
            className="h-9 px-2.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            title="Capturar estado actual como nuevo fotograma"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Fotograma</span>
          </button>

          {onExportVideo && (
            <button
              type="button"
              onClick={onExportVideo}
              disabled={isRecording || !canAnimate}
              className={`h-9 px-2.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                isRecording || !canAnimate
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs cursor-pointer'
              }`}
              title={
                !canAnimate
                  ? 'Necesitas al menos 2 fotogramas para exportar .MP4'
                  : 'Exportar animación a vídeo (.mp4)'
              }
            >
              {isRecording ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                  <span className="font-mono text-emerald-700">{Math.round((videoExportProgress ?? 0) * 100)}%</span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 text-[#059669]" />
                  <span>MP4</span>
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </>
  );
}
