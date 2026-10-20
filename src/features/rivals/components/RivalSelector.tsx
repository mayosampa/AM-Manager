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
      <div className="bg-[#0F0F0F] border border-[#2E2E2E] rounded-md p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#EDEDED] uppercase tracking-wider">
            Nuevo Equipo Rival
          </span>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="text-[#737373] hover:text-[#EDEDED] p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nombre del club (ej. Cártama B)"
          autoFocus
          className="w-full h-8 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
        />
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={newStadium}
            onChange={e => setNewStadium(e.target.value)}
            placeholder="Estadio / Campo (Opcional)"
            className="w-full h-8 bg-[#050505] border border-[#262626] rounded-md pl-8 pr-2.5 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="h-7 px-2.5 rounded-md text-[11px] font-medium text-[#888888] hover:text-[#EDEDED]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmNewRival}
            disabled={!newName.trim() || isSaving}
            className="h-7 flex items-center gap-1 px-3 rounded-md text-[11px] font-medium bg-[#EDEDED] text-[#0A0A0A] hover:bg-white disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
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
          'flex-1 w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] text-[#EDEDED] focus:outline-none focus:border-[#525252] disabled:opacity-70 disabled:cursor-not-allowed'
        }
      >
        <option value="">Selecciona equipo rival...</option>
        {value && !hasValueInList && <option value={value}>{value}</option>}
        {rivals.map(r => (
          <option key={r.id} value={r.name}>
            {r.name}
            {r.stadium ? ` (${r.stadium})` : ''}
          </option>
        ))}
        {!disabled && <option value={ADD_NEW_VALUE}>+ Añadir nuevo equipo rival...</option>}
      </select>
      {!disabled && (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          title="Añadir nuevo equipo rival al directorio"
          className="h-9 w-9 flex items-center justify-center bg-[#111111] border border-[#262626] hover:border-[#3A3A3A] text-[#EDEDED] rounded-md transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
