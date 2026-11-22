import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { Team } from '../../../types';
import { CompetitionLinkStatusCard } from '../../rfaf/components/CompetitionLinkStatusCard';

interface TeamWorkspaceSectionProps {
  teams: Team[];
  activeTeamId: string | null;
  selectTeam: (id: string) => void;
  createTeam: (name: string, modality: 'F7' | 'F11') => void;
  defaultClubName?: string;
  onOpenTeamsAdmin: () => void;
  onOpenRfafModal: () => void;
}

export const TeamWorkspaceSection: React.FC<TeamWorkspaceSectionProps> = ({
  teams,
  activeTeamId,
  selectTeam,
  createTeam,
  defaultClubName,
  onOpenTeamsAdmin,
  onOpenRfafModal,
}) => {
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState<{ name: string; modality: 'F7' | 'F11' }>({
    name: '',
    modality: 'F11',
  });

  const handleOpenNewTeamModal = () => {
    const cleanDefault = (defaultClubName || '').trim();
    const initialName = cleanDefault && !/^sin\s*equipo$/i.test(cleanDefault) ? cleanDefault : '';
    setNewTeamForm({ name: initialName, modality: 'F11' });
    setShowNewTeamModal(true);
  };

  const handleCreateTeam = () => {
    if (!newTeamForm.name.trim()) return;
    createTeam(newTeamForm.name.trim(), newTeamForm.modality);
    setShowNewTeamModal(false);
    setNewTeamForm({ name: '', modality: 'F11' });
  };

  return (
    <>
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#059669]" />
            <h2 className="text-[13px] font-semibold text-slate-900">⚽ Gestión de Equipos y Club</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenTeamsAdmin}
              className="h-8 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5 text-[12px] font-medium cursor-pointer"
            >
              <span>⚙️ Administrar Equipos</span>
            </button>
            <button
              onClick={handleOpenNewTeamModal}
              className="h-8 px-3 bg-[#059669] hover:bg-[#047857] text-white rounded-md text-[12px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕ Crear Nuevo Equipo</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <CompetitionLinkStatusCard onOpenModal={onOpenRfafModal} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Equipo Activo en el Espacio de Trabajo</label>
              <select
                value={activeTeamId || ''}
                onChange={(e) => selectTeam(e.target.value)}
                className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-[13px] text-slate-900 focus:border-[#059669] focus:outline-none transition-colors"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.modality}) — {t.players.length} jugadores
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[12px] text-slate-600">
              Tienes <strong className="text-slate-900">{teams.length}</strong> {teams.length === 1 ? 'equipo registrado' : 'equipos registrados'} en tu cuenta. Puedes alternar entre ellos o administrar sus categorías y modalidades.
            </div>
          </div>

          {teams.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
              {teams.map(t => {
                const isSelected = t.id === activeTeamId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTeam(t.id)}
                    className={`text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{t.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {t.modality} · {t.players.length} fichas
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        Activo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {showNewTeamModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-white border border-slate-200 p-6 rounded-lg max-w-md w-full shadow-lg relative">
            <button onClick={() => setShowNewTeamModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Crear Nuevo Equipo</h2>
            <p className="text-[12px] text-slate-500 mb-5">Define el nombre y formato de competición del equipo.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-slate-700 block mb-1.5">Nombre del Equipo</label>
                <input
                  type="text"
                  value={newTeamForm.name}
                  onChange={e => setNewTeamForm({ ...newTeamForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#059669] focus:outline-none"
                  placeholder="Ej: C.D. Álora Juvenil"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-700 block mb-1.5">Modalidad</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 border border-slate-200 rounded-md p-1">
                  {(['F7', 'F11'] as const).map(mod => (
                    <button
                      key={mod}
                      onClick={() => setNewTeamForm({ ...newTeamForm, modality: mod })}
                      className={`text-[12px] py-2 rounded font-medium transition-colors ${
                        newTeamForm.modality === mod ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mod === 'F7' ? 'Fútbol 7' : 'Fútbol 11'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateTeam}
                className="w-full h-9 mt-2 bg-[#059669] hover:bg-[#047857] text-white text-[13px] font-semibold rounded-md transition-colors cursor-pointer"
              >
                Crear Equipo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
