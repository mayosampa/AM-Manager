import { useState, useEffect } from 'react';
import { PositionGroup, Player } from '../types';
import { Search, Edit2, Activity, Plus, Trash2, X, Users, Archive, Printer, Loader2 } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { useTeamStats } from '../hooks/useTeamStats';
import { isActiveRoster, isCallable, getAvailabilityInfo } from '../features/squad/domain/availability';
import { POSITION_CATALOG, LINE_GROUPS, getGroupForPosition, getPlayerLine, isCatalogPosition } from '../features/squad/domain/positions';
import { formatAge, isValidBirthDate } from '../features/squad/domain/age';
import { resolveCrestForPdf } from '../shared/services/crestImage';
import { downloadRosterPdf } from '../features/squad/services/rosterPdf';

function AvailabilityIndicator({ player }: { player: Player }) {
  const info = getAvailabilityInfo(player);
  const dotClass =
    info.state === 'available'
      ? 'bg-emerald-500'
      : info.state === 'injured'
      ? 'bg-amber-500'
      : info.state === 'suspended'
      ? 'bg-red-500'
      : 'bg-[#525252]';

  return (
    <span
      title={info.label}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111111] border border-[#262626] font-mono text-[10px] text-[#A1A1AA] shrink-0 uppercase"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {info.shortLabel}
    </span>
  );
}

