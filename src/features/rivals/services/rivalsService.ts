import { db } from '../../../services/db';
import { registerCachePurgeListener } from '../../../services/authSession';
import {
  areSameRivalClub,
  clubsMatch,
  deduplicateStandingsRows,
} from '../../../services/rfafConnectorService';
import { FedStandingRow, MatchRecord, RivalScoutingReport, RivalTeam } from '../../../types';

export const rivalsDbKey = (teamId?: string): string => `rivals_db_${teamId || 'default'}`;

const IGNORED_NAMES = new Set(['', 'rival', 'rival desconocido', 'desconocido', 'por determinar']);

const normalizeName = (name?: string): string => (name || '').trim().toLowerCase();

/** In-memory cache per teamId to eliminate redundant queries across views. */
const rivalsCache = new Map<string, RivalTeam[]>();

export function clearRivalsCache(teamId?: string): void {
  if (teamId) {
    rivalsCache.delete(teamId);
  } else {
    rivalsCache.clear();
  }
}

registerCachePurgeListener(() => clearRivalsCache());

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

export function cloneRivalTeam(rival: RivalTeam): RivalTeam {
  const sc = rival.scouting || createEmptyScoutingReport();
  return {
    ...rival,
    scouting: {
      ...sc,
      attackPhase: { ...sc.attackPhase },
      defensivePhase: { ...sc.defensivePhase },
      transitions: { ...sc.transitions },
      setPieces: { ...sc.setPieces },
      keyPlayers: (sc.keyPlayers || []).map(kp => ({ ...kp })),
      notesLog: (sc.notesLog || []).map(nl => ({ ...nl })),
    },
  };
}

export function createEmptyScoutingReport(): RivalScoutingReport {
  return {
    updatedAt: new Date().toISOString(),
    baseFormation: '1-4-4-2',
    defensiveFormation: '1-4-4-2',
    playingStyle: 'Combinativo',
    attackPhase: {
      buildUp: '',
      progressionAndFinish: '',
    },
    defensivePhase: {
      blockHeight: 'Bloque Medio',
      weaknessesToExploit: '',
    },
    transitions: {
      offensiveTransition: '',
      defensiveTransition: '',
    },
    setPieces: {
      attackingCornersAndFreeKicks: '',
      defendingCornersAndFreeKicks: '',
    },
    keyPlayers: [],
    generalPlanAndKeys: '',
    freeNotes: '',
    notesLog: [],
  };
}

export function createRivalTeam(
  name: string,
  stadium?: string,
  pitchInfo?: string,
  primaryColor?: string
): RivalTeam {
  return {
    id: `rival_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`,
    name: name.trim(),
    stadium: stadium?.trim() || '',
    pitchInfo: pitchInfo?.trim() || '',
    primaryColor: primaryColor || '#FF4B4B',
    scouting: createEmptyScoutingReport(),
  };
}

function mergeTwoStrings(a?: string, b?: string): string {
  const cleanA = (a || '').trim();
  const cleanB = (b || '').trim();
  if (!cleanA) return cleanB;
  if (!cleanB || cleanA === cleanB) return cleanA;
  return cleanA.includes(cleanB) ? cleanA : cleanB.includes(cleanA) ? cleanB : `${cleanA}\n${cleanB}`;
}

