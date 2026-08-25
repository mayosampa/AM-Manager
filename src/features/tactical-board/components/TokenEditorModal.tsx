import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BoardToken } from '../../../types';

interface Props {
  token: BoardToken;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<BoardToken>) => void;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#64748b', // Slate
  '#121215', // Black
  '#ffffff', // White
];

export function TokenEditorModal({ token, onClose, onUpdate }: Props) {
  const [label, setLabel] = useState(token.label || '');
  const [playerName, setPlayerName] = useState(token.playerName || '');
  const [color, setColor] = useState(token.color || '');

  // Default colors if none set
  const defaultColor = token.team === 'home' ? '#ef4444' : (token.team === 'away' ? '#3b82f6' : '#ffffff');
  const activeColor = color || defaultColor;

  const handleSave = () => {
    onUpdate(token.id, {
      label: label.trim(),
      playerName: playerName.trim(),
      color: color || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Editar Ficha</h3>
          <button onClick={onClose} className="text-[#6E6E75] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-2">
              Dorsal / Número
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ej: 9"
              maxLength={3}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ej: Messi"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6E6E75] uppercase tracking-wider mb-2">
              Color de Ficha
            </label>
            <div className="flex flex-wrap gap-3">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${activeColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <button
               onClick={() => setColor('')}
               className="mt-3 text-xs text-[#6E6E75] underline hover:text-white"
            >
              Restablecer al color por defecto
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 mt-6 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
