import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTeam } from '../context/TeamContext';
import { db } from '../services/db';
import { Save, Shield, Download, Settings2 } from 'lucide-react';
import { MetricsConfigPanel } from '../shared/ui/MetricsConfigModal';
import { RfafSyncModal } from '../features/rfaf/components/RfafSyncModal';
import { TeamWorkspaceSection } from '../features/settings/components/TeamWorkspaceSection';
import { ClubIdentityAndMethodologySection } from '../features/settings/components/ClubIdentityAndMethodologySection';
import { CoachProfileSection } from '../features/settings/components/CoachProfileSection';
import { AccountLegalSection } from '../features/settings/components/AccountLegalSection';

const TeamsAdminModal = lazy(() => import('./TeamsAdminModal').then(m => ({ default: m.TeamsAdminModal })));

interface TeamSettings {
  crestUrl: string;
  defaultFormation: string;
  homeStadium?: string;
}

export function SettingsScreen() {
  const { teams, activeTeam, activeTeamId, selectTeam, createTeam, updateTeam, customCategories, updateCustomCategories, teamSettings, updateTeamSettings } = useTeam();
  const [teamName, setTeamName] = useState('');
  const [homeStadium, setHomeStadium] = useState('');
  const [settings, setSettings] = useState<TeamSettings>({ crestUrl: '', defaultFormation: '4-3-3' });
  const [savedNotice, setSavedNotice] = useState(false);
  const [profileClubName, setProfileClubName] = useState('');
  const [showTeamsAdminModal, setShowTeamsAdminModal] = useState(false);
  const [showRfafModal, setShowRfafModal] = useState(false);

  useEffect(() => {
    if (activeTeam) {
      setTeamName(activeTeam.name);
    }
  }, [activeTeam]);

  useEffect(() => {
    if (teamSettings) {
      setSettings(teamSettings);
      setHomeStadium(teamSettings.homeStadium || '');
    }
  }, [teamSettings]);

  const saveSettings = async () => {
    if (activeTeam) {
      updateTeam(activeTeam.id, {
        name: teamName,
        modality: activeTeam.modality,
      });
      updateTeamSettings({ ...settings, homeStadium });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2400);
    }
  };

  const exportStatsToCSV = async () => {
    if (!activeTeamId) return;
    try {
      const history = await db.getMatches(activeTeamId);
      const { aggregatePlayerStats } = await import('../services/playerStatsAggregator');
      const stats = aggregatePlayerStats(activeTeam?.players || [], history, activeTeamId);

      const headers = ['Jugador', 'Dorsal', 'Partidos', 'Titular', 'Minutos', 'Goles', 'Asistencias', 'Amarillas', 'Rojas', 'Nota Media'];
      const csvContent = [
        headers.join(','),
        ...stats.map(s =>
          [s.name, s.number, s.matches, s.starts, s.minutesPlayed, s.goals, s.assists, s.yellows, s.reds, s.averageRating].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'estadisticas_plantilla.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Error exportando estadísticas.');
    }
  };

  if (!activeTeam) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white border border-slate-200 rounded-lg p-12 text-center gap-4 shadow-xs">
        <Shield className="w-8 h-8 text-slate-400" />
        <h2 className="text-[16px] font-semibold text-slate-900">Ningún equipo seleccionado</h2>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <button
            onClick={() => setShowTeamsAdminModal(true)}
            className="h-9 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[12px] font-medium flex items-center gap-2 cursor-pointer"
          >
            ⚙️ Administrar Equipos
          </button>
          <button
            onClick={() => createTeam(profileClubName && !/^sin\s*equipo$/i.test(profileClubName) ? profileClubName : 'Nuevo Equipo', 'F11')}
            className="h-9 px-4 bg-[#059669] hover:bg-[#047857] text-white rounded-md text-[12px] font-semibold flex items-center gap-2 cursor-pointer"
          >
            ➕ Crear Nuevo Equipo
          </button>
        </div>
        {showTeamsAdminModal && (
          <Suspense fallback={null}>
            <TeamsAdminModal onClose={() => setShowTeamsAdminModal(false)} />
          </Suspense>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 tracking-[-0.025em] mb-1">Configuración del Proyecto</h1>
          <p className="text-[13px] text-slate-600">Parámetros generales del club, identidad visual, modelo táctico y exportación de datos.</p>
        </div>
        <button
          onClick={saveSettings}
          className="h-8 px-4 rounded-md bg-[#059669] text-white hover:bg-[#047857] text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          {savedNotice ? 'Guardado' : 'Guardar Cambios'}
        </button>
      </div>

      <TeamWorkspaceSection
        teams={teams}
        activeTeamId={activeTeamId}
        selectTeam={selectTeam}
        createTeam={createTeam}
        defaultClubName={profileClubName}
        onOpenTeamsAdmin={() => setShowTeamsAdminModal(true)}
        onOpenRfafModal={() => setShowRfafModal(true)}
      />

      <CoachProfileSection onClubNameLoaded={setProfileClubName} />

      <ClubIdentityAndMethodologySection
        modality={activeTeam.modality}
        teamName={teamName}
        onChangeTeamName={setTeamName}
        homeStadium={homeStadium}
        onChangeHomeStadium={setHomeStadium}
        crestUrl={settings.crestUrl}
        onChangeCrestUrl={crestUrl => setSettings({ ...settings, crestUrl })}
        defaultFormation={settings.defaultFormation}
        onChangeDefaultFormation={defaultFormation => setSettings({ ...settings, defaultFormation })}
        customCategories={customCategories}
        onUpdateCategories={updateCustomCategories}
      />

      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-600" />
          <h2 className="text-[13px] font-semibold text-slate-900">Configuración de Estadísticas y Métricas del Entrenador</h2>
        </div>
        <div className="p-5">
          <MetricsConfigPanel />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900 mb-0.5">Exportación de Datos Brutos (CSV)</h2>
          <p className="text-[12px] text-slate-600">Descarga una instantánea en texto plano con las métricas acumuladas de la plantilla.</p>
        </div>
        <button
          onClick={exportStatsToCSV}
          className="h-8 px-3.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[12px] font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Descargar CSV
        </button>
      </section>

      <AccountLegalSection />

      {showTeamsAdminModal && (
        <Suspense fallback={null}>
          <TeamsAdminModal onClose={() => setShowTeamsAdminModal(false)} />
        </Suspense>
      )}

      <RfafSyncModal isOpen={showRfafModal} onClose={() => setShowRfafModal(false)} />
    </div>
  );
}
