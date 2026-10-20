import React, { useState, useEffect } from 'react';
import { Play, Calendar, Users, Zap, Clock, ShieldAlert, ClipboardEdit, Search, ArrowUpRight } from 'lucide-react';
import { MOCK_PLAYERS } from '../data/players';
import { Player } from '../types';
import { LiveMatch } from './LiveMatch';
import { ManualMatchEntry } from './ManualMatchEntry';
import { PreMatch } from './PreMatch';
import { useTeam } from '../context/TeamContext';
import { db, matchSessionKey } from '../services/db';
import { reconcileSeasonPlanWithHistory } from '../services/matchSync';
import { isCallable } from '../features/squad/domain/availability';
import { RivalScoutingModal } from '../features/rivals/components/RivalScoutingModal';

type MatchPhase = 'hub' | 'callup' | 'live' | 'manual';

interface MatchDashboardProps {
  onNavigate?: (view: any) => void;
}

export function MatchDashboard({ onNavigate }: MatchDashboardProps) {
  const [phase, setPhase] = useState<MatchPhase>('hub');
  const { activeTeam, updateTeam } = useTeam();

  const basePlayers = React.useMemo(
    () => (activeTeam ? activeTeam.players.filter(isCallable) : MOCK_PLAYERS.filter(isCallable)),
    [activeTeam]
  );

  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(basePlayers);
  const [squad, setSquad] = useState<Player[]>([]);
  const [upcomingMatch, setUpcomingMatch] = useState<any>(null);
  const [allUnplayed, setAllUnplayed] = useState<any[]>([]);
  const [savedMatchesList, setSavedMatchesList] = useState<any[]>([]);
  const [scoutingModal, setScoutingModal] = useState<{ open: boolean; rivalName?: string }>({ open: false });
  const [isAdHoc, setIsAdHoc] = useState(false);

  useEffect(() => {
    if (phase !== 'hub') return;

    const loadMatches = async () => {
      let plan: any = {};
      let savedMatches: any[] = [];
      try {
        [plan, savedMatches] = await Promise.all([
          db.getSeasonPlan(activeTeam?.id),
          activeTeam?.id ? db.getMatches(activeTeam.id) : Promise.resolve([]),
        ]);
      } catch (e) {}

      setSavedMatchesList(savedMatches || []);

      const { plan: reconciledPlan, changed: planNeedsHealing } = reconcileSeasonPlanWithHistory(
        plan || {},
        savedMatches || [],
        activeTeam?.id
      );
      plan = reconciledPlan;

      const dates = Object.keys(plan || {}).sort();
      const unplayed: any[] = [];

      for (const key of dates) {
        const day = plan[key];
        if (!day || typeof day !== 'object') continue;
        const isMatch = day.isMatchDay === true || day.type === 'match';
        if (!isMatch) continue;

        const matchesTeam = !day.teamId || day.teamId === activeTeam?.id;
        if (!matchesTeam) continue;

        if (day.isPlayed === true) continue;

        const normalizedDate = day.dateString || (key.includes('_') ? key.split('_').pop()! : key);
        unplayed.push({ ...day, date: normalizedDate, planKey: key });
      }

      if (planNeedsHealing) {
        db.saveSeasonPlan(plan, activeTeam?.id).catch(console.error);
      }

      unplayed.sort((a, b) => String(a.date).localeCompare(String(b.date)));

      setAllUnplayed(unplayed);
      setUpcomingMatch((prev: any) => {
        if (prev && (!prev.teamId || prev.teamId === activeTeam?.id)) {
          const prevKey = prev.planKey || prev.date;
          const preserved = unplayed.find(m => (m.planKey || m.date) === prevKey);
          if (preserved) return preserved;
        }
        return unplayed[0] || null;
      });
    };
    loadMatches();
  }, [phase, activeTeam?.id]);

  useEffect(() => {
    if (phase === 'callup') {
      let callupIds: string[] = [];
      if (!isAdHoc && upcomingMatch) {
        callupIds = Array.isArray(upcomingMatch.calledUpPlayers)
          ? upcomingMatch.calledUpPlayers
          : basePlayers.map(p => p.id);
      } else if (isAdHoc && Array.isArray(activeTeam?.activeCallUp) && activeTeam.activeCallUp.length > 0) {
        callupIds = activeTeam.activeCallUp;
      } else {
        callupIds = basePlayers.map(p => p.id);
      }

      const calledUp = basePlayers.filter(p => callupIds.includes(p.id));
      const notCalledUp = basePlayers.filter(p => !callupIds.includes(p.id));
      setSquad(calledUp);
      setAvailablePlayers(notCalledUp);
    }
  }, [phase, isAdHoc, upcomingMatch, basePlayers, activeTeam?.activeCallUp]);

  const startLiveMatch = (adHoc: boolean) => {
    setIsAdHoc(adHoc);
    if (!adHoc && upcomingMatch) {
      const callupIds = upcomingMatch.calledUpPlayers || [];
      const calledUp =
        callupIds.length > 0 ? basePlayers.filter(p => callupIds.includes(p.id)) : basePlayers;
      setSquad(calledUp);
      setAvailablePlayers(basePlayers.filter(p => !calledUp.map((x: Player) => x.id).includes(p.id)));
    }
    setPhase('live');
  };

  const [hasActiveSession, setHasActiveSession] = useState(false);
  useEffect(() => {
    db.getAppState(matchSessionKey(activeTeam?.id))
      .then(data => {
        if (data && data.matchConfig) setHasActiveSession(true);
        else setHasActiveSession(false);
      })
      .catch(() => {
        setHasActiveSession(false);
      });
  }, [phase, activeTeam?.id]);

  if (hasActiveSession && phase === 'hub') {
    return (
      <div className="flex flex-col max-w-md mx-auto w-full justify-center items-center h-[70vh]">
        <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-6 w-full text-center">
          <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-[18px] font-semibold text-[#EDEDED] mb-1 tracking-[-0.02em]">Sesión de Partido en Curso</h2>
          <p className="text-[#737373] mb-6 text-[13px]">
            Se ha detectado un partido en directo pausado o pendiente de finalizar.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setHasActiveSession(false);
                setPhase('live');
              }}
              className="w-full h-9 bg-[#EDEDED] text-[#0A0A0A] font-medium text-[13px] rounded-md hover:bg-white transition-colors"
            >
              Reanudar Partido en Directo
            </button>
            <button
              onClick={() => {
                if (window.confirm('¿Seguro que deseas descartar este partido? Los datos no guardados se perderán.')) {
                  db.deleteAppState(matchSessionKey(activeTeam?.id));
                  setHasActiveSession(false);
                }
              }}
              className="w-full h-9 text-red-400 font-medium text-[12px] rounded-md border border-[#1F1F1F] hover:bg-red-500/10 transition-colors"
            >
              Descartar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'live') {
    return (
      <LiveMatch
        squad={squad}
        bench={[]}
        onNavigate={onNavigate || (() => {})}
        scheduledMatch={!isAdHoc ? upcomingMatch : null}
      />
    );
  }

  if (phase === 'manual') {
    return (
      <ManualMatchEntry
        activeTeam={activeTeam}
        upcomingMatch={!isAdHoc ? upcomingMatch : null}
        onComplete={() => {
          setUpcomingMatch(null);
          setPhase('hub');
        }}
        onCancel={() => setPhase('hub')}
      />
    );
  }

  if (phase === 'callup') {
    return (
      <PreMatch
        key={isAdHoc ? 'adhoc' : upcomingMatch?.planKey || upcomingMatch?.date || 'scheduled'}
        basePlayers={basePlayers}
        upcomingMatch={upcomingMatch}
        isAdHoc={isAdHoc}
        onCancel={() => setPhase('hub')}
        onStartLive={(selectedSquad) => {
          setSquad(selectedSquad);
          setPhase('live');
        }}
        onSaveCallUp={async (squadIds) => {
          if (!isAdHoc && upcomingMatch) {
            const matchKey = upcomingMatch.planKey || upcomingMatch.date;
            const plan = await db.getSeasonPlan(activeTeam?.id);
            const existingDay = plan?.[matchKey] || plan?.[upcomingMatch.date] || upcomingMatch;
            const targetKey = plan?.[matchKey]
              ? matchKey
              : plan?.[upcomingMatch.date]
              ? upcomingMatch.date
              : matchKey;
            const { planKey: _pk, ...cleanDay } = existingDay;
            const updatedDay = {
              ...cleanDay,
              dateString: cleanDay.dateString || upcomingMatch.date,
              calledUpPlayers: squadIds,
              teamId: cleanDay.teamId || activeTeam?.id,
            };
            const updatedPlan = {
              ...(plan || {}),
              [targetKey]: updatedDay,
            };
            await db.saveSeasonPlan(updatedPlan, activeTeam?.id);
            const updatedMatch = {
              ...updatedDay,
              date: updatedDay.dateString || upcomingMatch.date,
              planKey: targetKey,
            };
            setUpcomingMatch(updatedMatch);
            setAllUnplayed(prev =>
              prev.map(m =>
                (m.planKey || m.date) === (upcomingMatch.planKey || upcomingMatch.date) ? updatedMatch : m
              )
            );
          } else if (isAdHoc && activeTeam && updateTeam) {
            await updateTeam(activeTeam.id, { activeCallUp: squadIds });
          }
        }}
      />
    );
  }

  // MATCH HUB PHASE
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20">
      <div className="pb-5 border-b border-[#1F1F1F]">
        <h1 className="text-[20px] font-semibold text-[#EDEDED] tracking-[-0.025em] mb-1">Día de Partido (Match Hub)</h1>
        <p className="text-[#737373] text-[13px]">
          Preparación de convocatoria, análisis del rival, cronómetro en directo y registro de actas.
        </p>
      </div>

      {upcomingMatch ? (
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#171717]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider">
                Próximo Compromiso Oficial
              </span>
            </div>
            {allUnplayed.length > 1 && (
              <select
                className="w-full sm:w-auto h-8 bg-[#050505] border border-[#262626] text-[#EDEDED] rounded-md px-3 text-[12px] font-mono focus:outline-none focus:border-[#525252]"
                value={upcomingMatch.planKey || upcomingMatch.date}
                onChange={(e) => {
                  const selected = allUnplayed.find(m => (m.planKey || m.date) === e.target.value);
                  if (selected) setUpcomingMatch(selected);
                }}
              >
                {allUnplayed.map(m => (
                  <option key={m.planKey || m.date} value={m.planKey || m.date}>
                    {m.date} · vs {m.opponent || m.matchDetails?.opponent || 'Rival'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <h2 className="text-[26px] sm:text-[32px] font-semibold text-[#EDEDED] tracking-[-0.03em] mb-3">
            vs {upcomingMatch.opponent || upcomingMatch.matchDetails?.opponent || 'Rival'}
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-[#888888] font-mono text-[12px] mb-6">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#111111] rounded border border-[#222222] text-[#EDEDED]">
              <Clock className="w-3.5 h-3.5 text-[#737373]" /> {upcomingMatch.date}
            </span>
            <span className="px-2.5 py-1 bg-[#111111] rounded border border-[#222222]">
              {upcomingMatch.location === 'home'
                ? 'Local'
                : upcomingMatch.matchDetails?.isHome
                ? 'Local'
                : 'Visitante'}
            </span>
            <span className="px-2.5 py-1 bg-[#111111] rounded border border-[#222222]">
              {upcomingMatch.matchDetails?.competition || 'Competición Oficial'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2.5 pt-2">
            <button
              onClick={() => {
                setIsAdHoc(false);
                setPhase('callup');
              }}
              className="w-full lg:w-auto h-9 flex items-center justify-center gap-2 bg-[#111111] text-[#EDEDED] font-medium px-4 rounded-md border border-[#262626] hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors text-[12px]"
            >
              <Users className="w-3.5 h-3.5 text-[#888888]" />
              Convocatoria
              {upcomingMatch.calledUpPlayers && (
                <span className="ml-1 font-mono bg-[#EDEDED] text-[#0A0A0A] text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  {upcomingMatch.calledUpPlayers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setIsAdHoc(false);
                setPhase('manual');
              }}
              className="w-full lg:w-auto h-9 flex items-center justify-center gap-2 bg-[#111111] text-[#EDEDED] font-medium px-4 rounded-md border border-[#262626] hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors text-[12px]"
            >
              <ClipboardEdit className="w-3.5 h-3.5 text-[#888888]" />
              Registrar Acta Manual
            </button>

            <button
              onClick={() =>
                setScoutingModal({
                  open: true,
                  rivalName: upcomingMatch.opponent || upcomingMatch.matchDetails?.opponent || '',
                })
              }
              className="w-full lg:w-auto h-9 flex items-center justify-center gap-2 bg-[#111111] text-[#EDEDED] font-medium px-4 rounded-md border border-[#262626] hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors text-[12px]"
            >
              <Search className="w-3.5 h-3.5 text-[#888888]" />
              Informe Scouting Rival
            </button>

            <button
              onClick={() => startLiveMatch(false)}
              className="w-full lg:w-auto h-9 flex items-center justify-center gap-2 bg-[#EDEDED] text-[#0A0A0A] font-medium px-5 rounded-md hover:bg-white transition-colors text-[13px] lg:ml-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Iniciar Partido en Directo
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-10 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-md bg-[#111111] border border-[#262626] flex items-center justify-center mb-3">
            <Calendar className="w-4 h-4 text-[#737373]" />
          </div>
          <h2 className="text-[15px] font-medium text-[#EDEDED] mb-1">Sin partidos pendientes en el calendario</h2>
          <p className="text-[#737373] text-[12px] max-w-md">
            Programa tu próximo encuentro en el Planificador de Sesiones o inicia un partido rápido a continuación.
          </p>
        </div>
      )}

      {/* Acciones Secundarias */}
      <div>
        <h3 className="text-[#737373] font-medium uppercase tracking-[0.06em] text-[11px] mb-3">
          Operaciones Manuales y Amistosos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => {
              setIsAdHoc(true);
              setPhase('callup');
            }}
            className="flex items-start justify-between bg-[#0A0A0A] border border-[#1F1F1F] p-4 rounded-lg hover:border-[#3A3A3A] hover:bg-[#0D0D0D] transition-colors group text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-[#111111] border border-[#262626] flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#EDEDED]" />
              </div>
              <div>
                <h4 className="text-[#EDEDED] font-medium text-[14px]">Partido Rápido / Amistoso</h4>
                <p className="text-[#737373] text-[12px] mt-0.5 leading-relaxed">
                  Configura convocatoria y lanza el cronómetro en vivo sin cita previa en calendario.
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#525252] group-hover:text-[#EDEDED] shrink-0 transition-colors" />
          </button>

          <button
            onClick={() => {
              setIsAdHoc(true);
              setPhase('manual');
            }}
            className="flex items-start justify-between bg-[#0A0A0A] border border-[#1F1F1F] p-4 rounded-lg hover:border-[#3A3A3A] hover:bg-[#0D0D0D] transition-colors group text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-[#111111] border border-[#262626] flex items-center justify-center shrink-0 mt-0.5">
                <ClipboardEdit className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#EDEDED]" />
              </div>
              <div>
                <h4 className="text-[#EDEDED] font-medium text-[14px]">Registrar Acta Finalizada</h4>
                <p className="text-[#737373] text-[12px] mt-0.5 leading-relaxed">
                  Introduce marcador, minutos, eventos y estadísticas de un partido ya disputado.
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#525252] group-hover:text-[#EDEDED] shrink-0 transition-colors" />
          </button>
        </div>
      </div>

      <RivalScoutingModal
        isOpen={scoutingModal.open}
        onClose={() => setScoutingModal({ open: false })}
        teamId={activeTeam?.id}
        teamName={activeTeam?.name}
        initialRivalName={scoutingModal.rivalName}
        matches={savedMatchesList}
      />
    </div>
  );
}
