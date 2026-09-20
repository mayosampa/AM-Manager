import React, { useState } from 'react';
import { X, Edit2, Trash2, ShieldAlert } from 'lucide-react';
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
      updateTeam(editingId, editName.trim(), editModality);
      setEditingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    const confirm = window.confirm(`¿Estás seguro de eliminar el equipo "${name}"? Se borrarán todos los jugadores, partidos y planificaciones de este equipo. ¡Esta acción no se puede deshacer!`);
    if (confirm) {
      deleteTeam(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in">
      <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[85vh]">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#6E6E75] hover:text-white p-2 rounded-lg hover:bg-[#2A2A2E] transition-colors"
        >
          <X className="w-5 h-5"/>
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Gestión de Equipos</h3>
            <p className="text-[#6E6E75] text-sm">Administra, edita o elimina los equipos de tu cuenta.</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {teams.length === 0 && (
            <p className="text-[#6E6E75] text-center py-8">No hay equipos creados.</p>
          )}
          {teams.map(team => (
            <div key={team.id} className="bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {editingId === team.id ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="bg-[#121215] border border-[#2A2A2E] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#FF4B4B]/50 flex-1"
                    placeholder="Nombre del equipo"
                  />
                  <select
                    value={editModality}
                    onChange={e => setEditModality(e.target.value as 'F7'|'F11')}
                    className="bg-[#121215] border border-[#2A2A2E] text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#FF4B4B]/50"
                  >
                    <option value="F11">F11</option>
                    <option value="F7">F7</option>
                  </select>
                </div>
              ) : (
                <div>
                  <h4 className="text-white font-bold flex items-center gap-2">
                    {team.name}
                    {team.id === activeTeamId && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>}
                  </h4>
                  <p className="text-[#6E6E75] text-sm">Modalidad: <span className="text-white font-medium">{team.modality}</span></p>
                </div>
              )}

              <div className="flex items-center gap-2">
                {editingId === team.id ? (
                  <>
                    <button onClick={saveEdit} className="px-3 py-2 bg-emerald-500 text-black rounded-lg font-bold text-sm hover:bg-emerald-400 transition-colors">Guardar</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-2 bg-[#2A2A2E] text-white rounded-lg font-bold text-sm hover:bg-[#3A3A3E] transition-colors">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => startEdit(team)}
                      className="p-2 text-[#6E6E75] hover:text-white hover:bg-[#2A2A2E] rounded-lg transition-colors"
                      title="Editar equipo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(team.id, team.name)}
                      className="p-2 text-[#FF4B4B]/70 hover:text-[#FF4B4B] hover:bg-[#FF4B4B]/10 rounded-lg transition-colors"
                      title="Eliminar equipo (Atención)"
                    >
                      <Trash2 className="w-4 h-4" />
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
