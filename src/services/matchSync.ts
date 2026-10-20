import { MatchRecord } from '../types';

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
  teamId?: string
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

  for (const [key, day] of Object.entries(plan)) {
    if (!day || typeof day !== 'object') continue;
    const isMatch = day.isMatchDay === true || day.type === 'match';
    if (!isMatch) continue;

    const matchesTeam = !day.teamId || !teamId || day.teamId === teamId;
    if (!matchesTeam) continue;

    const normalizedDate = day.dateString || (key.includes('_') ? key.split('_').pop()! : key);
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
    } else if (hasPlayedMarkers) {
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
        ...(updatedMatchDetails ? { matchDetails: updatedMatchDetails } : {}),
      };
      changed = true;
    }
  }

  return { plan, changed };
}
