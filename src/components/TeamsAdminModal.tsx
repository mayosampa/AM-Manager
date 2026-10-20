import React, { useState } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import { useTeam } from '../context/TeamContext';

interface Props {
  onClose: () => void;
}

export function TeamsAdminModal({ onClose }: Props) {
  const { teams, activeTeamId, updateTeam, deleteTeam } = useTeam();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editModality, setEditModality] = useState<'F7' | 'F11'>('F11');

  const startEdit = (team: any) => {
    setEditingId(team.id);
    setEditName(team.name);
    setEditModality(team.modality);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateTeam(editingId, { name: editName.trim(), modality: editModality });
      setEditingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    const confirm = window.confirm(
      `¿Estás seguro de eliminar el equipo "${name}"? Se borrarán todos los jugadores, partidos y planificaciones de este equipo. ¡Esta acción no se puede deshacer!`
    );
    if (confirm) {
      deleteTeam(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-6 w-full max-w-xl relative flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#737373] hover:text-[#EDEDED] p-1.5 rounded-md hover:bg-[#161616] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5 pb-4 border-b border-[#1F1F1F]">
          <h3 className="text-[16px] font-semibold text-[#EDEDED] tracking-[-0.02em]">Administrar Equipos</h3>
          <p className="text-[#737373] text-[12px] mt-0.5">Edita el nombre, modalidad o elimina equipos registrados en tu cuenta.</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {teams.length === 0 && (
            <p className="text-[#666666] text-[13px] text-center py-8">No hay equipos creados.</p>
          )}
          {teams.map(team => (
            <div
              key={team.id}
              className="bg-[#0F0F0F] border border-[#1F1F1F] rounded-md px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {editingId === team.id ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 bg-[#050505] border border-[#262626] text-[#EDEDED] px-3 rounded-md text-[13px] focus:outline-none focus:border-[#525252] flex-1"
                    placeholder="Nombre del equipo"
                  />
                  <select
                    value={editModality}
                    onChange={e => setEditModality(e.target.value as 'F7' | 'F11')}
                    className="h-8 bg-[#050505] border border-[#262626] text-[#EDEDED] px-2.5 rounded-md text-[12px] font-mono focus:outline-none focus:border-[#525252]"
                  >
                    <option value="F11">F11</option>
                    <option value="F7">F7</option>
                  </select>
                </div>
              ) : (
                <div>
                  <h4 className="text-[#EDEDED] text-[13px] font-medium flex items-center gap-2">
                    {team.name}
                    {team.id === activeTeamId && (
                      <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                        Activo
                      </span>
                    )}
                  </h4>
                  <p className="text-[#737373] text-[11px] mt-0.5">
                    Modalidad: <span className="font-mono text-[#A1A1AA]">{team.modality}</span>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                {editingId === team.id ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="h-7 px-3 bg-[#EDEDED] text-[#0A0A0A] rounded-md font-medium text-[12px] hover:bg-white transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="h-7 px-2.5 bg-[#161616] border border-[#262626] text-[#A1A1AA] rounded-md text-[12px] hover:text-[#EDEDED] transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(team)}
                      className="p-1.5 text-[#737373] hover:text-[#EDEDED] hover:bg-[#1A1A1A] rounded-md transition-colors"
                      title="Editar equipo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(team.id, team.name)}
                      className="p-1.5 text-[#737373] hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      title="Eliminar equipo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