function mergeScoutingReports(
  primary: RivalScoutingReport,
  secondary: RivalScoutingReport
): RivalScoutingReport {
  const pHas = detectHasTacticalReport(primary);
  const sHas = detectHasTacticalReport(secondary);
  const preferred = pHas || !sHas ? primary : secondary;
  const fallback = preferred === primary ? secondary : primary;

  const seenNotes = new Set<string>();
  const notesLog = [...(primary.notesLog || []), ...(secondary.notesLog || [])].filter(n => {
    if (!n) return false;
    const key = `${n.date}|${n.text.trim()}`;
    if (seenNotes.has(key)) return false;
    seenNotes.add(key);
    return true;
  });

  const seenPlayers = new Set<string>();
  const keyPlayers = [...(primary.keyPlayers || []), ...(secondary.keyPlayers || [])].filter(kp => {
    if (!kp) return false;
    const key = `${kp.number}|${kp.name.trim().toLowerCase()}`;
    if (seenPlayers.has(key)) return false;
    seenPlayers.add(key);
    return true;
  });

  return {
    updatedAt: preferred.updatedAt >= fallback.updatedAt ? preferred.updatedAt : fallback.updatedAt,
    baseFormation:
      preferred.baseFormation && preferred.baseFormation !== '1-4-4-2'
        ? preferred.baseFormation
        : fallback.baseFormation || '1-4-4-2',
    defensiveFormation:
      preferred.defensiveFormation && preferred.defensiveFormation !== '1-4-4-2'
        ? preferred.defensiveFormation
        : fallback.defensiveFormation || '1-4-4-2',
    playingStyle:
      preferred.playingStyle && preferred.playingStyle !== 'Combinativo'
        ? preferred.playingStyle
        : fallback.playingStyle || 'Combinativo',
    attackPhase: {
      buildUp: mergeTwoStrings(preferred.attackPhase?.buildUp, fallback.attackPhase?.buildUp),
      progressionAndFinish: mergeTwoStrings(
        preferred.attackPhase?.progressionAndFinish,
        fallback.attackPhase?.progressionAndFinish
      ),
    },
    defensivePhase: {
      blockHeight:
        preferred.defensivePhase?.blockHeight && preferred.defensivePhase.blockHeight !== 'Bloque Medio'
          ? preferred.defensivePhase.blockHeight
          : fallback.defensivePhase?.blockHeight || 'Bloque Medio',
      weaknessesToExploit: mergeTwoStrings(
        preferred.defensivePhase?.weaknessesToExploit,
        fallback.defensivePhase?.weaknessesToExploit
      ),
    },
    transitions: {
      offensiveTransition: mergeTwoStrings(
        preferred.transitions?.offensiveTransition,
        fallback.transitions?.offensiveTransition
      ),
      defensiveTransition: mergeTwoStrings(
        preferred.transitions?.defensiveTransition,
        fallback.transitions?.defensiveTransition
      ),
    },
    setPieces: {
      attackingCornersAndFreeKicks: mergeTwoStrings(
        preferred.setPieces?.attackingCornersAndFreeKicks,
        fallback.setPieces?.attackingCornersAndFreeKicks
      ),
      defendingCornersAndFreeKicks: mergeTwoStrings(
        preferred.setPieces?.defendingCornersAndFreeKicks,
        fallback.setPieces?.defendingCornersAndFreeKicks
      ),
    },
    keyPlayers,
    generalPlanAndKeys: mergeTwoStrings(preferred.generalPlanAndKeys, fallback.generalPlanAndKeys),
    freeNotes: mergeTwoStrings(preferred.freeNotes, fallback.freeNotes),
    notesLog,
  };
}

/**
 * Fusiona entradas duplicadas de un mismo club rival (ej. "CARTAMA B" + "C.D. CARTAMA",
 * "C.D. JUVENTUD DE TOLOX" + "C.D. JUVENTUD DE TOLOX CORAZÓN DE LA SIERRA DE LAS NIEVES")
 * conservando intactos todos los informes tácticos, notas y estadios.
 */
