import React from 'react';

interface RivalAddClubInlineBarProps {
  newClubName: string;
  newClubStadium: string;
  onChangeName: (v: string) => void;
  onChangeStadium: (v: string) => void;
  onCreate: () => void;
  onCancel: () => void;
  compact?: boolean;
}

export const RivalAddClubInlineBar: React.FC<RivalAddClubInlineBarProps> = ({
  newClubName,
  newClubStadium,
  onChangeName,
  onChangeStadium,
  onCreate,
  onCancel,
  compact = false,
}) => {
  return (
    <div
      className={
        compact
          ? 'bg-[#0D0D0D] border-b border-[#1F1F1F] px-5 py-3 flex flex-wrap items-center gap-2'
          : 'bg-[#0A0A0A] border border-[#262626] rounded-lg p-4 flex flex-wrap items-center gap-2.5'
      }
    >
      <input
        type="text"
        value={newClubName}
        onChange={e => onChangeName(e.target.value)}
        placeholder="Nombre oficial del club (ej. Cártama B)"
        className="flex-1 min-w-[180px] h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
      />
      <input
        type="text"
        value={newClubStadium}
        onChange={e => onChangeStadium(e.target.value)}
        placeholder="Estadio / Campo (opcional)"
        className="flex-1 min-w-[180px] h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] focus:outline-none focus:border-[#525252]"
      />
      <button
        type="button"
        onClick={onCreate}
        className="h-8 px-3.5 rounded-md bg-[#EDEDED] text-[#0A0A0A] text-[12px] font-medium hover:bg-white cursor-pointer"
      >
        Crear Club
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-8 px-3 rounded-md bg-[#111111] border border-[#262626] text-[#A1A1AA] text-[12px] cursor-pointer"
      >
        Cancelar
      </button>
    </div>
  );
};
