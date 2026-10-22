import React, { useState } from 'react';
import { X, Type, Trash2 } from 'lucide-react';
import { BoardToken } from '../../../types';

interface Props {
  token: BoardToken;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<BoardToken>) => void;
  onUpdateTeamColor: (team: 'home' | 'away', color: string) => void;
  onDelete?: (id: string) => void;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#10b981', // Green
  '#f97316', // Orange
  '#8b5cf6', // Purple
  '#18181b', // Dark
  '#f8fafc', // Light
];

export function TokenEditorModal({ token, onClose, onUpdate, onUpdateTeamColor, onDelete }: Props) {
  const [label, setLabel] = useState(token.label || '');
  const [playerName, setPlayerName] = useState(token.playerName || '');
  const [color, setColor] = useState(token.color || '');
  const [applyToTeam, setApplyToTeam] = useState(false);
  const [scale, setScale] = useState(token.scale || 1);
  const [width, setWidth] = useState(token.width || 220);
  const [fontSize, setFontSize] = useState(token.fontSize || 13);

  // Default colors if none set
  const defaultColor = token.type === 'text' ? '#eab308' : (token.team === 'home' ? '#ef4444' : (token.team === 'away' ? '#3b82f6' : '#ffffff'));
  const activeColor = color || defaultColor;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    onUpdate(token.id, {
      label: label.trim(),
      playerName: playerName.trim(),
      color: color || undefined,
      scale: scale,
      width: token.type === 'text' ? width : undefined,
      fontSize: token.type === 'text' ? fontSize : undefined,
    });
    
    if (applyToTeam && token.team && token.team !== 'neutral' && color) {
      onUpdateTeamColor(token.team, color);
    }

    onClose();
  };

  const isText = token.type === 'text';

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="max-h-[92vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#1F1F1F]">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {isText ? (
              <>
                <Type className="w-5 h-5 text-emerald-400" />
                <span>Editar Cuadro de Texto</span>
              </>
            ) : (
              <span>Editar Ficha</span>
            )}
          </h3>
          <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors p-1 rounded-md hover:bg-[#141414]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {isText ? (
            <>
              {/* Multiline Textarea for Tactical Notes */}
              <div>
                <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-1.5">
                  Texto de la Indicación (Multilínea)
                </label>
                <textarea
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  rows={4}
                  className="w-full bg-[#111111] border border-[#222222] rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 text-sm leading-relaxed resize-none custom-scrollbar"
                  placeholder="Ej:&#10;• Presión tras pérdida en 3/4&#10;• Máx. 2 toques por jugador&#10;• Buscar pase con tercer hombre"
                  autoFocus
                />
                <p className="text-[11px] text-[#666666] mt-1">
                  Pulsa <kbd className="px-1 py-0.5 bg-[#1F1F1F] rounded text-[10px] text-[#AAAAAA]">Enter</kbd> para un nuevo renglón. <kbd className="px-1 py-0.5 bg-[#1F1F1F] rounded text-[10px] text-[#AAAAAA]">Ctrl + Enter</kbd> para guardar.
                </p>
              </div>

              {/* Text Box Width Controls (PowerPoint Style) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-[#888888] uppercase tracking-wider">
                    Ancho del Cuadro: <span className="text-white">{width}px</span>
                  </label>
                  <div className="flex gap-1">
                    {[
                      { w: 160, label: 'S' },
                      { w: 220, label: 'M' },
                      { w: 320, label: 'L' },
                      { w: 420, label: 'XL' },
                    ].map((preset) => (
                      <button
                        key={preset.w}
                        type="button"
                        onClick={() => setWidth(preset.w)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border transition-colors ${
                          width === preset.w
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            : 'bg-[#111111] text-[#888888] border-[#222222] hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min="140"
                  max="500"
                  step="10"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Font Size Presets */}
              <div>
                <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-1.5">
                  Tamaño de Fuente
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { size: 11, label: 'Pequeño' },
                    { size: 13, label: 'Normal' },
                    { size: 16, label: 'Grande' },
                    { size: 19, label: 'Titular' },
                  ].map((item) => (
                    <button
                      key={item.size}
                      type="button"
                      onClick={() => setFontSize(item.size)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-md border text-center transition-all ${
                        fontSize === item.size
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                          : 'bg-[#111111] text-[#888888] border-[#222222] hover:text-white hover:border-[#3A3A3A]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div>
                <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-1.5">
                  Vista Previa en Pizarra
                </label>
                <div className="p-3 bg-[#111111]/80 border border-[#222222] rounded-lg flex items-center justify-center overflow-hidden">
                  <div
                    className="px-3 py-2 rounded-lg bg-[#0A0A0C]/90 border shadow-lg flex flex-col gap-1 transition-all"
                    style={{
                      width: `${Math.min(320, width)}px`,
                      borderColor: activeColor,
                    }}
                  >
                    <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 mb-0.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeColor }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                        Nota Táctica
                      </span>
                    </div>
                    <p
                      className="text-white font-medium leading-relaxed whitespace-pre-wrap break-words m-0"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {label || <span className="text-[#666666] italic text-xs">Escribe una nota táctica...</span>}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {token.team && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">
                      Dorsal / Etiqueta
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Ej: 9"
                      maxLength={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full bg-[#111111] border border-[#1F1F1F] rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Ej: Messi"
                    />
                  </div>
                </>
              )}

              {!token.team && (
                <div>
                  <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">
                    Escala: {scale.toFixed(1)}x
                  </label>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="3" 
                    step="0.1" 
                    value={scale} 
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}
            </>
          )}

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">
              Color {isText ? 'del Borde y Acento' : ''}
            </label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${activeColor === c ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            
            {(token.team === 'home' || token.team === 'away') && (
              <label className="flex items-center gap-2 mt-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={applyToTeam}
                  onChange={(e) => setApplyToTeam(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1F1F1F] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-[#1C1C1F] bg-[#111111]"
                />
                <span className="text-xs text-[#888888] group-hover:text-white transition-colors">
                  Aplicar color a todo el equipo
                </span>
              </label>
            )}
            
            <button
               type="button"
               onClick={() => setColor('')}
               className="mt-2.5 text-xs text-[#888888] underline hover:text-white block"
            >
              Restablecer al color por defecto
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(token.id)}
              className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold hover:bg-red-500/20 hover:border-red-500/40 transition-colors flex items-center justify-center gap-1.5"
              title="Eliminar esta ficha de la pizarra"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors shadow-md"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