export function mergeDuplicateRivals(
  rivals: RivalTeam[],
  standings?: FedStandingRow[],
  ownTeamName?: string
): { merged: RivalTeam[]; changed: boolean } {
  const cleanStandings = deduplicateStandingsRows(standings);
  const groups: RivalTeam[][] = [];
  let changed = false;

  for (const raw of rivals || []) {
    if (!raw || IGNORED_NAMES.has(normalizeName(raw.name))) {
      if (raw) changed = true;
      continue;
    }

    if (ownTeamName && clubsMatch(raw.name, ownTeamName) && !detectHasTacticalReport(raw.scouting)) {
      changed = true;
      continue;
    }

    const normalizedEntry: RivalTeam = {
      ...raw,
      scouting: { ...createEmptyScoutingReport(), ...(raw.scouting || {}) },
    };

    const existingGroup = groups.find(group => {
      const rep = group[0];
      // Si en la tabla oficial hay 2 clubes distintos bajo la misma base (ej. equipo A y B en la misma liga), no fusionarlos
      const distinctStandingMatches = cleanStandings.filter(
        s => areSameRivalClub(s.equipo, rep.name, ownTeamName) && areSameRivalClub(s.equipo, normalizedEntry.name, ownTeamName)
      );
      if (distinctStandingMatches.length > 1) {
        return clubsMatch(rep.name, normalizedEntry.name);
      }
      return areSameRivalClub(rep.name, normalizedEntry.name, ownTeamName);
    });

    if (existingGroup) {
      existingGroup.push(normalizedEntry);
      changed = true;
    } else {
      groups.push([normalizedEntry]);
    }
  }

  const merged: RivalTeam[] = groups.map(group => {
    const officialStanding =
      cleanStandings.find(s => group.some(item => clubsMatch(s.equipo, item.name))) ||
      cleanStandings.find(s => group.some(item => areSameRivalClub(s.equipo, item.name, ownTeamName)));

    const sortedGroup = [...group].sort((a, b) => {
      const aHas = detectHasTacticalReport(a.scouting) ? 1 : 0;
      const bHas = detectHasTacticalReport(b.scouting) ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return b.name.length - a.name.length;
    });

    const primary = sortedGroup[0];
    const combinedScouting = sortedGroup.slice(1).reduce(
      (acc, curr) => mergeScoutingReports(acc, curr.scouting),
      primary.scouting
    );
    const stadium = sortedGroup.map(g => (g.stadium || '').trim()).find(Boolean) || '';
    const pitchInfo = sortedGroup.map(g => (g.pitchInfo || '').trim()).find(Boolean) || '';
    const canonicalName = officialStanding ? officialStanding.equipo.trim() : sortedGroup[0].name.trim();

    if (canonicalName !== primary.name) {
      changed = true;
    }

    return {
      ...primary,
      name: canonicalName,
      stadium,
      pitchInfo,
      scouting: combinedScouting,
    };
  });

  merged.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  return { merged, changed };
}

export async function loadAndSyncRivals(teamId?: string, forceRefresh = false): Promise<RivalTeam[]> {
  const cacheKey = teamId || 'default';
  if (!forceRefresh && rivalsCache.has(cacheKey)) {
    return rivalsCache.get(cacheKey)!;
  }

  let stored: RivalTeam[] = [];
  let plan: Record<string, any> = {};
  let matches: MatchRecord[] = [];

  try {
    const [rawStored, rawPlan, rawMatches] = await Promise.all([
      db.getAppState(rivalsDbKey(teamId)).catch(() => null),
      db.getSeasonPlan(teamId).catch(() => ({})),
      teamId ? db.getMatches(teamId).catch(() => []) : Promise.resolve([]),
    ]);
    if (Array.isArray(rawStored)) stored = rawStored.filter(Boolean);
    if (rawPlan && typeof rawPlan === 'object') plan = rawPlan;
    if (Array.isArray(rawMatches)) matches = rawMatches;
  } catch (e) {
    console.error('Error loading rivals db:', e);
  }

  const { merged: dedupedStored, changed: hadStoredDuplicates } = mergeDuplicateRivals(stored);
  const rivalsList: RivalTeam[] = [...dedupedStored];

  let hasNewRivals = false;
  let hasStadiumUpdates = false;

  const ensureRival = (rawName?: string, rawStadium?: string) => {
    const cleanName = (rawName || '').trim();
    const norm = normalizeName(cleanName);
    if (IGNORED_NAMES.has(norm)) return;

    const cleanStadium = (rawStadium || '').trim();
    const existingIdx = rivalsList.findIndex(r => areSameRivalClub(r.name, cleanName));
    if (existingIdx === -1) {
      rivalsList.push(createRivalTeam(cleanName, cleanStadium));
      hasNewRivals = true;
    } else if (cleanStadium && !rivalsList[existingIdx].stadium) {
      rivalsList[existingIdx] = { ...rivalsList[existingIdx], stadium: cleanStadium };
      hasStadiumUpdates = true;
    }
  };

  for (const day of Object.values(plan)) {
    if (!day || typeof day !== 'object') continue;
    if (day.teamId && teamId && day.teamId !== teamId) continue;
    const isMatch = day.isMatchDay === true || day.type === 'match';
    if (!isMatch) continue;

    const oppName = day.opponent || day.matchDetails?.opponent;
    const isAway = day.matchDetails ? day.matchDetails.isHome === false : day.location === 'away';
    const awayStadium = isAway
      ? day.matchDetails?.location || (day.location !== 'away' && day.location !== 'home' ? day.location : '')
      : '';
    ensureRival(oppName, awayStadium);
  }

  for (const m of matches) {
    if (!m) continue;
    if (teamId && m.teamId && m.teamId !== teamId) continue;
    ensureRival(m.opponent);
  }

  const sorted = rivalsList.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  if (hadStoredDuplicates || hasNewRivals || hasStadiumUpdates) {
    await db.saveAppState(rivalsDbKey(teamId), sorted).catch(console.error);
  }

  rivalsCache.set(cacheKey, sorted);
  return sorted;
}

