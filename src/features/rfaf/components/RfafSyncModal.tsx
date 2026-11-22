import React, { useEffect, useState } from 'react';
import { Calendar, Check, Loader2, Shield, Trophy, Users, X } from 'lucide-react';
import { useRfafModalSync } from '../hooks/useRfafModalSync';
import { RfafGuidedSelector } from './RfafGuidedSelector';
import { RfafSquadTab } from './RfafSquadTab';
import { RfafCalendarTab } from './RfafCalendarTab';
import { RfafStandingsTab } from './RfafStandingsTab';

interface RfafSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'squad' | 'calendar' | 'standings';
  onCalendarUpdated?: () => void;
}

const MODAL_TABS = [
  { id: 'squad', label: '1. Plantilla Oficial (Auto-Rellenar y Validar)', icon: Users },
  { id: 'calendar', label: '2. Calendario Oficial y Rivales', icon: Calendar },
  { id: 'standings', label: '3. Clasificación del Grupo', icon: Trophy },
] as const;

export const RfafSyncModal: React.FC<RfafSyncModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'squad',
  onCalendarUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'squad' | 'calendar' | 'standings'>(initialTab);
  const {
    activeTeam,
    teamSettings,
    existingLink,
    existingOfficial,
    clubRfaf,
    competicion,
    grupo,
    sharedUrl,
    setSharedUrl,
    syncingAll,
    savingAll,
    syncSummary,
    syncError,
    syncedCandidates,
    syncedMatches,
    syncedClubs,
    syncedStandings,
    updateTeamPlayers,
    persistRfafLinkPatch,
    handleSelectionChange,
    handleSyncAll,
    handleSaveStandings,
    handleSaveAndApplyAll,
  } = useRfafModalSync(onCalendarUpdated);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeTeam) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rfaf-sync-modal-title"
      className="fixed inset-0 z-[160] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Shield className="w-4.5 h-4.5 text-[#059669]" />
            </div>
            <div>
              <h2 id="rfaf-sync-modal-title" className="text-[15px] font-semibold text-slate-900">Conexión Oficial de Competición · {activeTeam.name}</h2>
              <p className="text-[11px] text-slate-500">
                Elige tu competición, grupo y equipo para sincronizar en 1 clic plantilla, calendario, rivales y clasificación.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <RfafGuidedSelector
          activeTeamName={activeTeam.name}
          initialLink={existingOfficial}
          fallbackCompName={existingLink?.competicion}
          fallbackGroupName={existingLink?.grupo}
          fallbackClubName={existingLink?.clubRfaf}
          syncingAll={syncingAll}
          syncSummary={syncSummary}
          syncError={syncError}
          onSelectionChange={handleSelectionChange}
          onSyncAll={handleSyncAll}
        />

        <div className="px-5 pt-2.5 border-b border-slate-200 bg-white flex gap-2 overflow-x-auto">
          {MODAL_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-t-lg text-[12px] font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  active ? 'border-[#059669] text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar bg-white">
          {activeTab === 'squad' && (
            <RfafSquadTab
              clubName={clubRfaf || activeTeam.name}
              players={activeTeam.players || []}
              unmatchedSanciones={existingLink?.unmatchedSanciones || []}
              rfafTeamUrl={sharedUrl}
              syncedCandidates={syncedCandidates}
              onChangeUrl={setSharedUrl}
              onApplySquad={async res => {
                await updateTeamPlayers(res.updatedPlayers);
                await persistRfafLinkPatch({ unmatchedSanciones: res.remainingUnmatched, lastSyncAt: new Date().toISOString() });
              }}
            />
          )}
          {activeTab === 'calendar' && (
            <RfafCalendarTab
              teamId={activeTeam.id}
              clubRfaf={clubRfaf || activeTeam.name}
              competicion={competicion}
              grupo={grupo}
              homeStadium={activeTeam.homeStadium || teamSettings?.homeStadium}
              rfafCalendarUrl={sharedUrl}
              syncedMatches={syncedMatches}
              syncedClubs={syncedClubs}
              onChangeUrl={setSharedUrl}
              onCalendarImported={async () => {
                await persistRfafLinkPatch({ lastCalendarSyncAt: new Date().toISOString() });
                onCalendarUpdated?.();
              }}
            />
          )}
          {activeTab === 'standings' && (
            <RfafStandingsTab
              clubRfaf={clubRfaf || activeTeam.name}
              initialStandings={syncedStandings || existingLink?.standings || []}
              rfafStandingsUrl={sharedUrl}
              onChangeUrl={setSharedUrl}
              onSaveStandings={handleSaveStandings}
            />
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-[11px] text-slate-600">
            Al pulsar <strong className="text-emerald-700">⚡ Sincronizar Todo</strong> se descargan y aplican automáticamente Plantilla, Calendario, Rivales y Clasificación.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveAndApplyAll}
              disabled={savingAll || syncingAll}
              className="h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-semibold text-[12px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>✓ Guardar y Aplicar Todo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
