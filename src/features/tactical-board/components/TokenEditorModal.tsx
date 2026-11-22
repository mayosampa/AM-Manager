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
    <div className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4">
      <div className="max-h-[92vh] overflow-y-auto custom-scrollbar bg-white border border-slate-200 text-slate-900 rounded-xl p-6 w-full max-w-md shadow-lg">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {isText ? (
              <>
                <Type className="w-5 h-5 text-[#059669]" />
                <span>Editar Cuadro de Texto</span>
              </>
            ) : (
              <span>Editar Ficha</span>
            )}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {isText ? (
            <>
              {/* Multiline Textarea for Tactical Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
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
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669] text-sm leading-relaxed resize-none custom-scrollbar"
                  placeholder="Ej:&#10;• Presión tras pérdida en 3/4&#10;• Máx. 2 toques por jugador&#10;• Buscar pase con tercer hombre"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Pulsa <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700">Enter</kbd> para un nuevo renglón. <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700">Ctrl + Enter</kbd> para guardar.
                </p>
              </div>

              {/* Text Box Width Controls (PowerPoint Style) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Ancho del Cuadro: <span className="text-slate-900">{width}px</span>
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
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
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
                  className="w-full accent-[#059669] cursor-pointer"
                />
              </div>

              {/* Font Size Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
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
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card (sobre tono césped para fidelidad visual) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Vista Previa en Pizarra
                </label>
                <div className="p-3 bg-[#15803d]/15 border border-emerald-200 rounded-lg flex items-center justify-center overflow-hidden">
                  <div
                    className="px-3 py-2 rounded-lg bg-[#0A0A0C]/90 border shadow-md flex flex-col gap-1 transition-all"
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
                      {label || <span className="text-[#94A3B8] italic text-xs">Escribe una nota táctica...</span>}
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
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Dorsal / Etiqueta
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
                      placeholder="Ej: 9"
                      maxLength={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#059669]"
                      placeholder="Ej: Messi"
                    />
                  </div>
                </>
              )}

              {!token.team && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Escala: {scale.toFixed(1)}x
                  </label>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="3" 
                    step="0.1" 
                    value={scale} 
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-[#059669]"
                  />
                </div>
              )}
            </>
          )}

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Color {isText ? 'del Borde y Acento' : ''}
            </label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${activeColor === c ? 'border-slate-900 ring-2 ring-[#059669] scale-110 shadow-sm' : 'border-slate-300 hover:scale-105'}`}
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
                  className="w-4 h-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669] bg-white"
                />
                <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                  Aplicar color a todo el equipo
                </span>
              </label>
            )}
            
            <button
               type="button"
               onClick={() => setColor('')}
               className="mt-2.5 text-xs text-slate-500 underline hover:text-slate-900 block"
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
              className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 font-semibold hover:bg-red-100 hover:border-red-300 transition-colors flex items-center justify-center gap-1.5"
              title="Eliminar esta ficha de la pizarra"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-lg bg-[#059669] text-white font-semibold hover:bg-[#047857] transition-colors shadow-xs"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
