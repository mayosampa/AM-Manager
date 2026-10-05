import { MatchRecord, Player } from '../types';

export interface PlayerStatsAggregated {
  playerId: string;
  number: number;
  name: string;
  matches: number;
  starts: number;
  callUps: number;
  benchStarts: number;
  minPercentage: number;
  captaincies: number;
  _possibleMins?: number;
  avgMinutes: number;
  trainingAttendance: number;
  cleanSheets: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  averageRating: number;
}

/** Normalises any id (string | number | uuid | null) to a comparable string. */
export const normId = (v: unknown): string =>
  v === undefined || v === null ? '' : String(v).trim();

const normName = (v: unknown): string =>
  normId(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Builds a resolver that maps any player id found inside a match JSON
 * (squad / bench / events / playerMinutes) to the id of the CURRENT roster player.
 *
 * Match records store a *snapshot* of the players at save time. If the roster was
 * re-created (e.g. during the localStorage → Supabase migration) the snapshot ids no
 * longer equal the roster ids, so we fall back to dorsal+name and then name.
 */
function buildResolver(roster: Player[], match: MatchRecord) {
  const byId = new Map<string, string>();
  const byNumName = new Map<string, string>();
  const byName = new Map<string, string>();

  roster.forEach(p => {
    const id = normId(p.id);
    byId.set(id, id);
    byNumName.set(`${normId(p.number)}|${normName(p.name)}`, id);
    byName.set(normName(p.name), id);
  });

  const snapshot = new Map<string, Player>();
  [...(match.squad || []), ...(match.bench || [])].filter(Boolean).forEach(p => {
    snapshot.set(normId(p.id), p);
  });

  return (rawId: unknown): string | null => {
    const id = normId(rawId);
    if (!id || id === 'rival') return null;
    if (byId.has(id)) return id;

    const snap = snapshot.get(id);
    if (snap) {
      const k = `${normId(snap.number)}|${normName(snap.name)}`;
      if (byNumName.has(k)) return byNumName.get(k)!;
      const n = normName(snap.name);
      if (n && byName.has(n)) return byName.get(n)!;
    }
    return null;
  };
}

/** Pure function: aggregates every match in match_history for the given roster. */
export function aggregatePlayerStats(
  roster: Player[],
  history: MatchRecord[],
  teamId: string
): PlayerStatsAggregated[] {
  const statsMap: Record<string, PlayerStatsAggregated> = {};
  const players = (roster || []).filter(Boolean);

  players.forEach(p => {
    const evals = p.evaluations || [];
    const avg = evals.length > 0 ? evals.reduce((a, c) => a + (Number(c.rating) || 0), 0) / evals.length : 0;
    const pid = normId(p.id);
    statsMap[pid] = {
      playerId: pid,
      number: Number(p.number),
      name: p.name || 'Desconocido',
      matches: 0, starts: 0, callUps: 0, benchStarts: 0, minPercentage: 0,
      captaincies: 0, _possibleMins: 0, avgMinutes: 0,
      trainingAttendance: p.attendance?.trainingPercentage || 0,
      cleanSheets: 0, minutesPlayed: 0, goals: 0, assists: 0, yellows: 0, reds: 0,
      averageRating: Number(avg.toFixed(1)) || 0,
    };
  });

  let unresolved = 0;

  (history || []).forEach(match => {
    if (!match) return;
    // getMatches already filters by team_id; only skip if explicitly another team.
    if (match.teamId && normId(match.teamId) !== normId(teamId)) return;

    const resolve = buildResolver(players, match);
    const durationMin = Math.floor((Number(match.duration) || 90 * 60) / 60);
    const events = match.events || [];

    const subbedIn = new Set<string>();
    events.forEach(ev => {
      if (ev.type === 'sub') {
        const rIn = resolve(ev.playerInId);
        if (rIn) subbedIn.add(rIn);
      }
    });

    const minutes: Record<string, number> = {};
    const callUps = new Set<string>();
    const starters = new Set<string>();

    (match.squad || []).filter(Boolean).forEach(p => {
      const r = resolve(p.id);
      if (!r) { unresolved++; return; }
      callUps.add(r);
      minutes[r] = durationMin;
      // Manual entry saves sub-ins inside `squad`; they are not real starters.
      if (!subbedIn.has(r)) starters.add(r);
    });

    (match.bench || []).filter(Boolean).forEach(p => {
      const r = resolve(p.id);
      if (!r) { unresolved++; return; }
      callUps.add(r);
      if (minutes[r] === undefined) minutes[r] = 0;
    });

    if (match.playerMinutes && Object.keys(match.playerMinutes).length > 0) {
      // Source of truth: minutes persisted explicitly by the manual form.
      Object.keys(minutes).forEach(k => { minutes[k] = 0; });
      Object.entries(match.playerMinutes).forEach(([rawId, mins]) => {
        const r = resolve(rawId);
        if (!r) { unresolved++; return; }
        minutes[r] = Number(mins) || 0;
        callUps.add(r);
      });
    } else {
      // Legacy / live matches: rebuild minutes from squad + sub events.
      events
        .filter(ev => ev.type === 'sub')
        .slice()
        .sort((a, b) => (a.time || 0) - (b.time || 0))
        .forEach(ev => {
          const t = Math.floor((Number(ev.time) || 0) / 60);
          const rOut = resolve(ev.playerId);
          const rIn = resolve(ev.playerInId);
          if (rOut) {
            const enteredAt = subbedIn.has(rOut) ? durationMin - (minutes[rOut] || 0) : 0;
            minutes[rOut] = Math.max(0, t - enteredAt);
          }
          if (rIn) {
            minutes[rIn] = Math.max(0, durationMin - t);
            callUps.add(rIn);
          }
        });
    }

    const isCleanSheet =
      match.rivalScore === 0 ||
      (match.score && match.score.away === 0 && match.condition === 'Local') ||
      (match.score && match.score.home === 0 && match.condition === 'Visitante');

    callUps.forEach(pid => {
      const s = statsMap[pid];
      if (!s) return;
      s.callUps += 1;
      s._possibleMins = (s._possibleMins || 0) + durationMin;
      if (starters.has(pid)) s.starts += 1; else s.benchStarts += 1;

      const played = Math.min(minutes[pid] || 0, durationMin + 30);
      if (played > 0) {
        s.matches += 1;
        if (isCleanSheet) s.cleanSheets += 1;
      }
      s.minutesPlayed += played;
    });

    const captain = (match.squad || []).find(p => p && p.isCaptain);
    if (captain) {
      const r = resolve(captain.id);
      if (r && statsMap[r]) statsMap[r].captaincies += 1;
    }

    events.forEach(ev => {
      const r = resolve(ev.playerId);
      if (ev.type === 'goal') {
        if (r && statsMap[r]) statsMap[r].goals += 1;
        const a = resolve(ev.assistId);
        if (a && statsMap[a]) statsMap[a].assists += 1;
      } else if (r && statsMap[r]) {
        if (ev.type === 'assist') statsMap[r].assists += 1;
        if (ev.type === 'yellow') statsMap[r].yellows += 1;
        if (ev.type === 'red') statsMap[r].reds += 1;
      }
    });
  });

  if (unresolved > 0) {
    console.warn(`[aggregatePlayerStats] ${unresolved} referencias de jugador en match_history no coinciden con la plantilla actual.`);
  }

  return Object.values(statsMap).map(p => {
    p.avgMinutes = p.matches > 0 ? Math.round(p.minutesPlayed / p.matches) : 0;
    const possible = p._possibleMins || 0;
    p.minPercentage = Math.min(100, possible > 0 ? Math.round((p.minutesPlayed / possible) * 100) : 0);
    delete p._possibleMins;
    return p;
  });
}
