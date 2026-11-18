import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import { useRivalEditorState } from '../hooks/useRivalEditorState';
import { RivalsLeagueOverview } from './RivalsLeagueOverview';
import { RivalDetailToolbar } from './RivalDetailToolbar';
import { RivalAddClubInlineBar } from './RivalAddClubInlineBar';
import { RivalClubAndNotesSection } from './RivalClubAndNotesSection';
import { RivalTacticalSection } from './RivalTacticalSection';

export const RivalsScreen: React.FC = () => {
  const { activeTeam, teamSettings } = useTeam();
  const teamId = activeTeam?.id;
  const teamName = activeTeam?.name || 'Mi Equipo';
  const ownClubName =
    teamSettings?.officialCompetitionLink?.officialTeamName ||
    teamSettings?.rfafLink?.clubRfaf ||
    teamName;
  const standings = teamSettings?.rfafLink?.standings || [];

  const [viewLevel, setViewLevel] = useState<'overview' | 'detail'>('overview');

  const {
    profiles,
    summary,
    activeProfile,
    h2h,
    selectedRivalId,
    setSelectedRivalId,
    draft,
    setDraft,
    isAddingClub,
    setIsAddingClub,
    newClubName,
    setNewClubName,
    newClubStadium,
    setNewClubStadium,
    toastMsg,
    selectRivalById,
    createClub,
    saveDraft,
    deleteDraft,
    updateScouting,
    copyWhatsApp,
    exportPdf,
    quickExportPdf,
  } = useRivalEditorState({
    teamId,
    teamName,
    ownClubName,
    standings,
  });

  useEffect(() => {
    setViewLevel('overview');
    setSelectedRivalId('');
    setDraft(null);
  }, [teamId, setSelectedRivalId, setDraft]);

  const handleOpenRivalDetail = (id: string) => {
    if (selectRivalById(id)) {
      setViewLevel('detail');
    }
  };

  const handleCreateClub = async () => {
    const created = await createClub();
    if (created) {
      setViewLevel('detail');
    }
  };

  const handleDeleteClub = async () => {
    const deleted = await deleteDraft();
    if (deleted) {
      setViewLevel('overview');
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 pb-20 space-y-5">
      {toastMsg && (
        <div className="bg-[#111111] border border-[#2E2E2E] rounded-md px-4 py-2.5 text-[12px] font-medium text-[#EDEDED] flex items-center justify-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> {toastMsg}
        </div>
      )}

      {isAddingClub && (
        <RivalAddClubInlineBar
          newClubName={newClubName}
          newClubStadium={newClubStadium}
          onChangeName={setNewClubName}
          onChangeStadium={setNewClubStadium}
          onCreate={handleCreateClub}
          onCancel={() => setIsAddingClub(false)}
        />
      )}

      {viewLevel === 'overview' ? (
        <RivalsLeagueOverview
          profiles={profiles}
          summary={summary}
          onSelectRival={handleOpenRivalDetail}
          onExportPdf={quickExportPdf}
          onToggleAddClub={() => setIsAddingClub(prev => !prev)}
        />
      ) : (
        <div className="space-y-5">
          <RivalDetailToolbar
            profiles={profiles}
            selectedRivalId={selectedRivalId}
            hasDraft={Boolean(draft)}
            onBackToOverview={() => setViewLevel('overview')}
            onSelectRival={handleOpenRivalDetail}
            onToggleAddClub={() => setIsAddingClub(prev => !prev)}
            onCopyWhatsApp={copyWhatsApp}
            onExportPdf={exportPdf}
            onSave={saveDraft}
          />
          {!draft ? (
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-12 text-center text-zinc-500 text-sm">
              Selecciona un club del desplegable o vuelve a la vista general para comenzar su análisis táctico.
            </div>
          ) : (
            <div className="space-y-5">
              <RivalClubAndNotesSection
                draft={draft}
                h2h={h2h}
                profile={activeProfile}
                onChangeDraft={setDraft}
                onUpdateScouting={updateScouting}
                onDeleteClub={handleDeleteClub}
              />
              <RivalTacticalSection scouting={draft.scouting} onChange={updateScouting} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
