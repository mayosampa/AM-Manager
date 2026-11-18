import { MatchRecord } from '../types';

export interface PendingScheduledMatch {
  date: string;
  planKey: string;
  isPast: boolean;
  isRecentPast: boolean;
  daysAgo: number;
  [key: string]: any;
}

export function getLocalTodayDateString(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDateKey(rawDate?: string): string {
  const str = String(rawDate || '').trim();
  if (!str) return '';
  return str.includes('T') ? str.split('T')[0] : str;
}

function normalizeMatchText(value?: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJornadaNumber(dayOrMatch: any): string | null {
  if (!dayOrMatch || typeof dayOrMatch !== 'object') return null;
  if (dayOrMatch.rfafJornada !== undefined && dayOrMatch.rfafJornada !== null) {
    const n = String(dayOrMatch.rfafJornada).replace(/\D+/g, '');
    if (n) return n;
  }
  if (dayOrMatch.jornada !== undefined && dayOrMatch.jornada !== null) {
    const n = String(dayOrMatch.jornada).replace(/\D+/g, '');
    if (n) return n;
  }
  const compText = String(
    dayOrMatch.matchDetails?.competition || dayOrMatch.competition || dayOrMatch.matchType || ''
  );
  const jMatch = compText.match(/\bJ(?:ornada)?\s*(\d+)\b/i);
  return jMatch ? jMatch[1] : null;
}

function daysBetweenDateKeys(earlierDateKey: string, laterDateKey: string): number {
  const [y1, m1, d1] = earlierDateKey.split('-').map(Number);
  const [y2, m2, d2] = laterDateKey.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

/**
 * Construye la lista cronológica de TODOS los partidos pendientes de registrar
 * (tanto de fechas pasadas como futuras) a partir de `season_plan` y `match_history`.
 * Excluye únicamente partidos ya jugados (`isPlayed === true`) o ya presentes en `savedMatches`.
 */
export function getPendingScheduledMatches(
  rawPlan: Record<string, any>,
  savedMatches: MatchRecord[],
  teamId?: string,
  todayStr = getLocalTodayDateString()
): PendingScheduledMatch[] {
  const historyIds = new Set<string>();
  const historyDates = new Set<string>();
  const historyOpponentJornada = new Set<string>();

  for (const m of savedMatches || []) {
    if (!m) continue;
    if (m.id) historyIds.add(String(m.id));
    const mDate = normalizeDateKey(m.date);
    if (mDate) historyDates.add(mDate);
    const normOpp = normalizeMatchText(m.opponent);
    const jNum = extractJornadaNumber(m);
    if (normOpp && jNum) {
      historyOpponentJornada.add(`${normOpp}|${jNum}`);
    }
  }

  const keys = Object.keys(rawPlan || {}).sort();
  const pending: PendingScheduledMatch[] = [];

  for (const key of keys) {
    const day = rawPlan[key];
    if (!day || typeof day !== 'object') continue;
    const isMatch = day.isMatchDay === true || day.type === 'match';
    if (!isMatch) continue;

    const matchesTeam = !day.teamId || !teamId || day.teamId === teamId;
    if (!matchesTeam) continue;

    if (day.isPlayed === true) continue;

    const rawDate = day.dateString || (key.includes('_') ? key.split('_').pop()! : key);
    const normalizedDate = normalizeDateKey(rawDate);
    if (!normalizedDate) continue;

    // Verificar también que no exista ya en match_history por id, fecha o rival+jornada
    if (day.matchId && historyIds.has(String(day.matchId))) continue;
    if (historyDates.has(normalizedDate)) continue;
    const normOpp = normalizeMatchText(day.opponent || day.matchDetails?.opponent);
    const jNum = extractJornadaNumber(day);
    if (normOpp && jNum && historyOpponentJornada.has(`${normOpp}|${jNum}`)) continue;

    const isPast = normalizedDate < todayStr;
    const daysAgo = isPast ? daysBetweenDateKeys(normalizedDate, todayStr) : 0;
    const isRecentPast = isPast && daysAgo >= 1 && daysAgo <= 7;

    pending.push({
      ...day,
      date: normalizedDate,
      planKey: key,
      isPast,
      isRecentPast,
      daysAgo,
    });
  }

  pending.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return pending;
}

/**
 * Reconciles `season_plan` match days against `match_history` (`savedMatches`).
 * - If a scheduled match day has a corresponding record in `savedMatches`, ensures it is marked as played.
 * - If a scheduled match day is marked as played in `season_plan` (has `isPlayed`, `played`, `completed`, `matchId`, or `score`),
 *   but its record no longer exists in `savedMatches` (because it was deleted from MatchHistory),
 *   cleans all played markers and score so the match returns to the Match Hub (`MatchDashboard`) and Calendar (`TrainingPlanner`) as pending.
 */
export function reconcileSeasonPlanWithHistory(
  rawPlan: Record<string, any>,
  savedMatches: MatchRecord[],
  teamId?: string,
  deletedMatch?: MatchRecord
): { plan: Record<string, any>; changed: boolean } {
  const plan: Record<string, any> = { ...(rawPlan || {}) };
  let changed = false;

  const historyById = new Map<string, MatchRecord>();
  const historyByDate = new Map<string, MatchRecord>();

  for (const m of savedMatches || []) {
    if (!m) continue;
    if (m.id) historyById.set(String(m.id), m);
    if (m.date) {
      const rawDate = String(m.date);
      const normDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
      historyByDate.set(normDate, m);
      historyByDate.set(rawDate, m);
    }
  }

  const deletedDate = deletedMatch?.date ? normalizeDateKey(deletedMatch.date) : '';
  const deletedOpp = deletedMatch?.opponent ? normalizeMatchText(deletedMatch.opponent) : '';

  for (const [key, day] of Object.entries(plan)) {
    if (!day || typeof day !== 'object') continue;
    const isMatch = day.isMatchDay === true || day.type === 'match';
    if (!isMatch) continue;

    const matchesTeam = !day.teamId || !teamId || day.teamId === teamId;
    if (!matchesTeam) continue;

    const normalizedDate = normalizeDateKey(day.dateString || (key.includes('_') ? key.split('_').pop()! : key));
    const historyMatch =
      (day.matchId ? historyById.get(String(day.matchId)) : undefined) ||
      historyByDate.get(normalizedDate);

    const hasPlayedMarkers =
      day.isPlayed === true ||
      day.played === true ||
      day.completed === true ||
      Boolean(day.matchId) ||
      Boolean(day.score) ||
      day.matchDetails?.played === true ||
      Boolean(day.matchDetails?.score);

    const matchesExplicitlyDeleted = Boolean(
      deletedMatch &&
        ((day.matchId && String(day.matchId) === String(deletedMatch.id)) ||
          (deletedDate && normalizedDate === deletedDate && (!deletedOpp || normalizeMatchText(day.opponent || day.matchDetails?.opponent) === deletedOpp)))
    );

    const wasLinkedToDeletedActa = Boolean(day.matchId) && !historyMatch;

    if (historyMatch) {
      const scoreStr =
        day.score ||
        day.matchDetails?.score ||
        (historyMatch.score ? `${historyMatch.score.home} - ${historyMatch.score.away}` : undefined);

      if (
        !day.isPlayed ||
        !day.played ||
        !day.completed ||
        day.matchId !== historyMatch.id ||
        (day.matchDetails && !day.matchDetails.played)
      ) {
        plan[key] = {
          ...day,
          isPlayed: true,
          played: true,
          completed: true,
          matchId: historyMatch.id,
          ...(scoreStr ? { score: scoreStr } : {}),
          matchDetails: {
            ...(day.matchDetails || {}),
            played: true,
            ...(scoreStr ? { score: scoreStr } : {}),
          },
        };
        changed = true;
      }
    } else if (
      matchesExplicitlyDeleted ||
      wasLinkedToDeletedActa ||
      (hasPlayedMarkers && !day.externalPlayed && !day.rfafPlayed)
    ) {
      // Match was deleted from MatchHistory -> restore scheduled match day as pending
      const {
        matchId: _removedMatchId,
        score: _removedScore,
        matchRecord: _removedMatchRecord,
        ...restDay
      } = day;

      const updatedMatchDetails = day.matchDetails ? { ...day.matchDetails } : undefined;
      if (updatedMatchDetails) {
        updatedMatchDetails.played = false;
        delete updatedMatchDetails.score;
      }

      plan[key] = {
        ...restDay,
        isMatchDay: true,
        type: 'match',
        isPlayed: false,
        played: false,
        completed: false,
        externalPlayed: false,
        rfafPlayed: false,
        ...(updatedMatchDetails ? { matchDetails: updatedMatchDetails } : {}),
      };
      changed = true;
    }
  }

  return { plan, changed };
}
