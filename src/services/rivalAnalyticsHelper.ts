import { FedStandingRow, MatchRecord, RivalScoutingReport, RivalTeam } from '../types';
import { getLocalTodayDateString } from './matchSync';
import {
  clubsMatch,
  deduplicateStandingsRows,
  findStandingForClub,
  normalizeClubIdentity,
} from './rfafConnectorService';

export interface RivalStandingSummary {
  pos: number;
  pts: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  officialName: string;
}

export interface RivalH2HMatchItem {
  id: string;
  date: string;
  formattedShortDate: string;
  condition: 'Local' | 'Visitante';
  myScore: number;
  rivalScore: number;
  outcome: 'W' | 'D' | 'L';
  jornada?: number;
  competition: string;
  source: 'history' | 'federation';
}

export interface RivalUpcomingFixture {
  planKey: string;
  dateKey: string;
  formattedShortDate: string;
  condition: 'Local' | 'Visitante';
  jornada?: number;
  time?: string;
  stadium?: string;
  isPastPending?: boolean;
}

export interface RivalEncounterSlot {
  legLabel: string;
  status: 'played' | 'upcoming';
  date: string;
  formattedShortDate: string;
  condition: 'Local' | 'Visitante';
  jornada?: number;
  myScore?: number;
  rivalScore?: number;
  outcome?: 'W' | 'D' | 'L';
}

export interface RivalH2HStatsSummary {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  pointsEarned: number;
  effectivenessPct: number;
}

export interface RivalIntelligenceProfile {
  rival: RivalTeam;
  standing: RivalStandingSummary | null;
  h2hMatches: RivalH2HMatchItem[];
  h2hSummary: RivalH2HStatsSummary;
  upcomingFixtures: RivalUpcomingFixture[];
  nextFixture: RivalUpcomingFixture | null;
  encounters: RivalEncounterSlot[];
  idaSlot: RivalEncounterSlot | null;
  vueltaSlot: RivalEncounterSlot | null;
  hasTacticalReport: boolean;
}

export interface GlobalRivalsSummary {
  totalClubs: number;
  analyzedClubs: number;
  pendingClubs: number;
  upcomingRivalsCount: number;
  facedRivalsCount: number;
  totalH2HPlayed: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalGoalsFor: number;
  totalGoalsAgainst: number;
  totalPointsEarned: number;
  effectivenessPct: number;
  maxGoalsInSingleRivalH2H: number;
}

const SHORT_MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function normalizeDateKey(rawDate?: string): string {
  const str = String(rawDate || '').trim();
  if (!str) return '';
  return str.includes('T') ? str.split('T')[0] : str;
}

export function formatShortSpanishDate(rawDate?: string): string {
  const key = normalizeDateKey(rawDate);
  const isoMatch = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const day = Number(isoMatch[3]);
    const monthIdx = Number(isoMatch[2]) - 1;
    const monthLabel = SHORT_MONTHS_ES[monthIdx] || isoMatch[2];
    return `${day} ${monthLabel}`;
  }
  const esMatch = key.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (esMatch) {
    const day = Number(esMatch[1]);
    const monthIdx = Number(esMatch[2]) - 1;
    const monthLabel = SHORT_MONTHS_ES[monthIdx] || esMatch[2];
    return `${day} ${monthLabel}`;
  }
  return key || '—';
}

function extractJornadaNumber(dayOrMatch: any): number | undefined {
  if (!dayOrMatch || typeof dayOrMatch !== 'object') return undefined;
  const direct = dayOrMatch.rfafJornada ?? dayOrMatch.jornada;
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
    const num = Number(String(direct).replace(/\D+/g, ''));
    if (Number.isFinite(num) && num > 0) return num;
  }
  const compText = String(dayOrMatch.matchDetails?.competition || dayOrMatch.competition || dayOrMatch.matchType || '');
  const jMatch = compText.match(/\bJ(?:ornada)?\s*(\d+)\b/i);
  if (jMatch) {
    const num = Number(jMatch[1]);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return undefined;
}

function daysBetweenDateKeys(a: string, b: string): number {
  const m1 = a.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const m2 = b.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m1 || !m2) return 9999;
  const t1 = Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
  const t2 = Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  return Math.abs(Math.round((t2 - t1) / 86400000));
}

