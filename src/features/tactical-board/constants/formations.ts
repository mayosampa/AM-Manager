import { BoardToken, Point, TeamType } from '../../../types';

export interface FormationSlot { label: string; pos: Point }

/**
 * Formations authored for the HOME team attacking left → right on a full pitch (0-100%).
 * They are compressed into the team's own half by `toOwnHalf` before being placed.
 */
export const FORMATIONS: Record<string, FormationSlot[]> = {
  '2-3-1': [
    { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 20 } }, { label: '3', pos: { x: 20, y: 50 } },
    { label: '4', pos: { x: 25, y: 80 } }, { label: '5', pos: { x: 45, y: 35 } }, { label: '6', pos: { x: 45, y: 65 } },
    { label: '7', pos: { x: 75, y: 50 } },
  ],
  '3-2-1': [
    { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 15 } }, { label: '3', pos: { x: 20, y: 50 } },
    { label: '4', pos: { x: 25, y: 85 } }, { label: '5', pos: { x: 50, y: 35 } }, { label: '6', pos: { x: 50, y: 65 } },
    { label: '7', pos: { x: 80, y: 50 } },
  ],
  '2-2-2': [
    { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 30 } }, { label: '3', pos: { x: 25, y: 70 } },
    { label: '4', pos: { x: 50, y: 30 } }, { label: '5', pos: { x: 50, y: 70 } }, { label: '6', pos: { x: 80, y: 30 } },
    { label: '7', pos: { x: 80, y: 70 } },
  ],
  '4-4-2': [
    { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 85 } }, { label: '3', pos: { x: 25, y: 15 } },
    { label: '4', pos: { x: 20, y: 38 } }, { label: '5', pos: { x: 20, y: 62 } }, { label: '6', pos: { x: 50, y: 38 } },
    { label: '8', pos: { x: 50, y: 62 } }, { label: '7', pos: { x: 55, y: 88 } }, { label: '11', pos: { x: 55, y: 12 } },
    { label: '9', pos: { x: 85, y: 38 } }, { label: '10', pos: { x: 85, y: 62 } },
  ],
  '4-3-3': [
    { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 85 } }, { label: '3', pos: { x: 25, y: 15 } },
    { label: '4', pos: { x: 20, y: 38 } }, { label: '5', pos: { x: 20, y: 62 } }, { label: '6', pos: { x: 42, y: 50 } },
    { label: '8', pos: { x: 58, y: 28 } }, { label: '10', pos: { x: 58, y: 72 } }, { label: '7', pos: { x: 82, y: 85 } },
    { label: '11', pos: { x: 82, y: 15 } }, { label: '9', pos: { x: 90, y: 50 } },
  ],
  '3-5-2': [
    { label: '1', pos: { x: 5, y: 50 } }, { label: '4', pos: { x: 22, y: 22 } }, { label: '5', pos: { x: 18, y: 50 } },
    { label: '3', pos: { x: 22, y: 78 } }, { label: '11', pos: { x: 55, y: 10 } }, { label: '6', pos: { x: 40, y: 50 } },
    { label: '8', pos: { x: 55, y: 32 } }, { label: '10', pos: { x: 55, y: 68 } }, { label: '2', pos: { x: 55, y: 90 } },
    { label: '9', pos: { x: 85, y: 38 } }, { label: '7', pos: { x: 85, y: 62 } },
  ],
};

/** Own-half band (in % of pitch width) used for the home team. Away is mirrored. */
const HALF_MIN = 4;
const HALF_MAX = 46;

/** Maps a full-pitch formation point into the given team's half (no overlap with the rival). */
export function toOwnHalf(pos: Point, team: TeamType): Point {
  const x = HALF_MIN + (pos.x / 100) * (HALF_MAX - HALF_MIN);
  if (team === 'away') return { x: 100 - x, y: 100 - pos.y };
  return { x, y: pos.y };
}

/** Minimum distance (in % units) for two tokens to be considered overlapping. */
const OVERLAP_PCT = 4;

const isFree = (p: Point, tokens: BoardToken[]) =>
  !tokens.some(t => Math.hypot(t.position.x - p.x, t.position.y - p.y) < OVERLAP_PCT);

/**
 * Returns the first free tactical slot for a quick-added player, so consecutive
 * clicks build a formation instead of stacking every token on the same coordinate.
 */
export function findFreeSlot(team: TeamType, tokens: BoardToken[], isF7: boolean): Point {
  if (team === 'neutral') {
    const ring = [{ x: 50, y: 50 }, { x: 50, y: 35 }, { x: 50, y: 65 }, { x: 50, y: 20 }, { x: 50, y: 80 }];
    const free = ring.find(p => isFree(p, tokens));
    if (free) return free;
  } else {
    const base = FORMATIONS[isF7 ? '2-3-1' : '4-3-3'];
    for (const slot of base) {
      const p = toOwnHalf(slot.pos, team);
      if (isFree(p, tokens)) return p;
    }
  }
  // Fallback: deterministic grid scan inside the team's area
  const startX = team === 'away' ? 55 : team === 'neutral' ? 40 : 10;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 5; col++) {
      const p = { x: startX + col * 7, y: 12 + row * 11 };
      if (isFree(p, tokens)) return p;
    }
  }
  return { x: 50, y: 50 };
}
