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
    <div className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-xl shadow-lg relative flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5 pb-4 border-b border-slate-200">
          <h3 className="text-[16px] font-semibold text-slate-900 tracking-[-0.02em]">Administrar Equipos</h3>
          <p className="text-slate-500 text-[12px] mt-0.5">Edita el nombre, modalidad o elimina equipos registrados en tu cuenta.</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {teams.length === 0 && (
            <p className="text-slate-500 text-[13px] text-center py-8">No hay equipos creados.</p>
          )}
          {teams.map(team => (
            <div
              key={team.id}
              className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {editingId === team.id ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 bg-white border border-slate-300 text-slate-900 px-3 rounded-md text-[13px] focus:outline-none focus:border-[#059669] flex-1"
                    placeholder="Nombre del equipo"
                  />
                  <select
                    value={editModality}
                    onChange={e => setEditModality(e.target.value as 'F7' | 'F11')}
                    className="h-8 bg-white border border-slate-300 text-slate-900 px-2.5 rounded-md text-[12px] font-mono focus:outline-none focus:border-[#059669]"
                  >
                    <option value="F11">F11</option>
                    <option value="F7">F7</option>
                  </select>
                </div>
              ) : (
                <div>
                  <h4 className="text-slate-900 text-[13px] font-medium flex items-center gap-2">
                    {team.name}
                    {team.id === activeTeamId && (
                      <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                        Activo
                      </span>
                    )}
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Modalidad: <span className="font-mono text-slate-700">{team.modality}</span>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                {editingId === team.id ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="h-7 px-3 bg-[#059669] text-white rounded-md font-medium text-[12px] hover:bg-[#047857] transition-colors cursor-pointer"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="h-7 px-2.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[12px] hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(team)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
                      title="Editar equipo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(team.id, team.name)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
