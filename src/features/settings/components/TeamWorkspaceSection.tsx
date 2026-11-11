import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { Team } from '../../../types';
import { CompetitionLinkStatusCard } from '../../rfaf/components/CompetitionLinkStatusCard';

interface TeamWorkspaceSectionProps {
  teams: Team[];
  activeTeamId: string | null;
  selectTeam: (id: string) => void;
  createTeam: (name: string, modality: 'F7' | 'F11') => void;
  onOpenTeamsAdmin: () => void;
  onOpenRfafModal: () => void;
}

export const TeamWorkspaceSection: React.FC<TeamWorkspaceSectionProps> = ({
  teams,
  activeTeamId,
  selectTeam,
  createTeam,
  onOpenTeamsAdmin,
  onOpenRfafModal,
}) => {
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState<{ name: string; modality: 'F7' | 'F11' }>({
    name: '',
    modality: 'F11',
  });

  const handleCreateTeam = () => {
    if (!newTeamForm.name.trim()) return;
    createTeam(newTeamForm.name.trim(), newTeamForm.modality);
    setShowNewTeamModal(false);
    setNewTeamForm({ name: '', modality: 'F11' });
  };

  return (
    <>
      <section className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h2 className="text-[13px] font-semibold text-[#EDEDED]">⚽ Gestión de Equipos y Club</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenTeamsAdmin}
              className="h-8 px-3 bg-[#141414] hover:bg-[#1F1F1F] text-[#EDEDED] border border-[#2A2A2A] rounded-md transition-colors flex items-center gap-1.5 text-[12px] font-medium"
            >
              <span>⚙️ Administrar Equipos</span>
            </button>
            <button
              onClick={() => setShowNewTeamModal(true)}
              className="h-8 px-3 bg-[#EDEDED] hover:bg-white text-[#0A0A0A] rounded-md text-[12px] font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>➕ Crear Nuevo Equipo</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <CompetitionLinkStatusCard onOpenModal={onOpenRfafModal} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Equipo Activo en el Espacio de Trabajo</label>
              <select
                value={activeTeamId || ''}
                onChange={(e) => selectTeam(e.target.value)}
                className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] text-[#EDEDED] focus:border-[#525252] focus:outline-none transition-colors"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.modality}) — {t.players.length} jugadores
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[12px] text-[#737373]">
              Tienes <strong className="text-[#EDEDED]">{teams.length}</strong> {teams.length === 1 ? 'equipo registrado' : 'equipos registrados'} en tu cuenta. Puedes alternar entre ellos o administrar sus categorías y modalidades.
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
                    className={`text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-[#0E0E0E] border-[#1F1F1F] text-[#A3A3A3] hover:border-[#333333] hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{t.name}</div>
                      <div className="text-[11px] text-[#737373] font-mono">
                        {t.modality} · {t.players.length} fichas
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
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
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] border border-[#222222] p-6 rounded-lg max-w-md w-full relative">
            <button onClick={() => setShowNewTeamModal(false)} className="absolute top-4 right-4 text-[#666666] hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-[#EDEDED] mb-1">Crear Nuevo Equipo</h2>
            <p className="text-[12px] text-[#777777] mb-5">Define el nombre y formato de competición del equipo.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Nombre del Equipo</label>
                <input
                  type="text"
                  value={newTeamForm.name}
                  onChange={e => setNewTeamForm({ ...newTeamForm, name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#262626] rounded-md px-3 py-2 text-[13px] text-[#EDEDED] focus:border-[#555555] focus:outline-none"
                  placeholder="Ej: C.D. Álora Juvenil"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Modalidad</label>
                <div className="grid grid-cols-2 gap-2 bg-[#111111] border border-[#262626] rounded-md p-1">
                  {(['F7', 'F11'] as const).map(mod => (
                    <button
                      key={mod}
                      onClick={() => setNewTeamForm({ ...newTeamForm, modality: mod })}
                      className={`text-[12px] py-2 rounded font-medium transition-colors ${
                        newTeamForm.modality === mod ? 'bg-[#EDEDED] text-[#0A0A0A]' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      {mod === 'F7' ? 'Fútbol 7' : 'Fútbol 11'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateTeam}
                className="w-full h-9 mt-2 bg-[#EDEDED] hover:bg-white text-[#0A0A0A] text-[13px] font-medium rounded-md transition-colors"
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