export function detectHasTacticalReport(scouting?: RivalScoutingReport): boolean {
  if (!scouting) return false;
  const textFields = [
    scouting.generalPlanAndKeys,
    scouting.freeNotes,
    scouting.attackPhase?.buildUp,
    scouting.attackPhase?.progressionAndFinish,
    scouting.defensivePhase?.weaknessesToExploit,
    scouting.transitions?.offensiveTransition,
    scouting.transitions?.defensiveTransition,
    scouting.setPieces?.attackingCornersAndFreeKicks,
    scouting.setPieces?.defendingCornersAndFreeKicks,
  ];
  if (textFields.some(v => typeof v === 'string' && v.trim().length > 0)) {
    return true;
  }
  if ((scouting.keyPlayers?.length || 0) > 0 || (scouting.notesLog?.length || 0) > 0) {
    return true;
  }
  if (
    (scouting.baseFormation && scouting.baseFormation !== '1-4-4-2') ||
    (scouting.defensiveFormation && scouting.defensiveFormation !== '1-4-4-2') ||
    (scouting.playingStyle && scouting.playingStyle !== 'Combinativo') ||
    (scouting.defensivePhase?.blockHeight && scouting.defensivePhase.blockHeight !== 'Bloque Medio')
  ) {
    return true;
  }
  return false;
}

function buildStandingSummary(
  rivalName: string,
  standings: FedStandingRow[]
): RivalStandingSummary | null {
  const row = findStandingForClub(standings, rivalName);
  if (!row) return null;
  return {
    pos: row.posicion,
    pts: row.puntos,
    pj: row.pj,
    pg: row.pg,
    pe: row.pe,
    pp: row.pp,
    gf: row.gf,
    gc: row.gc,
    dg: row.gf - row.gc,
    officialName: row.equipo,
  };
}

