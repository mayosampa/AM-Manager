import { db } from '../../../services/db';
import { MatchRecord, RivalScoutingReport, RivalTeam } from '../../../types';

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

  const byNormName = new Map<string, RivalTeam>();
  for (const r of stored) {
    const norm = normalizeName(r.name);
    if (!IGNORED_NAMES.has(norm)) {
      byNormName.set(norm, {
        ...r,
        scouting: { ...createEmptyScoutingReport(), ...(r.scouting || {}) },
      });
    }
  }

  let hasNewRivals = false;
  let hasStadiumUpdates = false;

  const ensureRival = (rawName?: string, rawStadium?: string) => {
    const cleanName = (rawName || '').trim();
    const norm = normalizeName(cleanName);
    if (IGNORED_NAMES.has(norm)) return;

    const cleanStadium = (rawStadium || '').trim();
    const existing = byNormName.get(norm);
    if (!existing) {
      byNormName.set(norm, createRivalTeam(cleanName, cleanStadium));
      hasNewRivals = true;
    } else if (cleanStadium && !existing.stadium) {
      byNormName.set(norm, { ...existing, stadium: cleanStadium });
      hasStadiumUpdates = true;
    }
  };

  // Scan season_plan for scheduled or past opponents
  for (const day of Object.values(plan)) {
    if (!day || typeof day !== 'object') continue;
    if (day.teamId && teamId && day.teamId !== teamId) continue;
    const isMatch = day.isMatchDay === true || day.type === 'match';
    if (!isMatch) continue;

    const oppName = day.opponent || day.matchDetails?.opponent;
    const isAway = day.matchDetails ? day.matchDetails.isHome === false : day.location === 'away';
    const awayStadium = isAway ? (day.matchDetails?.location || (day.location !== 'away' && day.location !== 'home' ? day.location : '')) : '';
    ensureRival(oppName, awayStadium);
  }

  // Scan match_history for opponents
  for (const m of matches) {
    if (!m) continue;
    ensureRival(m.opponent);
  }

  const sorted = Array.from(byNormName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );

  // ONLY save if at least 1 new rival or stadium update was detected (avoids 99% of useless writes)
  if (hasNewRivals || hasStadiumUpdates) {
    await db.saveAppState(rivalsDbKey(teamId), sorted).catch(console.error);
  }

  rivalsCache.set(cacheKey, sorted);
  return sorted;
}

export async function upsertRivalTeam(teamId: string | undefined, rival: RivalTeam): Promise<RivalTeam[]> {
  const current = await loadAndSyncRivals(teamId);
  const normTarget = normalizeName(rival.name);
  let found = false;

  const updated = current.map(item => {
    if (item.id === rival.id || normalizeName(item.name) === normTarget) {
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

export function computeHeadToHead(rivalName: string, allMatches: MatchRecord[]): RivalHeadToHeadSummary {
  const normTarget = normalizeName(rivalName);
  const relevant = (allMatches || []).filter(m => normalizeName(m.opponent) === normTarget);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const matches = relevant.map(m => {
    const isLocal = m.condition !== 'Visitante';
    const myScore = m.myScore !== undefined ? m.myScore : (isLocal ? m.score.home : m.score.away);
    const rivalScore = m.rivalScore !== undefined ? m.rivalScore : (isLocal ? m.score.away : m.score.home);
    const result: 'Victoria' | 'Empate' | 'Derrota' =
      myScore > rivalScore ? 'Victoria' : myScore < rivalScore ? 'Derrota' : 'Empate';

    if (result === 'Victoria') wins++;
    else if (result === 'Empate') draws++;
    else losses++;

    goalsFor += myScore;
    goalsAgainst += rivalScore;

    return {
      id: m.id,
      date: m.date,
      condition: (m.condition || 'Local') as 'Local' | 'Visitante',
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
