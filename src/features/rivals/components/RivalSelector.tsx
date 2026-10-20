import React, { useState, useEffect } from 'react';
import { Plus, Check, X, MapPin } from 'lucide-react';
import { RivalTeam } from '../../../types';
import { useRivalsDb } from '../hooks/useRivalsDb';

interface RivalSelectorProps {
  teamId?: string;
  value: string;
  onChange: (rivalName: string, rivalObj?: RivalTeam) => void;
  isAway?: boolean;
  onAutoStadium?: (stadium: string) => void;
  disabled?: boolean;
  className?: string;
}

const ADD_NEW_VALUE = '__ADD_NEW_RIVAL__';

export function RivalSelector({
  teamId,
  value,
  onChange,
  isAway,
  onAutoStadium,
  disabled,
  className,
}: RivalSelectorProps) {
  const { rivals, addQuickRival, findRivalByName } = useRivalsDb(teamId);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStadium, setNewStadium] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-fill stadium when switching to Visitante if selected rival has a registered stadium
  useEffect(() => {
    if (isAway && value && onAutoStadium) {
      const matched = findRivalByName(value);
      if (matched?.stadium) {
        onAutoStadium(matched.stadium);
      }
    }
  }, [isAway, value, findRivalByName]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    if (selectedVal === ADD_NEW_VALUE) {
      setIsCreating(true);
      return;
    }
    const matched = findRivalByName(selectedVal);
    onChange(selectedVal, matched);
    if (isAway && matched?.stadium && onAutoStadium) {
      onAutoStadium(matched.stadium);
    }
  };

  const handleConfirmNewRival = async () => {
    if (!newName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const created = await addQuickRival(newName.trim(), newStadium.trim());
      onChange(created.name, created);
      if (isAway && created.stadium && onAutoStadium) {
        onAutoStadium(created.stadium);
      }
      setNewName('');
      setNewStadium('');
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const hasValueInList = rivals.some(
    r => r.name.trim().toLowerCase() === (value || '').trim().toLowerCase()
  );

  if (isCreating && !disabled) {
    return (
      <div className="bg-[#1C1C1F] border border-[#FF4B4B]/40 rounded-xl p-3 space-y-2.5 animate-in fade-in">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#FF4B4B] uppercase tracking-wider">
            Nuevo Equipo Rival
          </span>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="text-[#6E6E75] hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nombre del club (ej. Cártama B)"
          autoFocus
          className="w-full bg-[#121215] border border-[#2A2A2E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF4B4B]"
        />
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-[#6E6E75] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={newStadium}
            onChange={e => setNewStadium(e.target.value)}
            placeholder="Estadio / Campo (Opcional)"
            className="w-full bg-[#121215] border border-[#2A2A2E] rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF4B4B]"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#6E6E75] hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmNewRival}
            disabled={!newName.trim() || isSaving}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF4B4B] text-black hover:bg-[#FF4B4B]/90 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Guardar Rival
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={handleSelectChange}
        disabled={disabled}
        className={
          className ||
          'flex-1 w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B] disabled:opacity-70 disabled:cursor-not-allowed'
        }
      >
        <option value="">Selecciona equipo rival...</option>
        {value && !hasValueInList && <option value={value}>{value}</option>}
        {rivals.map(r => (
          <option key={r.id} value={r.name}>
            {r.name}{r.stadium ? ` (${r.stadium})` : ''}
          </option>
        ))}
        {!disabled && (
          <option value={ADD_NEW_VALUE} className="text-[#FF4B4B] font-bold">
            + Añadir nuevo equipo rival...
          </option>
        )}
      </select>
      {!disabled && (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          title="Añadir nuevo equipo rival al directorio"
          className="p-2.5 bg-[#1C1C1F] border border-[#2A2A2E] hover:border-[#FF4B4B]/50 text-[#FF4B4B] rounded-lg transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
