import type { PositionGroup } from '../../../types';

export type LineGroup = Exclude<PositionGroup, 'Todos'>;

/** Orden en el que se muestran las líneas (filtros, PDF...). */
export const LINE_GROUPS: LineGroup[] = ['Porteros', 'Defensas', 'Medios', 'Delanteros'];

export interface PositionOption { code: string; label: string }

/** Catálogo cerrado de posiciones por línea. Única fuente de verdad. */
export const POSITION_CATALOG: Record<LineGroup, PositionOption[]> = {
  Porteros: [
    { code: 'POR', label: 'Portero' },
  ],
  Defensas: [
    { code: 'DFC', label: 'Defensa central' },
    { code: 'LD', label: 'Lateral derecho' },
    { code: 'LI', label: 'Lateral izquierdo' },
    { code: 'CAD', label: 'Carrilero derecho' },
    { code: 'CAI', label: 'Carrilero izquierdo' },
  ],
  Medios: [
    { code: 'MCD', label: 'Mediocentro defensivo' },
    { code: 'MC', label: 'Mediocentro' },
    { code: 'MCO', label: 'Mediocentro ofensivo' },
    { code: 'MD', label: 'Medio derecho' },
    { code: 'MI', label: 'Medio izquierdo' },
  ],
  Delanteros: [
    { code: 'ED', label: 'Extremo derecho' },
    { code: 'EI', label: 'Extremo izquierdo' },
    { code: 'SD', label: 'Segundo delantero' },
    { code: 'DC', label: 'Delantero centro' },
  ],
};

/** Códigos antiguos (texto libre) que siguen resolviendo a una línea para no romper plantillas existentes. */
const LEGACY_POSITION_ALIASES: Record<string, LineGroup> = {
  PT: 'Porteros',
  INT: 'Medios',
  EX: 'Delanteros',
};

/** Línea lógica de un código de posición, o null si no se reconoce. */
export function getGroupForPosition(position?: string | null): LineGroup | null {
  if (!position || typeof position !== 'string') return null;
  const code = position.trim().toUpperCase();
  if (!code) return null;
  for (const group of LINE_GROUPS) {
    if (POSITION_CATALOG[group].some(option => option.code === code)) return group;
  }
  return LEGACY_POSITION_ALIASES[code] ?? null;
}

/** ¿El código pertenece al catálogo cerrado actual? */
export function isCatalogPosition(position?: string | null): boolean {
  if (!position) return false;
  const code = position.trim().toUpperCase();
  return LINE_GROUPS.some(group => POSITION_CATALOG[group].some(option => option.code === code));
}

/**
 * Línea efectiva de un jugador: la que sale de su posición y, si no se reconoce,
 * la `positionGroup` guardada. Devuelve null si ninguna es una línea válida ("Otro").
 */
export function getPlayerLine(player: { position?: string; positionGroup?: PositionGroup }): LineGroup | null {
  const fromPosition = getGroupForPosition(player.position);
  if (fromPosition) return fromPosition;
  const stored = player.positionGroup;
  return stored && stored !== 'Todos' ? stored : null;
}