export function TeamManagement() {
  const { activeTeam, updateTeamPlayers, teamSettings } = useTeam();
  const teamStats = useTeamStats();
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerForm, setPlayerForm] = useState<Partial<Player>>({});
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);

  const [activeTab, setActiveTab] = useState<PositionGroup>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const players = (activeTeam?.players || []).filter(Boolean);
  const crestUrl = activeTeam?.crestUrl || teamSettings?.crestUrl;

  const handleOpenEditPlayer = (player: Player) => {
    setPlayerForm(player);
    setIsEditingPlayer(true);
    setFormError('');
    setShowPlayerModal(true);
  };

  const generatePDF = async () => {
    if (!activeTeam || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const crest = await resolveCrestForPdf(crestUrl);
      downloadRosterPdf({ teamName: activeTeam.name, crest, players: activeTeam.players });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('No se pudo generar el PDF de la plantilla.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const saveRosterQuietly = (nextPlayers: Player[]) => {
    updateTeamPlayers(nextPlayers).catch(() => undefined);
  };

  const hasDuplicateNumber = (number: number, ignoreId?: string) =>
    (activeTeam?.players || []).some(p => !!p && p.id !== ignoreId && isActiveRoster(p) && p.number === number);

  const savePlayer = async () => {
    if (!activeTeam || isSavingPlayer) return;

    const name = (playerForm.name || '').trim();
    if (!name) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    const number = playerForm.number;
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 0 || number > 99) {
      setFormError('Introduce un dorsal válido (entre 0 y 99).');
      return;
    }
    const willBeActive = playerForm.isActive !== false;
    if (willBeActive && hasDuplicateNumber(number, isEditingPlayer ? playerForm.id : undefined)) {
      setFormError(`El dorsal ${number} ya lo lleva otro jugador activo del equipo.`);
      return;
    }

    const position = (playerForm.position || '').trim();
    const line = getGroupForPosition(position) ?? (isEditingPlayer ? getPlayerLine(playerForm) : null);
    if (!line) {
      setFormError('Selecciona la posición principal.');
      return;
    }

    if (playerForm.birthDate && !isValidBirthDate(playerForm.birthDate)) {
      setFormError('La fecha de nacimiento no es válida (no puede ser futura ni anterior a 1900).');
      return;
    }

    const cleaned: Partial<Player> = {
      ...playerForm,
      name,
      number,
      position,
      positionGroup: line,
      secondaryPosition: playerForm.secondaryPosition || undefined,
      birthDate: playerForm.birthDate || undefined,
    };

    let currentPlayers = [...activeTeam.players];

    if (isEditingPlayer) {
      currentPlayers = currentPlayers.map(p => (p.id === cleaned.id ? ({ ...p, ...cleaned } as Player) : p));
    } else {
      const newPlayer: Player = {
        ...cleaned,
        id: Math.random().toString(36).slice(2, 11),
        form: 80,
        minutes: 0,
        status: cleaned.status || 'available',
        height: cleaned.height || '',
        foot: cleaned.foot || 'Diestro',
        stats: { matchesPlayed: 0, minutesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
        attendance: { trainingPercentage: 100, matchPercentage: 100 },
        evaluations: [],
        notes: cleaned.notes || '',
      } as Player;
      currentPlayers.push(newPlayer);
    }

    setIsSavingPlayer(true);
    try {
      await updateTeamPlayers(currentPlayers);
      setFormError('');
      setShowPlayerModal(false);
    } catch (e) {
      setFormError('No se pudo guardar el jugador en Supabase. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const deletePlayer = (id: string) => {
    if (!activeTeam) return;
    if (
      !window.confirm(
        '¿Estás seguro de eliminar DEFINITIVAMENTE a este jugador? Sus datos históricos se perderán de su ficha, aunque seguirán en el historial de partidos.'
      )
    )
      return;

    const currentPlayers = activeTeam.players.filter(p => p.id !== id);
    saveRosterQuietly(currentPlayers);
    if (selectedPlayerId === id) setSelectedPlayerId('');
  };

  const archivePlayer = (id: string) => {
    if (!activeTeam) return;
    if (!window.confirm('¿Quieres dar de baja a este jugador? Desaparecerá de la plantilla activa pero conservará su ficha.'))
      return;

    const currentPlayers = activeTeam.players.map(p => (p.id === id ? { ...p, isActive: false } : p));
    saveRosterQuietly(currentPlayers);
    if (selectedPlayerId === id) setSelectedPlayerId('');
  };

  const restorePlayer = (id: string) => {
    if (!activeTeam) return;
    const target = activeTeam.players.find(p => p.id === id);
    if (target && hasDuplicateNumber(target.number, id)) {
      window.alert(
        `No se puede restaurar a este jugador: el dorsal ${target.number} ya lo lleva otro jugador activo. Edita el dorsal de uno de los dos primero.`
      );
      return;
    }
    const currentPlayers = activeTeam.players.map(p => (p.id === id ? { ...p, isActive: true } : p));
    saveRosterQuietly(currentPlayers);
    if (selectedPlayerId === id) setSelectedPlayerId('');
  };

  const filteredPlayers = players.filter(p => {
    const logicalGroup = getPlayerLine(p);
    const matchesTab = activeTab === 'Todos' || logicalGroup === activeTab;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || players[0];

  const [notesDraft, setNotesDraft] = useState('');
  useEffect(() => {
    setNotesDraft(selectedPlayer?.notes || '');
  }, [selectedPlayer?.id, selectedPlayer?.notes]);

  const saveNotes = () => {
    if (!activeTeam || !selectedPlayer) return;
    if (notesDraft === (selectedPlayer.notes || '')) return;
    saveRosterQuietly(activeTeam.players.map(p => (p.id === selectedPlayer.id ? { ...p, notes: notesDraft } : p)));
  };

  if (!activeTeam) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-12 text-center">
        <Users className="w-8 h-8 text-[#666666] mb-3" />
        <h2 className="text-[16px] font-semibold text-[#EDEDED] mb-1">Ningún equipo seleccionado</h2>
        <p className="text-[13px] text-[#737373]">Selecciona o crea un equipo desde el Panel General para gestionar su plantilla.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-6 pb-16">
      {/* Top KPI Hairline Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[#1F1F1F] border border-[#1F1F1F] rounded-lg overflow-hidden">
        <div className="bg-[#0A0A0A] px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider">Plantilla Activa</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#EDEDED]" />
          </div>
          <span className="font-mono text-[20px] font-semibold text-[#EDEDED]">{players.filter(isActiveRoster).length}</span>
        </div>
        <div className="bg-[#0A0A0A] px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider">Disponibles</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="font-mono text-[20px] font-semibold text-[#EDEDED]">{players.filter(isCallable).length}</span>
        </div>
        <div className="bg-[#0A0A0A] px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider">Lesionados</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          </div>
          <span className="font-mono text-[20px] font-semibold text-[#EDEDED]">
            {players.filter(p => isActiveRoster(p) && p.status === 'injured').length}
          </span>
        </div>
        <div className="bg-[#0A0A0A] px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider">Sancionados</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <span className="font-mono text-[20px] font-semibold text-[#EDEDED]">
            {players.filter(p => isActiveRoster(p) && p.isSuspended).length}
          </span>
        </div>
        <div className="bg-[#0A0A0A] px-4 py-3 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-[#737373] uppercase tracking-wider">Ausentes</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#525252]" />
          </div>
          <span className="font-mono text-[20px] font-semibold text-[#EDEDED]">
            {players.filter(p => isActiveRoster(p) && p.status === 'unavailable').length}
          </span>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row items-start gap-6">
        {/* Left Column - List */}
        <div className="w-full xl:w-[56%] flex flex-col gap-3">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row justify-between gap-2.5 items-stretch sm:items-center">
            <div className="flex overflow-x-auto whitespace-nowrap gap-1 bg-[#0A0A0A] p-1 rounded-md border border-[#1F1F1F] custom-scrollbar">
              {(['Todos', 'Porteros', 'Defensas', 'Medios', 'Delanteros'] as PositionGroup[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-7 px-3 rounded-[4px] text-[12px] font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-[#EDEDED] text-[#0A0A0A]'
                      : 'text-[#888888] hover:text-[#EDEDED] hover:bg-[#141414]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 bg-[#0A0A0A] border border-[#1F1F1F] rounded-md pl-8 pr-3 text-[12px] text-[#EDEDED] placeholder:text-[#666666] focus:outline-none focus:border-[#404040]"
                />
              </div>
              <button
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="h-8 px-2.5 bg-[#0A0A0A] border border-[#1F1F1F] text-[#EDEDED] rounded-md hover:bg-[#141414] hover:border-[#3A3A3A] transition-colors flex items-center justify-center gap-1.5 text-[12px] font-medium disabled:opacity-50"
                title="Exportar Plantilla PDF"
              >
                {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5 text-[#888888]" />}
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={() => {
                  setPlayerForm({});
                  setIsEditingPlayer(false);
                  setFormError('');
                  setShowPlayerModal(true);
                }}
                className="h-8 px-3 bg-[#EDEDED] text-[#0A0A0A] rounded-md hover:bg-white transition-colors flex items-center gap-1.5 text-[12px] font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>

          {/* Roster Table Card */}
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 bg-[#0D0D0D] border-b border-[#1F1F1F] text-[11px] font-medium text-[#737373] uppercase tracking-[0.05em]">
              <div className="col-span-5">Jugador</div>
              <div className="col-span-2">Demarcación</div>
              <div className="col-span-2">Valoración</div>
              <div className="col-span-3 text-right">Minutos / Estado</div>
            </div>

            <div className="divide-y divide-[#171717]">
              {filteredPlayers.map(player => {
                const pStats = teamStats.find(s => String(s.playerId) === String(player.id));
                const isSelected = selectedPlayer?.id === player.id;
                const rating = pStats?.averageRating || 0;
                const hasRating = rating > 0;

                return (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    onDoubleClick={() => handleOpenEditPlayer(player)}
                    title="Doble clic para editar"
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-2.5 items-center cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#141414]' : 'hover:bg-[#0F0F0F]'
                    } ${player.isActive === false ? 'opacity-45' : ''}`}
                  >
                    <div className="col-span-1 sm:col-span-5 flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-md font-mono text-[12px] font-semibold flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-[#EDEDED] text-[#0A0A0A] border-white'
                            : 'bg-[#111111] text-[#A1A1AA] border-[#262626]'
                        }`}
                      >
                        {player.number}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-medium text-[#EDEDED] text-[13px] truncate">{player.name}</h4>
                        <p className="text-[11px] text-[#666666] sm:hidden">{player.position}</p>
                      </div>
                    </div>

                    <div className="hidden sm:block col-span-2 font-mono text-[12px] text-[#A1A1AA]">{player.position}</div>

                    <div className="col-span-1 sm:col-span-2 flex items-center">
                      <span
                        className={`font-mono px-2 py-0.5 rounded text-[11px] font-medium border ${
                          hasRating
                            ? rating >= 7
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : rating >= 5
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-[#111111] text-[#666666] border-[#222222]'
                        }`}
                      >
                        {hasRating ? `${rating.toFixed(1)}` : '—'}
                      </span>
                    </div>

                    <div className="col-span-1 sm:col-span-3 flex items-center justify-between sm:justify-end gap-2">
                      <span className="font-mono text-[12px] text-[#A1A1AA]">{pStats?.minutesPlayed || 0}'</span>
                      <AvailabilityIndicator player={player} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditPlayer(player);
                        }}
                        className="p-1.5 rounded-md text-[#666666] hover:text-[#EDEDED] hover:bg-[#1F1F1F] transition-colors shrink-0"
                        title="Editar jugador"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredPlayers.length === 0 && (
                <div className="text-center py-10 text-[13px] text-[#666666]">
                  No se encontraron jugadores en este filtro.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Player Detail */}
        <div className="w-full xl:w-[44%] xl:sticky xl:top-6">
          <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-5 max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
            {selectedPlayer ? (
              <>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-5 mb-5 border-b border-[#1F1F1F]">
                  <div className="flex gap-3.5">
                    <div className="w-14 h-14 rounded-lg bg-[#111111] border border-[#262626] flex items-center justify-center font-mono font-semibold text-[22px] text-[#EDEDED] shrink-0">
                      {selectedPlayer.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap font-mono text-[11px]">
                        <span className="text-[#EDEDED]">#{selectedPlayer.number}</span>
                        <span className="text-[#404040]">/</span>
                        <span className="text-[#A1A1AA]">{getPlayerLine(selectedPlayer) || 'Jugador'}</span>
                        {selectedPlayer.secondaryPosition && (
                          <>
                            <span className="text-[#404040]">·</span>
                            <span className="text-[#737373]">{selectedPlayer.secondaryPosition}</span>
                          </>
                        )}
                      </div>
                      <h2 className="text-[18px] font-semibold text-[#EDEDED] tracking-[-0.02em] mb-2 flex items-center gap-2">
                        {selectedPlayer.name}
                        {selectedPlayer.isActive === false && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded uppercase">
                            Baja
                          </span>
                        )}
                      </h2>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                        <span className="px-2 py-0.5 bg-[#111111] border border-[#222222] rounded text-[#A1A1AA]">
                          {formatAge(selectedPlayer.birthDate)}
                        </span>
                        <span className="px-2 py-0.5 bg-[#111111] border border-[#222222] rounded text-[#A1A1AA]">
                          {selectedPlayer.height || '—'}
                        </span>
                        {selectedPlayer.weight && (
                          <span className="px-2 py-0.5 bg-[#111111] border border-[#222222] rounded text-[#A1A1AA]">
                            {selectedPlayer.weight} kg
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-[#111111] border border-[#222222] rounded text-[#A1A1AA]">
                          {selectedPlayer.foot || 'Diestro'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setPlayerForm(selectedPlayer);
                        setIsEditingPlayer(true);
                        setFormError('');
                        setShowPlayerModal(true);
                      }}
                      className="p-2 rounded-md border border-[#262626] bg-[#111111] text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {selectedPlayer.isActive !== false ? (
                      <button
                        onClick={() => archivePlayer(selectedPlayer.id)}
                        className="p-2 rounded-md border border-[#262626] bg-[#111111] text-[#A1A1AA] hover:text-amber-400 hover:bg-[#1A1A1A] transition-colors"
                        title="Dar de baja"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => restorePlayer(selectedPlayer.id)}
                        className="p-2 rounded-md border border-[#262626] bg-[#111111] text-[#A1A1AA] hover:text-emerald-400 hover:bg-[#1A1A1A] transition-colors"
                        title="Restaurar jugador"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deletePlayer(selectedPlayer.id)}
                      className="p-2 rounded-md border border-[#262626] bg-[#111111] text-[#A1A1AA] hover:text-red-400 hover:border-red-500/30 transition-colors"
                      title="Eliminar definitivamente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rendimiento Acumulado */}
                <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373] mb-2.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Métricas de Temporada
                </h3>
                <div className="grid grid-cols-3 gap-px bg-[#1F1F1F] border border-[#1F1F1F] rounded-md overflow-hidden mb-6">
                  {(() => {
                    const s = (teamStats.find(s => String(s.playerId) === String(selectedPlayer.id)) || {}) as any;
                    const matches = s.matches || 0;
                    const starts = s.starts || 0;
                    const callUps = s.callUps || 0;
                    const mins = s.minutesPlayed || 0;
                    const startRatio = callUps > 0 ? Math.round((starts / callUps) * 100) : 0;
                    const avgMins = matches > 0 ? Math.round(mins / matches) : 0;
                    const isGK = selectedPlayer.position === 'POR' || selectedPlayer.position === 'PT';
                    const impactLabel = isGK ? 'Porterías a Cero' : 'Impacto (G+A)';
                    const impactValue = isGK ? `${s.cleanSheets || 0}` : `${(s.goals || 0) + (s.assists || 0)}`;

                    return (
                      <>
                        <div className="bg-[#0A0A0A] p-3">
                          <span className="text-[#666666] text-[10px] uppercase font-medium block mb-1">Ratio Titular</span>
                          <span className="font-mono text-[15px] font-semibold text-[#EDEDED]">
                            {startRatio}% <span className="text-[11px] text-[#666666]">({starts}/{callUps})</span>
                          </span>
                        </div>
                        <div className="bg-[#0A0A0A] p-3">
                          <span className="text-[#666666] text-[10px] uppercase font-medium block mb-1">Min / Partido</span>
                          <span className="font-mono text-[15px] font-semibold text-[#EDEDED]">{avgMins}'</span>
                        </div>
                        <div className="bg-[#0A0A0A] p-3">
                          <span className="text-[#666666] text-[10px] uppercase font-medium block mb-1">{impactLabel}</span>
                          <span className="font-mono text-[15px] font-semibold text-[#EDEDED]">{impactValue}</span>
                        </div>
                        <div className="bg-[#0A0A0A] p-3">
                          <span className="text-[#666666] text-[10px] uppercase font-medium block mb-1">Partidos</span>
                          <span className="font-mono text-[15px] font-semibold text-[#EDEDED]">{matches}</span>
                        </div>
                        <div className="bg-[#0A0A0A] p-3">
                          <span className="text-[#666666] text-[10px] uppercase font-medium block mb-1">Goles / Asist.</span>
                          <span className="font-mono text-[15px] font-semibold text-[#EDEDED]">
                            {s.goals || 0} / {s.assists || 0}
                          </span>
                        </div>
                        <div className="bg-[#0A0A0A] p-3">
                          <span className="text-[#666666] text-[10px] uppercase font-medium block mb-1">Tarjetas (A/R)</span>
                          <span className="font-mono text-[15px] font-semibold text-[#EDEDED]">
                            {s.yellows || 0} / {s.reds || 0}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Historial de Evaluaciones */}
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373]">
                    Evaluaciones Individuales
                  </h3>
                  <button
                    onClick={() => {
                      const rating = prompt('Puntuación (1-10):', '7');
                      const notes = prompt('Extracto / Evaluación:', 'Buen partido');
                      if (rating && notes) {
                        const updatedPlayer = {
                          ...selectedPlayer,
                          evaluations: [
                            {
                              matchId: `m-${Date.now()}`,
                              date: new Date().toLocaleDateString(),
                              rating: Number(rating),
                              notes,
                              opponent: 'Rival (Manual)',
                            },
                            ...(selectedPlayer.evaluations || []),
                          ],
                        };
                        const currentPlayers = activeTeam.players.map(p =>
                          p.id === selectedPlayer.id ? updatedPlayer : p
                        );
                        saveRosterQuietly(currentPlayers);
                      }
                    }}
                    className="h-6 px-2 rounded bg-[#141414] border border-[#262626] hover:bg-[#1F1F1F] text-[#EDEDED] text-[11px] font-medium transition-colors"
                  >
                    + Añadir Nota
                  </button>
                </div>

                <div className="flex flex-col gap-2 mb-6 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                  {!selectedPlayer.evaluations || selectedPlayer.evaluations.length === 0 ? (
                    <p className="text-[12px] text-[#525252] py-3">Sin evaluaciones registradas.</p>
                  ) : (
                    selectedPlayer.evaluations.map((ev, i) => (
                      <div key={i} className="bg-[#0F0F0F] border border-[#1F1F1F] rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#666666] font-mono">{ev.date}</span>
                            {ev.opponent && (
                              <span className="text-[11px] font-medium text-[#EDEDED]">vs {ev.opponent}</span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-[#EDEDED] bg-[#161616] border border-[#262626] px-1.5 py-0.5 rounded">
                            {ev.rating}/10
                          </span>
                        </div>
                        {ev.notes && <p className="text-[12px] text-[#888888] mt-1">{ev.notes}</p>}
                      </div>
                    ))
                  )}
                </div>

                {/* Observaciones Generales */}
                <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#737373] mb-2">
                  Observaciones Médicas y Tácticas
                </h3>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={saveNotes}
                  className="w-full bg-[#050505] border border-[#262626] rounded-md p-3 text-[12px] text-[#EDEDED] placeholder:text-[#525252] focus:outline-none focus:border-[#525252] min-h-[90px] resize-none"
                  placeholder="Alergias, perfil táctico, molestias físicas..."
                />
              </>
            ) : (
              <div className="text-center py-12 text-[13px] text-[#666666]">
                Selecciona un jugador de la lista para ver su expediente.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] border border-[#262626] p-6 rounded-lg max-w-md w-full relative">
            <button
              onClick={() => setShowPlayerModal(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-[#EDEDED]"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-[16px] font-semibold text-[#EDEDED] mb-5">
              {isEditingPlayer ? 'Editar Ficha de Jugador' : 'Nuevo Jugador'}
            </h2>
            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-medium text-[#888888] block mb-1">Nombre Deportivo</label>
                <input
                  type="text"
                  value={playerForm.name || ''}
                  onChange={e => setPlayerForm({ ...playerForm, name: e.target.value })}
                  className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Dorsal</label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={playerForm.number ?? ''}
                    onChange={e => {
                      const parsed = parseInt(e.target.value, 10);
                      setPlayerForm({ ...playerForm, number: Number.isNaN(parsed) ? undefined : parsed });
                    }}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] font-mono text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Línea Táctica</label>
                  <div className="w-full h-9 bg-[#0F0F0F] border border-[#1F1F1F] rounded-md px-3 flex items-center text-[12px] text-[#737373] select-none">
                    {getPlayerLine(playerForm) || 'Automática'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Pos. Principal</label>
                  <select
                    value={playerForm.position || ''}
                    onChange={e => {
                      const position = e.target.value;
                      const line = getGroupForPosition(position);
                      setPlayerForm({ ...playerForm, position, ...(line ? { positionGroup: line } : {}) });
                    }}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                  >
                    <option value="" disabled>
                      Selecciona posición
                    </option>
                    {LINE_GROUPS.map(line => (
                      <optgroup key={line} label={line}>
                        {POSITION_CATALOG[line].map(option => (
                          <option key={option.code} value={option.code}>
                            {option.code} · {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {playerForm.position && !isCatalogPosition(playerForm.position) && (
                      <option value={playerForm.position}>{playerForm.position} (heredada)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Pos. Secundaria</label>
                  <select
                    value={playerForm.secondaryPosition || ''}
                    onChange={e => setPlayerForm({ ...playerForm, secondaryPosition: e.target.value })}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                  >
                    <option value="">Sin especificar</option>
                    {LINE_GROUPS.map(line => (
                      <optgroup key={line} label={line}>
                        {POSITION_CATALOG[line].map(option => (
                          <option key={option.code} value={option.code}>
                            {option.code} · {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {playerForm.secondaryPosition && !isCatalogPosition(playerForm.secondaryPosition) && (
                      <option value={playerForm.secondaryPosition}>{playerForm.secondaryPosition} (heredada)</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Fecha Nacimiento</label>
                  <input
                    type="date"
                    value={playerForm.birthDate || ''}
                    onChange={e => setPlayerForm({ ...playerForm, birthDate: e.target.value })}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] text-[#EDEDED] focus:border-[#525252] focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Pierna Dominante</label>
                  <select
                    value={playerForm.foot || 'Diestro'}
                    onChange={e => setPlayerForm({ ...playerForm, foot: e.target.value })}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                  >
                    <option value="Diestro">Diestro</option>
                    <option value="Zurdo">Zurdo</option>
                    <option value="Ambidiestro">Ambidiestro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Altura (m)</label>
                  <input
                    type="text"
                    value={playerForm.height || ''}
                    onChange={e => setPlayerForm({ ...playerForm, height: e.target.value })}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] font-mono text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                    placeholder="1.80m"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Peso (kg)</label>
                  <input
                    type="text"
                    value={playerForm.weight || ''}
                    onChange={e => setPlayerForm({ ...playerForm, weight: e.target.value })}
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] font-mono text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                    placeholder="74"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[11px] font-medium text-[#888888] block mb-1">Estado Físico</label>
                  <select
                    value={playerForm.status || 'available'}
                    onChange={e =>
                      setPlayerForm({
                        ...playerForm,
                        status: e.target.value as 'available' | 'injured' | 'unavailable',
                      })
                    }
                    className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-2.5 text-[12px] text-[#EDEDED] focus:border-[#525252] focus:outline-none"
                  >
                    <option value="available">Disponible</option>
                    <option value="injured">Lesionado</option>
                    <option value="unavailable">No disponible</option>
                  </select>
                </div>
                <label className="h-9 flex items-center gap-2 cursor-pointer bg-[#050505] border border-[#262626] px-3 rounded-md w-full">
                  <input
                    type="checkbox"
                    checked={playerForm.isSuspended || false}
                    onChange={e => setPlayerForm({ ...playerForm, isSuspended: e.target.checked })}
                    className="w-4 h-4 rounded border-[#333333] bg-[#0A0A0A]"
                  />
                  <span className="text-[12px] font-medium text-[#EDEDED]">Sancionado</span>
                </label>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#888888] block mb-1">Notas Médicas / Tácticas</label>
                <textarea
                  value={playerForm.notes || ''}
                  onChange={e => setPlayerForm({ ...playerForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-[#050505] border border-[#262626] rounded-md p-2.5 text-[12px] text-[#EDEDED] focus:border-[#525252] focus:outline-none resize-none"
                  placeholder="Información adicional..."
                />
              </div>

              {formError && (
                <p
                  role="alert"
                  className="text-[12px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2"
                >
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1F1F1F]">
                <button
                  onClick={() => setShowPlayerModal(false)}
                  className="h-8 px-3 rounded-md bg-[#111111] border border-[#262626] text-[12px] text-[#A1A1AA] hover:text-[#EDEDED]"
                >
                  Cancelar
                </button>
                <button
                  onClick={savePlayer}
                  disabled={isSavingPlayer}
                  className="h-8 px-4 bg-[#EDEDED] text-[#0A0A0A] font-medium text-[12px] rounded-md hover:bg-white disabled:opacity-60"
                >
                  {isSavingPlayer ? 'Guardando...' : 'Guardar Jugador'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
