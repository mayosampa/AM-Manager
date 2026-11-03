import React, { useState } from 'react';
import { Calendar, Check, Shield, Trophy, Users, X } from 'lucide-react';
import { useTeam } from '../../../context/TeamContext';
import { FedStandingRow } from '../../../types';
import { syncRivalsFromStandings } from '../../../services/rfafConnectorService';
import { RfafSquadTab } from './RfafSquadTab';
import { RfafCalendarTab } from './RfafCalendarTab';
import { RfafStandingsTab } from './RfafStandingsTab';

interface RfafSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'squad' | 'calendar' | 'standings';
  onCalendarUpdated?: () => void;
}

export const RfafSyncModal: React.FC<RfafSyncModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'squad',
  onCalendarUpdated,
}) => {
  const { activeTeam, teamSettings, updateTeamPlayers, updateTeamSettings } = useTeam();
  const [activeTab, setActiveTab] = useState<'squad' | 'calendar' | 'standings'>(initialTab);

  const existingLink = teamSettings?.rfafLink;
  const initialSharedUrl =
    existingLink?.competitionUrl ||
    existingLink?.rfafCalendarUrl ||
    existingLink?.rfafStandingsUrl ||
    existingLink?.rfafTeamUrl ||
    '';

  const [clubRfaf, setClubRfaf] = useState(existingLink?.clubRfaf || activeTeam?.name || '');
  const [competicion, setCompeticion] = useState(existingLink?.competicion || '2ª Andaluza Sénior');
  const [grupo, setGrupo] = useState(existingLink?.grupo || 'Grupo 2');
  const [rfafTeamUrl, setRfafTeamUrl] = useState(existingLink?.rfafTeamUrl || initialSharedUrl);
  const [rfafCalendarUrl, setRfafCalendarUrl] = useState(existingLink?.rfafCalendarUrl || initialSharedUrl);
  const [rfafStandingsUrl, setRfafStandingsUrl] = useState(existingLink?.rfafStandingsUrl || initialSharedUrl);
  const [savedHeader, setSavedHeader] = useState(false);

  if (!isOpen || !activeTeam) return null;

  const handleSyncCompetitionUrl = (newUrl: string) => {
    setRfafTeamUrl(newUrl);
    setRfafCalendarUrl(newUrl);
    setRfafStandingsUrl(newUrl);
  };

  const persistRfafLinkPatch = async (patch: Record<string, any> = {}) => {
    await updateTeamSettings({
      rfafLink: {
        ...(teamSettings?.rfafLink || {}),
        clubRfaf: clubRfaf.trim() || activeTeam.name,
        competicion: competicion.trim(),
        grupo: grupo.trim(),
        competitionUrl: (rfafCalendarUrl || rfafStandingsUrl || rfafTeamUrl).trim(),
        rfafTeamUrl: rfafTeamUrl.trim(),
        rfafCalendarUrl: rfafCalendarUrl.trim(),
        rfafStandingsUrl: rfafStandingsUrl.trim(),
        ...patch,
      },
    });
  };

  const handleSaveHeader = async () => {
    await persistRfafLinkPatch();
    setSavedHeader(true);
    setTimeout(() => setSavedHeader(false), 2000);
  };

  const handleSaveStandings = async (rows: FedStandingRow[]) => {
    await persistRfafLinkPatch({ standings: rows, lastStandingsSyncAt: new Date().toISOString() });
    await syncRivalsFromStandings(activeTeam.id, clubRfaf || activeTeam.name, rows);
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0A0A0A] border border-[#242424] rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-[#1F1F1F] bg-[#0D0D0D] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#EDEDED]">Conexión Oficial de Competición · {activeTeam.name}</h2>
              <p className="text-[11px] text-[#888888]">
                Conecta tu equipo a su grupo oficial para auto-rellenar plantilla, calendario y clasificación. (Las sanciones llegan desde QuintaAmarilla).
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-[#888888] hover:text-white hover:bg-[#1A1A1A] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 bg-[#080808] border-b border-[#1A1A1A] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <div className="sm:col-span-4">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mb-1">Nombre Oficial del Club en Acta</label>
            <input
              type="text"
              value={clubRfaf}
              onChange={e => setClubRfaf(e.target.value)}
              placeholder="Ej: C.D. ÁLORA"
              className="w-full h-8 bg-[#050505] border border-[#262626] rounded px-2.5 text-[12px] font-semibold text-[#EDEDED]"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mb-1">Competición Oficial</label>
            <input
              type="text"
              value={competicion}
              onChange={e => setCompeticion(e.target.value)}
              placeholder="Ej: 2ª División Sénior"
              className="w-full h-8 bg-[#050505] border border-[#262626] rounded px-2.5 text-[12px] text-[#EDEDED]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mb-1">Grupo</label>
            <input
              type="text"
              value={grupo}
              onChange={e => setGrupo(e.target.value)}
              placeholder="Grupo 2"
              className="w-full h-8 bg-[#050505] border border-[#262626] rounded px-2.5 text-[12px] text-[#EDEDED]"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleSaveHeader}
              className="w-full h-8 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savedHeader ? 'Vinculado' : 'Fijar Club'}</span>
            </button>
          </div>
        </div>

        <div className="px-5 pt-3 border-b border-[#1F1F1F] bg-[#0A0A0A] flex gap-2 overflow-x-auto">
          {[
            { id: 'squad', label: '1. Plantilla Oficial (Auto-Rellenar y Validar)', icon: Users },
            { id: 'calendar', label: '2. Calendario Oficial y Rivales', icon: Calendar },
            { id: 'standings', label: '3. Clasificación del Grupo', icon: Trophy },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-t-lg text-[12px] font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  active ? 'border-emerald-500 text-emerald-400 bg-[#111814]' : 'border-transparent text-[#888888] hover:text-[#EDEDED]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'squad' && (
            <RfafSquadTab
              clubName={clubRfaf || activeTeam.name}
              players={activeTeam.players || []}
              unmatchedSanciones={existingLink?.unmatchedSanciones || []}
              rfafTeamUrl={rfafTeamUrl}
              onChangeUrl={handleSyncCompetitionUrl}
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
              homeStadium={activeTeam.homeStadium || teamSettings?.homeStadium}
              rfafCalendarUrl={rfafCalendarUrl}
              onChangeUrl={handleSyncCompetitionUrl}
              onCalendarImported={async () => {
                await persistRfafLinkPatch({ lastCalendarSyncAt: new Date().toISOString() });
                onCalendarUpdated?.();
              }}
            />
          )}
          {activeTab === 'standings' && (
            <RfafStandingsTab
              clubRfaf={clubRfaf || activeTeam.name}
              initialStandings={existingLink?.standings || []}
              rfafStandingsUrl={rfafStandingsUrl}
              onChangeUrl={handleSyncCompetitionUrl}
              onSaveStandings={handleSaveStandings}
            />
          )}
        </div>
      </div>
    </div>
  );
};
