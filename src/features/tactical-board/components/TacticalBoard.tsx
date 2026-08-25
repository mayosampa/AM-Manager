import { useBoardManager } from '../controllers/useBoardManager';
import { PitchLines } from './PitchLines';
import { BoardTokenItem } from './BoardTokenItem';
import { MousePointer2, PenLine, Type, Undo, Trash2, Download, Save, Triangle, AlignCenterVertical, Goal, Film, X, Play, Activity, Circle, UserPlus, MoveRight, ArrowRight, TrendingUp, Zap, Baseline, Users, Box, ChevronDown, ChevronUp, Library, Loader2, Video, Settings } from 'lucide-react';
import { toPng } from 'html-to-image';
import { ExportService } from '../services/ExportService';
import { TokenEditorModal } from './TokenEditorModal';
import { useState, useRef, useEffect, memo } from 'react';
import { MOCK_PLAYERS } from '../../../data/players';
import { useSession, Exercise } from '../../../context/SessionContext';
import { useTeam } from '../../../context/TeamContext';

const COLORS = ['#ffffff', '#ef4444', '#fbbf24', '#3b82f6', '#10b981', '#f43f5e', '#a855f7'];

export const TacticalBoard = memo(function TacticalBoard() {
  const { activeTeam } = useTeam();
  const isF7 = activeTeam?.modality === 'F7';
  const { saveExercise, currentSessionType, trainingCategory } = useSession();
  // removed sceneTitle and isSaving
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  const [exerciseTitle, setExerciseTitle] = useState<string>('');
  const [exerciseDuration, setExerciseDuration] = useState<number>(15);
  const [exerciseCategory, setExerciseCategory] = useState<string>('Posesión');
  const [exerciseModality, setExerciseModality] = useState<'F7' | 'F11' | 'Universal'>(activeTeam?.modality || 'Universal');
  const [exerciseNotes, setExerciseNotes] = useState<string>('');
  const [isClearing, setIsClearing] = useState(false);
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'squad' | 'materials'>('materials');
  const [panelOpen, setPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef<HTMLElement>(null);
  const [pitchSize, setPitchSize] = useState({ width: '100%', height: '100%' });

  // Dynamically calculate the maximum possible size for the pitch while maintaining the exact 105:68 aspect ratio
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const aspect = 105 / 68;
      if (width / height > aspect) {
        // Parent is wider than needed, height is the bottleneck
        setPitchSize({ height: `${height}px`, width: `${height * aspect}px` });
      } else {
        // Parent is taller than needed, width is the bottleneck
        setPitchSize({ width: `${width}px`, height: `${width / aspect}px` });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const {
    boardRef,
    boardState,
    isPlaying,
    currentPathPoints,
    handleTokenPointerDown,
    handleBoardPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleToolChange,
    handlePathTypeChange,
    handleColorChange,
    undoPath,
    clearBoard,
    addFormation,
    addToken,
    addPlayer,
    updateToken,
    deleteSelectedToken,
    handleRotateStart,
    rotateSelectedToken,
    savedScenes,
    saveScene,
    loadScene,
    deleteScene,
    playAnimation
  } = useBoardManager();

  const exportAsImage = async () => {
    if (boardRef.current) ExportService.exportAsImage(boardRef.current);
  };

  const exportVideo = async () => {
    if (!boardRef.current || savedScenes.length < 2) return;
    setIsExporting(true);
    try {
      await ExportService.exportVideo(boardRef.current, savedScenes);
    } finally {
      setIsExporting(false);
    }
  };

  const confirmSaveToLibrary = async () => {
    if (!boardRef.current) return;
    try {
      const dataUrl = await ExportService.generateThumbnail(boardRef.current);
      await saveExercise({
        id: Math.random().toString(36).substring(7),
        title: exerciseTitle.trim() || `Ejercicio ${new Date().toLocaleDateString()}`,
        category: exerciseCategory,
        modality: exerciseModality,
        thumbnailUrl: dataUrl,
        createdAt: Date.now(),
        boardState: boardState, // Removed JSON.stringify deep clone, we trust IndexedDB
        scenes: savedScenes.length > 0 ? savedScenes : undefined,
        duration: exerciseDuration,
        notes: exerciseNotes.trim()
      });
      setIsSavingExercise(false);
      alert('Ejercicio guardado en la Biblioteca');
    } catch (err) {
      console.error('Error saving thumbnail', err);
    }
  };

  const getPathStyles = (type: string, color: string) => {
    switch (type) {
      case 'dribble': return { strokeDasharray: '2,2', strokeWidth: '0.4', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'run': return { strokeDasharray: '5,3', strokeWidth: '0.4', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'shot': return { strokeDasharray: 'none', strokeWidth: '0.8', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'block': return { strokeDasharray: 'none', strokeWidth: '0.5', markerEnd: `url(#block-${color.replace('#', '')})` };
      case 'pass': 
      default: 
        return { strokeDasharray: 'none', strokeWidth: '0.4', markerEnd: `url(#arrow-${color.replace('#', '')})` };
    }
  };

  const drawToken = (token: any, x: number, y: number) => {}; // Mock for video export
  return (
    <div className="w-full h-full bg-[#0A0A0C] flex p-2 gap-2 overflow-hidden rounded-2xl border border-[#2A2A2E]">
      
      {/* LEFT SIDEBAR */}
      <div className="w-14 shrink-0 flex flex-col gap-2 h-full z-20">
        
        {/* Añadir Elemento */}
        <div className="relative w-full bg-[#121215] border border-[#2A2A2E] rounded-xl flex justify-center py-2 shrink-0">
          <button 
            onClick={() => setPanelOpen(!panelOpen)}
            className="p-2 bg-[#1C1C1F] rounded-lg text-[#FF4B4B] hover:bg-[#2A2A2E] transition-all relative group"
            title="Añadir Elemento"
          >
            <Box className="w-5 h-5" />
          </button>

          {/* Popover Añadir */}
          <div 
            className={`absolute top-0 left-full ml-2 bg-[#121215]/95 backdrop-blur-md border border-[#2A2A2E] rounded-2xl shadow-2xl transition-all duration-300 origin-left overflow-hidden w-[340px] z-50 ${
              panelOpen ? 'scale-100 opacity-100 visible' : 'scale-95 opacity-0 invisible w-0 border-transparent'
            }`}
          >
            <div className="flex border-b border-[#2A2A2E]">
              <button onClick={() => setActiveTab('materials')} className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'materials' ? 'text-[#FF4B4B] bg-[#1C1C1F]' : 'text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F]/50'}`}><Box className="w-4 h-4" /> Material</button>
              <button onClick={() => setActiveTab('squad')} className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'squad' ? 'text-[#FF4B4B] bg-[#1C1C1F]' : 'text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F]/50'}`}><Users className="w-4 h-4" /> Plantilla</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'materials' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'cone', icon: <Triangle className="w-6 h-6 fill-[#FF4B4B] text-[#FF4B4B]" />, label: 'Cono' },
                    { type: 'pole', icon: <AlignCenterVertical className="w-6 h-6 text-yellow-400" />, label: 'Pica' },
                    { type: 'mini-goal', icon: <Goal className="w-6 h-6 text-white" />, label: 'Portería' },
                    { type: 'ladder', icon: <Activity className="w-6 h-6 text-yellow-400" />, label: 'Escalera' },
                    { type: 'ring', icon: <Circle className="w-6 h-6 text-[#3b82f6]" />, label: 'Aro' },
                    { type: 'hurdle', icon: <div className="w-6 h-2 border-x-2 border-t-2 border-b-0 border-[#f43f5e]" />, label: 'Valla' },
                    { type: 'ball', icon: <div className="w-4 h-4 bg-white rounded-full border-2 border-black" />, label: 'Balón' },
                  ].map((item) => (
                    <button key={item.type} onClick={() => { addToken(item.type as any); setPanelOpen(false); }} className="flex flex-col items-center justify-center gap-2 p-3 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl hover:border-[#FF4B4B] hover:bg-[#2A2A2E] transition-all group">
                      <div className="h-8 flex items-center justify-center group-hover:scale-110 transition-transform">{item.icon}</div>
                      <span className="text-[10px] font-medium text-[#6E6E75] group-hover:text-white">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === 'squad' && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider">Añadir Rápido</span>
                    <div className="flex gap-2">
                      <button onClick={() => { addPlayer('home', 'X'); setPanelOpen(false); }} className="w-6 h-6 rounded bg-[#f43f5e] flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform">L</button>
                      <button onClick={() => { addPlayer('away', 'X'); setPanelOpen(false); }} className="w-6 h-6 rounded bg-[#3b82f6] flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform">V</button>
                    </div>
                  </div>
                  <div className="w-full h-px bg-[#2A2A2E] mb-2" />
                  <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider px-1">{isF7 ? 'Formaciones (F7)' : 'Formaciones (11v11)'}</span>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-center text-[#f43f5e] font-bold">Local</span>
                      {!isF7 ? (
                        <>
                          <button onClick={() => { addFormation('home', '4-4-2'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#f43f5e] text-[#6E6E75] hover:text-white transition-all">4-4-2</button>
                          <button onClick={() => { addFormation('home', '4-3-3'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#f43f5e] text-[#6E6E75] hover:text-white transition-all">4-3-3</button>
                          <button onClick={() => { addFormation('home', '3-5-2'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#f43f5e] text-[#6E6E75] hover:text-white transition-all">3-5-2</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { addFormation('home', '2-3-1'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#f43f5e] text-[#6E6E75] hover:text-white transition-all">2-3-1</button>
                          <button onClick={() => { addFormation('home', '3-2-1'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#f43f5e] text-[#6E6E75] hover:text-white transition-all">3-2-1</button>
                          <button onClick={() => { addFormation('home', '2-2-2'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#f43f5e] text-[#6E6E75] hover:text-white transition-all">2-2-2</button>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-center text-[#3b82f6] font-bold">Visitante</span>
                      {!isF7 ? (
                        <>
                          <button onClick={() => { addFormation('away', '4-4-2'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#3b82f6] text-[#6E6E75] hover:text-white transition-all">4-4-2</button>
                          <button onClick={() => { addFormation('away', '4-3-3'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#3b82f6] text-[#6E6E75] hover:text-white transition-all">4-3-3</button>
                          <button onClick={() => { addFormation('away', '3-5-2'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#3b82f6] text-[#6E6E75] hover:text-white transition-all">3-5-2</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { addFormation('away', '2-3-1'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#3b82f6] text-[#6E6E75] hover:text-white transition-all">2-3-1</button>
                          <button onClick={() => { addFormation('away', '3-2-1'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#3b82f6] text-[#6E6E75] hover:text-white transition-all">3-2-1</button>
                          <button onClick={() => { addFormation('away', '2-2-2'); setPanelOpen(false); }} className="text-xs py-1.5 bg-[#1C1C1F] border border-[#2A2A2E] rounded hover:border-[#3b82f6] text-[#6E6E75] hover:text-white transition-all">2-2-2</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-px bg-[#2A2A2E] mb-2" />
                  <span className="text-xs font-bold text-[#6E6E75] uppercase tracking-wider px-1">Jugadores</span>
                  {MOCK_PLAYERS.map(player => (
                    <div key={player.id} draggable onDragStart={(e) => { e.dataTransfer.setData('application/json', JSON.stringify(player)); e.dataTransfer.effectAllowed = 'copy'; }} className="flex items-center justify-between p-2 bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg hover:border-[#FF4B4B] group transition-all cursor-grab active:cursor-grabbing">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-[#3b82f6] flex items-center justify-center font-bold text-xs text-white">{player.number}</div>
                        <div className="flex flex-col">
                          <span className="text-sm text-white font-medium">{player.name}</span>
                          <span className="text-[10px] text-[#6E6E75]">{player.positionGroup}</span>
                        </div>
                      </div>
                      <button onClick={() => { addPlayer('home', String(player.number), player.id, undefined, player.color, player.name); setPanelOpen(false); }} className="opacity-0 group-hover:opacity-100 p-1.5 bg-[#FF4B4B] text-black rounded hover:bg-[#E63939] transition-all"><UserPlus className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Herramientas de Dibujo */}
        <div className="w-full flex-1 bg-[#121215] border border-[#2A2A2E] rounded-xl flex flex-col items-center py-2 gap-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => handleToolChange('pointer')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'pointer' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F] hover:text-white'}`} title="Seleccionar/Mover"><MousePointer2 className="w-4 h-4" /></button>
          <div className="w-8 h-px bg-[#2A2A2E] my-1 shrink-0" />
          <button onClick={() => handlePathTypeChange('pass')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'pass' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F] hover:text-white'}`} title="Pase (Continuo)"><ArrowRight className="w-4 h-4" /></button>
          <button onClick={() => handlePathTypeChange('dribble')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'dribble' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F] hover:text-white'}`} title="Conducción (Punteada)"><MoveRight className="w-4 h-4" strokeDasharray="2 2" /></button>
          <button onClick={() => handlePathTypeChange('run')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'run' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F] hover:text-white'}`} title="Desmarque (Discontinua)"><TrendingUp className="w-4 h-4" /></button>
          <button onClick={() => handlePathTypeChange('shot')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'shot' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F] hover:text-white'}`} title="Tiro (Gruesa)"><Zap className="w-4 h-4" /></button>
          <button onClick={() => handlePathTypeChange('block')} className={`p-2.5 rounded-lg transition-colors ${boardState.currentTool === 'draw' && boardState.currentPathType === 'block' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:bg-[#1C1C1F] hover:text-white'}`} title="Bloqueo"><Baseline className="w-4 h-4" /></button>
          
          <div className="w-8 h-px bg-[#2A2A2E] my-1 shrink-0" />
          <div className="flex flex-col gap-3 w-full px-2 items-center py-1">
            {COLORS.map(color => (
              <button key={color} onClick={() => handleColorChange(color)} className={`w-5 h-5 shrink-0 rounded-full border-2 transition-transform hover:scale-125 ${boardState.drawingColor === color ? 'border-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
          </div>

          <div className="mt-auto flex flex-col items-center gap-2 w-full pt-2 border-t border-[#2A2A2E]">
            <button onClick={undoPath} className="p-2.5 rounded-lg text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F] transition-colors" title="Deshacer Dibujo"><Undo className="w-4 h-4" /></button>
            {boardState.selectedTokenId && (
              <>
                <button onClick={() => setEditingTokenId(boardState.selectedTokenId)} className="p-2.5 rounded-lg text-[#6E6E75] hover:text-white hover:bg-[#1C1C1F] transition-colors" title="Editar Selección"><Settings className="w-4 h-4" /></button>
                <button onClick={deleteSelectedToken} className="p-2.5 rounded-lg text-[#E63939] hover:text-white hover:bg-[#FF4B4B]/20 transition-colors" title="Borrar Selección"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
            <button onClick={() => setIsClearing(true)} className="p-2.5 rounded-lg text-[#6E6E75] hover:text-[#E63939] hover:bg-[#1C1C1F] transition-colors" title="Limpiar Pizarra"><X className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* CENTER: PITCH CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative gap-2">
        
        {/* Main Pitch Viewport */}
        <div className="flex-1 w-full flex justify-center items-center relative overflow-hidden bg-[#121215] rounded-xl border border-[#2A2A2E]" ref={containerRef}>
          <div 
            ref={boardRef}
            className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white/5 bg-[#15803d] touch-none shrink-0"
            style={{ width: pitchSize.width, height: pitchSize.height }}
            onPointerDown={handleBoardPointerDown}
            onPointerMove={handleBoardPointerMove}
            onPointerUp={handleBoardPointerUp}
            onPointerLeave={handleBoardPointerUp}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={(e) => {
              e.preventDefault();
              const playerDataStr = e.dataTransfer.getData('application/json');
              if (playerDataStr && containerRef.current) {
                try {
                  const player = JSON.parse(playerDataStr);
                  const innerBoard = containerRef.current.firstElementChild;
                  if (innerBoard) {
                    const rect = innerBoard.getBoundingClientRect();
                    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                    addPlayer('home', String(player.number), player.id, { x, y }, player.color, player.name);
                  }
                } catch (err) {}
              }
            }}
          >
            <PitchLines />
            
            {/* Drawn Paths Overlay */}
            <svg id="paths-layer" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                {COLORS.map(c => (
                  <g key={`markers-${c}`}>
                    <marker id={`arrow-${c.replace('#', '')}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill={c} /></marker>
                    <marker id={`block-${c.replace('#', '')}`} markerWidth="4" markerHeight="8" refX="2" refY="4" orient="auto"><rect x="1" y="0" width="2" height="8" fill={c} /></marker>
                  </g>
                ))}
              </defs>
              {boardState.paths.map(path => {
                const styles = getPathStyles(path.type, path.color);
                return (
                  <polyline key={path.id} points={path.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={path.color} style={{...styles, transition: 'stroke-dashoffset 0.5s linear', strokeLinejoin: 'round', strokeLinecap: 'round'}} />
                );
              })}
              {currentPathPoints.length > 0 && (
                <polyline points={currentPathPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={boardState.drawingColor} style={{...getPathStyles(boardState.currentPathType, boardState.drawingColor), strokeLinejoin: 'round', strokeLinecap: 'round'}} />
              )}
            </svg>

            {/* Tokens */}
            <div className="absolute inset-0 pointer-events-none">
              {boardState.tokens.map(token => (
                <BoardTokenItem key={token.id} token={token} isSelected={boardState.selectedTokenId === token.id} onPointerDown={handleTokenPointerDown} onRotateStart={handleRotateStart} onDelete={deleteSelectedToken} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-56 shrink-0 flex flex-col gap-2 h-full z-20">
        
        {/* Global Actions */}
        <div className="bg-[#121215] border border-[#2A2A2E] rounded-xl p-2 grid grid-cols-2 gap-2">
          <button onClick={() => setIsSavingExercise(true)} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all" title="A Biblioteca">
            <Library className="w-4 h-4" />
            <span className="text-[10px] font-bold">Biblioteca</span>
          </button>
          <button onClick={() => saveScene(`Frame ${savedScenes.length + 1}`)} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#2A2A2E] text-white hover:bg-[#3A3A3E] hover:text-[#FF4B4B] transition-all" title="Guardar Frame">
            <Save className="w-4 h-4" />
            <span className="text-[10px] font-bold">Frame</span>
          </button>
          <button onClick={exportAsImage} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-[#2A2A2E] text-[#6E6E75] hover:text-emerald-400 hover:bg-[#1C1C1F] transition-all" title="Exportar PNG">
            <Download className="w-4 h-4" />
            <span className="text-[10px] font-bold">Imagen</span>
          </button>
          <button onClick={exportVideo} disabled={savedScenes.length < 2 || isExporting} className="flex flex-col items-center gap-1 p-2 rounded-lg border border-[#2A2A2E] text-[#6E6E75] hover:text-[#FF4B4B] hover:bg-[#1C1C1F] transition-all disabled:opacity-50 disabled:hover:text-[#6E6E75]" title="Exportar Vídeo">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            <span className="text-[10px] font-bold">Vídeo</span>
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 bg-[#121215] border border-[#2A2A2E] rounded-xl flex flex-col overflow-hidden min-h-0">
          {/* Header */}
          <div className="p-3 border-b border-[#2A2A2E] flex justify-between items-center bg-[#1C1C1F]">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#6E6E75]" />
              <span className="text-xs font-bold text-white">Animación</span>
            </div>
            <button 
              onClick={playAnimation} 
              disabled={savedScenes.length < 2 || isPlaying} 
              className="w-7 h-7 rounded-full bg-[#FF4B4B] flex items-center justify-center text-black hover:bg-[#E63939] hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
            >
              <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
            </button>
          </div>
          
          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2">
            {savedScenes.length === 0 && (
              <div className="text-xs text-[#6E6E75] text-center p-4 italic">
                Guarda frames para crear una animación
              </div>
            )}
            {savedScenes.map((scene, i) => (
              <div key={scene.id} className="flex items-center gap-2 bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-2 group hover:border-[#FF4B4B] transition-all cursor-pointer" onClick={() => loadScene(scene)}>
                <div className="w-7 h-7 bg-[#1A231E] rounded text-[10px] font-bold text-emerald-400 flex items-center justify-center shrink-0">
                  F{i+1}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-xs text-white font-semibold truncate">{scene.title}</span>
                  <span className="text-[9px] text-[#6E6E75]">{new Date(scene.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }} className="text-[#6E6E75] hover:text-[#E63939] opacity-0 group-hover:opacity-100 transition-all p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
          <Loader2 className="w-12 h-12 text-[#FF4B4B] animate-spin mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Exportando Vídeo...</h2>
          <p className="text-[#6E6E75]">Grabando secuencia animada a 30 FPS. Por favor, espera.</p>
        </div>
      )}

      {isSavingExercise && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Añadir a la Biblioteca</h3>
              <button onClick={() => setIsSavingExercise(false)} className="text-[#6E6E75] hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Título</label>
                <input type="text" value={exerciseTitle} onChange={(e) => setExerciseTitle(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50" autoFocus />
              </div>
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Categoría</label>
                <select value={exerciseCategory} onChange={(e) => setExerciseCategory(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50">
                  <option value="Calentamiento">Calentamiento</option><option value="Posesión">Posesión</option><option value="Transiciones">Transiciones</option><option value="Trabajo por Líneas">Trabajo por Líneas</option><option value="Salida de Balón">Salida de Balón</option><option value="ABP">ABP</option><option value="Otros">Otros</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6E6E75] text-sm font-medium mb-1">Duración (min)</label>
                  <input type="number" min="1" value={exerciseDuration} onChange={(e) => setExerciseDuration(Number(e.target.value))} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50" />
                </div>
                <div>
                  <label className="block text-[#6E6E75] text-sm font-medium mb-2">Modalidad</label>
                  <div className="flex bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-1 h-[46px]">
                    <button onClick={() => setExerciseModality('Universal')} className={`flex-1 text-xs rounded-lg font-bold transition-colors ${exerciseModality === 'Universal' ? 'bg-[#2A2A2E] text-white shadow' : 'text-[#6E6E75] hover:text-white'}`}>Univ</button>
                    <button onClick={() => setExerciseModality('F7')} className={`flex-1 text-xs rounded-lg font-bold transition-colors ${exerciseModality === 'F7' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'}`}>F7</button>
                    <button onClick={() => setExerciseModality('F11')} className={`flex-1 text-xs rounded-lg font-bold transition-colors ${exerciseModality === 'F11' ? 'bg-[#FF4B4B] text-black' : 'text-[#6E6E75] hover:text-white'}`}>F11</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Notas / Descripción (Opcional)</label>
                <textarea value={exerciseNotes} onChange={(e) => setExerciseNotes(e.target.value)} className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50 resize-none h-24" placeholder="Describe el desarrollo de la tarea, reglas de provocación, etc..." />
              </div>
            </div>
            <button onClick={confirmSaveToLibrary} disabled={!exerciseTitle.trim() || exerciseDuration < 1} className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors">Guardar Ejercicio</button>
          </div>
        </div>
      )}


      {isClearing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">¿Limpiar Pizarra?</h3>
              <button onClick={() => setIsClearing(false)} className="text-[#6E6E75] hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-[#6E6E75] text-sm mb-6">¿Estás seguro de que quieres vaciar la pizarra por completo? Se perderán todas las fichas, dibujos y el timeline.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsClearing(false)} className="flex-1 py-3 rounded-xl bg-[#1C1C1F] border border-[#2A2A2E] text-white font-bold hover:bg-[#2A2A2E] transition-colors">Cancelar</button>
              <button onClick={() => { clearBoard(); setIsClearing(false); }} className="flex-1 py-3 rounded-xl bg-[#FF4B4B]/10 text-[#FF4B4B] border border-[#FF4B4B]/20 font-bold hover:bg-[#FF4B4B]/20 transition-colors">Limpiar</button>
            </div>
          </div>
        </div>
      )}
      
      {editingTokenId && boardState.tokens.find(t => t.id === editingTokenId) && (
        <TokenEditorModal
          token={boardState.tokens.find(t => t.id === editingTokenId)!}
          onClose={() => setEditingTokenId(null)}
          onUpdate={updateToken}
          onUpdateTeamColor={updateTeamColor}
        />
      )}
    </div>
  );
});