export async function upsertRivalTeam(teamId: string | undefined, rival: RivalTeam): Promise<RivalTeam[]> {
  const current = await loadAndSyncRivals(teamId);
  let found = false;

  const updated = current.map(item => {
    if (item.id === rival.id || areSameRivalClub(item.name, rival.name)) {
      found = true;
      return {
        ...rival,
        name: rival.name.trim(),
        scouting: {
          ...rival.scouting,
          updatedAt: new Date().toISOString(),
        },
      };
    }
    return item;
  });

  if (!found) {
    updated.push({
      ...rival,
      name: rival.name.trim(),
      scouting: {
        ...rival.scouting,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  const sorted = updated.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  await db.saveAppState(rivalsDbKey(teamId), sorted);
  rivalsCache.set(teamId || 'default', sorted);
  return sorted;
}

export async function deleteRivalTeam(teamId: string | undefined, rivalId: string): Promise<RivalTeam[]> {
  const current = await loadAndSyncRivals(teamId);
  const filtered = current.filter(item => item.id !== rivalId);
  await db.saveAppState(rivalsDbKey(teamId), filtered);
  rivalsCache.set(teamId || 'default', filtered);
  return filtered;
}

export interface RivalHeadToHeadSummary {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  matches: {
    id: string;
    date: string;
    condition: 'Local' | 'Visitante';
    myScore: number;
    rivalScore: number;
    result: 'Victoria' | 'Empate' | 'Derrota';
    competition: string;
  }[];
}

export function extractMatchScores(m: MatchRecord): {
  condition: 'Local' | 'Visitante';
  myScore: number;
  rivalScore: number;
  outcome: 'W' | 'D' | 'L';
} {
  const isAway = m.condition === 'Visitante';
  const hasScoreObj = m.score && typeof m.score.home === 'number' && typeof m.score.away === 'number';
  const myScore = hasScoreObj ? (isAway ? m.score.away : m.score.home) : (m.myScore ?? 0);
  const rivalScore = hasScoreObj ? (isAway ? m.score.home : m.score.away) : (m.rivalScore ?? 0);
  const outcome: 'W' | 'D' | 'L' =
    myScore > rivalScore
      ? 'W'
      : myScore < rivalScore
      ? 'L'
      : m.matchResult === 'Victoria'
      ? 'W'
      : m.matchResult === 'Derrota'
      ? 'L'
      : 'D';

  return {
    condition: isAway ? 'Visitante' : 'Local',
    myScore,
    rivalScore,
    outcome,
  };
}

export function computeHeadToHead(rivalName: string, allMatches: MatchRecord[]): RivalHeadToHeadSummary {
  const relevant = (allMatches || []).filter(m => m && areSameRivalClub(m.opponent, rivalName));

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const matches = relevant.map(m => {
    const { condition, myScore, rivalScore, outcome } = extractMatchScores(m);
    const result: 'Victoria' | 'Empate' | 'Derrota' =
      outcome === 'W' ? 'Victoria' : outcome === 'L' ? 'Derrota' : 'Empate';

    if (result === 'Victoria') wins++;
    else if (result === 'Empate') draws++;
    else losses++;

    goalsFor += myScore;
    goalsAgainst += rivalScore;

    return {
      id: m.id,
      date: m.date,
      condition,
      myScore,
      rivalScore,
      result,
      competition: m.matchType || 'Liga',
    };
  });

  return {
    played: matches.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    matches,
  };
}