export function buildRivalIntelligenceProfile(params: {
  rival: RivalTeam;
  standings?: FedStandingRow[];
  matches?: MatchRecord[];
  seasonPlan?: Record<string, any>;
  teamId?: string;
  todayStr?: string;
}): RivalIntelligenceProfile {
  const {
    rival,
    standings = [],
    matches = [],
    seasonPlan = {},
    teamId,
    todayStr = getLocalTodayDateString(),
  } = params;

  const cleanStandings = deduplicateStandingsRows(standings);
  const standing = buildStandingSummary(rival.name, cleanStandings);

  const planEntries = Object.entries(seasonPlan || {}).filter(([, day]) => {
    if (!day || typeof day !== 'object') return false;
    if (teamId && day.teamId && day.teamId !== teamId) return false;
    return day.isMatchDay === true || day.type === 'match';
  });

  // 1. Partidos jugados en match_history contra este rival
  const h2hMatches: RivalH2HMatchItem[] = [];
  const matchedPlanKeys = new Set<string>();

  for (const m of matches || []) {
    if (!m || !clubsMatch(m.opponent, rival.name)) continue;

    const isLocal = m.condition !== 'Visitante';
    const myScore = m.myScore !== undefined ? m.myScore : isLocal ? m.score.home : m.score.away;
    const rivalScore = m.rivalScore !== undefined ? m.rivalScore : isLocal ? m.score.away : m.score.home;
    const outcome: 'W' | 'D' | 'L' = myScore > rivalScore ? 'W' : myScore < rivalScore ? 'L' : 'D';
    const dateKey = normalizeDateKey(m.date);

    let matchedJornada = extractJornadaNumber(m);
    for (const [planKey, day] of planEntries) {
      const oppName = day.opponent || day.matchDetails?.opponent;
      if (!clubsMatch(oppName, rival.name)) continue;
      const planDate = normalizeDateKey(day.dateString || (planKey.includes('_') ? planKey.split('_').pop() : planKey));
      if (
        (day.matchId && String(day.matchId) === String(m.id)) ||
        (dateKey && planDate && daysBetweenDateKeys(dateKey, planDate) <= 3)
      ) {
        matchedPlanKeys.add(planKey);
        if (!matchedJornada) matchedJornada = extractJornadaNumber(day);
        break;
      }
    }

    h2hMatches.push({
      id: m.id,
      date: dateKey || m.date,
      formattedShortDate: formatShortSpanishDate(dateKey || m.date),
      condition: isLocal ? 'Local' : 'Visitante',
      myScore,
      rivalScore,
      outcome,
      jornada: matchedJornada,
      competition: m.matchType || 'Liga',
      source: 'history',
    });
  }

  // 2. Cruce con season_plan para próximos partidos (o actas federativas con marcador aún no volcadas)
  const upcomingFixtures: RivalUpcomingFixture[] = [];

  for (const [planKey, day] of planEntries) {
    if (matchedPlanKeys.has(planKey)) continue;
    const oppName = day.opponent || day.matchDetails?.opponent;
    if (!clubsMatch(oppName, rival.name)) continue;

    const rawDate = day.dateString || (planKey.includes('_') ? planKey.split('_').pop() : planKey);
    const dateKey = normalizeDateKey(rawDate);
    if (!dateKey) continue;

    const isHome = day.matchDetails ? day.matchDetails.isHome !== false : day.location !== 'away';
    const condition: 'Local' | 'Visitante' = isHome ? 'Local' : 'Visitante';
    const jornada = extractJornadaNumber(day);

    // Si en el calendario ya consta resultado oficial validado (home-away) sin acta en match_history
    const scoreStr = String(day.score || day.matchDetails?.score || '').trim();
    const scoreMatch = scoreStr.match(/^(\d+)\s*[-:]\s*(\d+)$/);
    const hasFedScore = Boolean(scoreMatch && (day.externalPlayed || day.rfafPlayed || day.played || day.isPlayed));

    const alreadyInHistory = h2hMatches.some(
      hm =>
        daysBetweenDateKeys(hm.date, dateKey) <= 3 ||
        (jornada !== undefined && hm.jornada !== undefined && hm.jornada === jornada)
    );
    if (alreadyInHistory) continue;

    if (hasFedScore && scoreMatch) {
      const homeGoals = Number(scoreMatch[1]);
      const awayGoals = Number(scoreMatch[2]);
      const myScore = isHome ? homeGoals : awayGoals;
      const rivalScore = isHome ? awayGoals : homeGoals;
      const outcome: 'W' | 'D' | 'L' = myScore > rivalScore ? 'W' : myScore < rivalScore ? 'L' : 'D';
      h2hMatches.push({
        id: `fed_${planKey}`,
        date: dateKey,
        formattedShortDate: formatShortSpanishDate(dateKey),
        condition,
        myScore,
        rivalScore,
        outcome,
        jornada,
        competition: day.matchDetails?.competition || 'Liga',
        source: 'federation',
      });
    } else {
      upcomingFixtures.push({
        planKey,
        dateKey,
        formattedShortDate: formatShortSpanishDate(dateKey),
        condition,
        jornada,
        time: day.matchDetails?.time || day.time || undefined,
        stadium: day.matchDetails?.location || (!isHome ? rival.stadium : undefined),
        isPastPending: dateKey < todayStr,
      });
    }
  }

  h2hMatches.sort((a, b) => a.date.localeCompare(b.date));
  upcomingFixtures.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const wins = h2hMatches.filter(m => m.outcome === 'W').length;
  const draws = h2hMatches.filter(m => m.outcome === 'D').length;
  const losses = h2hMatches.filter(m => m.outcome === 'L').length;
  const goalsFor = h2hMatches.reduce((acc, m) => acc + m.myScore, 0);
  const goalsAgainst = h2hMatches.reduce((acc, m) => acc + m.rivalScore, 0);
  const played = h2hMatches.length;
  const pointsEarned = wins * 3 + draws;
  const effectivenessPct = played > 0 ? Math.round((pointsEarned / (played * 3)) * 100) : 0;

  const h2hSummary: RivalH2HStatsSummary = {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    pointsEarned,
    effectivenessPct,
  };

  // Combinar cronológicamente todos los enfrentamientos (Ida, Vuelta...)
  const rawEncounters: Omit<RivalEncounterSlot, 'legLabel'>[] = [
    ...h2hMatches.map(m => ({
      status: 'played' as const,
      date: m.date,
      formattedShortDate: m.formattedShortDate,
      condition: m.condition,
      jornada: m.jornada,
      myScore: m.myScore,
      rivalScore: m.rivalScore,
      outcome: m.outcome,
    })),
    ...upcomingFixtures.map(f => ({
      status: 'upcoming' as const,
      date: f.dateKey,
      formattedShortDate: f.formattedShortDate,
      condition: f.condition,
      jornada: f.jornada,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const encounters: RivalEncounterSlot[] = rawEncounters.map((enc, idx) => ({
    ...enc,
    legLabel: idx === 0 ? 'Ida' : idx === 1 ? 'Vuelta' : `Partido ${idx + 1}`,
  }));

  const futureFirst = upcomingFixtures.find(f => f.dateKey >= todayStr) || upcomingFixtures[0] || null;

  return {
    rival,
    standing,
    h2hMatches,
    h2hSummary,
    upcomingFixtures,
    nextFixture: futureFirst,
    encounters,
    idaSlot: encounters[0] || null,
    vueltaSlot: encounters[1] || null,
    hasTacticalReport: detectHasTacticalReport(rival.scouting),
  };
}

export function buildAllRivalsIntelligence(params: {
  rivals: RivalTeam[];
  standings?: FedStandingRow[];
  matches?: MatchRecord[];
  seasonPlan?: Record<string, any>;
  ownTeamName?: string;
  teamId?: string;
}): { profiles: RivalIntelligenceProfile[]; summary: GlobalRivalsSummary } {
  const { rivals = [], standings = [], matches = [], seasonPlan = {}, ownTeamName, teamId } = params;
  const cleanStandings = deduplicateStandingsRows(standings);
  const todayStr = getLocalTodayDateString();

  // Evitar mostrar al propio equipo si se coló en la lista sin informe manual
  const filteredRivals = rivals.filter(r => {
    if (!ownTeamName) return true;
    if (!clubsMatch(r.name, ownTeamName)) return true;
    return detectHasTacticalReport(r.scouting);
  });

  // Deduplicar por normalizeClubIdentity conservando la ficha con más contenido si hubiera duplicados
  const dedupedByNorm = new Map<string, RivalTeam>();
  for (const r of filteredRivals) {
    const key = normalizeClubIdentity(r.name) || r.name.trim().toLowerCase();
    const prev = dedupedByNorm.get(key);
    if (!prev || (detectHasTacticalReport(r.scouting) && !detectHasTacticalReport(prev.scouting))) {
      dedupedByNorm.set(key, r);
    }
  }

  const profiles = Array.from(dedupedByNorm.values()).map(rival =>
    buildRivalIntelligenceProfile({
      rival,
      standings: cleanStandings,
      matches,
      seasonPlan,
      teamId,
      todayStr,
    })
  );

  profiles.sort((a, b) => {
    if (a.standing && b.standing) return a.standing.pos - b.standing.pos;
    if (a.standing && !b.standing) return -1;
    if (!a.standing && b.standing) return 1;
    return a.rival.name.localeCompare(b.rival.name, 'es', { sensitivity: 'base' });
  });

  let totalH2HPlayed = 0;
  let totalWins = 0;
  let totalDraws = 0;
  let totalLosses = 0;
  let totalGoalsFor = 0;
  let totalGoalsAgainst = 0;
  let analyzedClubs = 0;
  let upcomingRivalsCount = 0;
  let facedRivalsCount = 0;
  let maxGoalsInSingleRivalH2H = 0;

  for (const p of profiles) {
    totalH2HPlayed += p.h2hSummary.played;
    totalWins += p.h2hSummary.wins;
    totalDraws += p.h2hSummary.draws;
    totalLosses += p.h2hSummary.losses;
    totalGoalsFor += p.h2hSummary.goalsFor;
    totalGoalsAgainst += p.h2hSummary.goalsAgainst;
    if (p.hasTacticalReport) analyzedClubs++;
    if (p.upcomingFixtures.length > 0) upcomingRivalsCount++;
    if (p.h2hSummary.played > 0) facedRivalsCount++;
    maxGoalsInSingleRivalH2H = Math.max(
      maxGoalsInSingleRivalH2H,
      p.h2hSummary.goalsFor,
      p.h2hSummary.goalsAgainst
    );
  }

  const totalPointsEarned = totalWins * 3 + totalDraws;
  const effectivenessPct =
    totalH2HPlayed > 0 ? Math.round((totalPointsEarned / (totalH2HPlayed * 3)) * 100) : 0;

  return {
    profiles,
    summary: {
      totalClubs: profiles.length,
      analyzedClubs,
      pendingClubs: Math.max(0, profiles.length - analyzedClubs),
      upcomingRivalsCount,
      facedRivalsCount,
      totalH2HPlayed,
      totalWins,
      totalDraws,
      totalLosses,
      totalGoalsFor,
      totalGoalsAgainst,
      totalPointsEarned,
      effectivenessPct,
      maxGoalsInSingleRivalH2H,
    },
  };
}
