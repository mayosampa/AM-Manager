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
    .replace(/\b(c\.?\s*d\.?|u\.?\s*d\.?|c\.?\s*f\.?|a\.?\s*d\.?|s\.?\s*d\.?|f\.?\s*c\.?)\b/g, ' ')
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
 * Comprueba si un partido del calendario (`season_plan`) ya tiene acta creada en `match_history`.
 * Compara exclusivamente contra `savedMatches` por `matchId`, por `dateKey` o por `rival normalizado + jornada`
 * (o mismo rival en un margen de ±3 días).
 */
export function hasMatchActaInHistory(
  day: any,
  normalizedDate: string,
  savedMatches: MatchRecord[]
): boolean {
  if (!Array.isArray(savedMatches) || savedMatches.length === 0) return false;

  const dayOpp = normalizeMatchText(day?.opponent || day?.matchDetails?.opponent);
  const dayJornada = extractJornadaNumber(day);

  for (const m of savedMatches) {
    if (!m) continue;
    if (day?.matchId && m.id && String(day.matchId) === String(m.id)) {
      return true;
    }
    const mDate = normalizeDateKey(m.date);
    if (normalizedDate && mDate && normalizedDate === mDate) {
      return true;
    }
    const mOpp = normalizeMatchText(m.opponent);
    if (dayOpp && mOpp && (dayOpp === mOpp || dayOpp.includes(mOpp) || mOpp.includes(dayOpp))) {
      const mJornada = extractJornadaNumber(m);
      if (dayJornada && mJornada && dayJornada === mJornada) {
        return true;
      }
      if (normalizedDate && mDate && Math.abs(daysBetweenDateKeys(normalizedDate, mDate)) <= 3) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Construye la lista cronológica de TODOS los partidos pendientes de registrar acta
 * (tanto de fechas pasadas `dateKey <= todayStr` como futuras `dateKey > todayStr`).
 *
 * IMPORTANTE: Para partidos con `dateKey <= todayStr`, se comprueba EXCLUSIVAMENTE si existe
 * un acta correspondiente en `savedMatches` (`match_history`), ignorando `day.isPlayed === true`
 * que haya podido venir pre-marcado desde la sincronización del calendario oficial federativo.
 */
export function getPendingScheduledMatches(
  rawPlan: Record<string, any>,
  savedMatches: MatchRecord[],
  teamId?: string,
  todayStr = getLocalTodayDateString()
): PendingScheduledMatch[] {
  const keys = Object.keys(rawPlan || {}).sort();
  const pending: PendingScheduledMatch[] = [];

  for (const key of keys) {
    const day = rawPlan[key];
    if (!day || typeof day !== 'object') continue;
    const isMatch = day.isMatchDay === true || day.type === 'match';
    if (!isMatch) continue;

    const matchesTeam = !day.teamId || !teamId || day.teamId === teamId;
    if (!matchesTeam) continue;

    const rawDate = day.dateString || (key.includes('_') ? key.split('_').pop()! : key);
    const normalizedDate = normalizeDateKey(rawDate);
    if (!normalizedDate) continue;

    // Comprobar exclusivamente si el entrenador ya registró el acta en match_history
    if (hasMatchActaInHistory(day, normalizedDate, savedMatches)) {
      continue;
    }

    const isPast = normalizedDate <= todayStr;
    const daysAgo = isPast ? Math.max(0, daysBetweenDateKeys(normalizedDate, todayStr)) : 0;
    const isRecentPast = isPast && daysAgo >= 0 && daysAgo <= 7;

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
      Boolean(day.matchId);

    const matchesExplicitlyDeleted = Boolean(
      deletedMatch &&
        ((day.matchId && String(day.matchId) === String(deletedMatch.id)) ||
          (deletedDate && normalizedDate === deletedDate && (!deletedOpp || normalizeMatchText(day.opponent || day.matchDetails?.opponent) === deletedOpp)))
    );

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
    } else if (matchesExplicitlyDeleted || hasPlayedMarkers) {
      // Si NO existe acta en match_history, isPlayed en season_plan debe ser false para que el entrenador
      // pueda seleccionarlo y registrar su acta/estadísticas en MatchDashboard.
      const {
        matchId: _removedMatchId,
        matchRecord: _removedMatchRecord,
        ...restDay
      } = day;

      const updatedMatchDetails = day.matchDetails ? { ...day.matchDetails, played: false } : undefined;

      plan[key] = {
        ...restDay,
        isMatchDay: true,
        type: 'match',
        isPlayed: false,
        played: false,
        completed: false,
        ...(updatedMatchDetails ? { matchDetails: updatedMatchDetails } : {}),
      };
      changed = true;
    }
  }

  return { plan, changed };
}
