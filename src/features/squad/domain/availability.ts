import type { Player } from '../../../types';

/**
 * Dominio único de disponibilidad de jugadores.
 * Toda pantalla (convocatoria, planificador, plantilla, PDF) debe preguntar aquí
 * en lugar de combinar `status` / `isSuspended` / `isActive` por su cuenta.
 */

export type AvailabilityState = 'archived' | 'suspended' | 'injured' | 'unavailable' | 'available';

/** Nombres de icono (lucide) como strings: el dominio no depende de React. */
export type AvailabilityIcon = 'archive' | 'shield-alert' | 'plus-square' | 'user-x' | 'check-circle';

export interface AvailabilityInfo {
  state: AvailabilityState;
  /** Etiqueta larga: "Disponible", "Lesionado"... */
  label: string;
  /** Etiqueta corta para badges compactos: "Disp.", "Lesión"... */
  shortLabel: string;
  icon: AvailabilityIcon;
  /** Clases Tailwind para texto / badge en la UI oscura. */
  textClass: string;
  badgeClass: string;
  /** Colores hex (fondo claro) para el PDF. */
  pdf: { background: string; text: string };
}

export const AVAILABILITY_META: Record<AvailabilityState, Omit<AvailabilityInfo, 'state'>> = {
  archived: {
    label: 'Baja',
    shortLabel: 'Baja',
    icon: 'archive',
    textClass: 'text-gray-400',
    badgeClass: 'bg-gray-500/10 text-gray-400',
    pdf: { background: '#f3f4f6', text: '#374151' },
  },
  suspended: {
    label: 'Sancionado',
    shortLabel: 'Sanc.',
    icon: 'shield-alert',
    textClass: 'text-[#FF4B4B]',
    badgeClass: 'bg-[#FF4B4B]/10 text-[#FF4B4B]',
    pdf: { background: '#fee2e2', text: '#991b1b' },
  },
  injured: {
    label: 'Lesionado',
    shortLabel: 'Lesión',
    icon: 'plus-square',
    textClass: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/10 text-yellow-400',
    pdf: { background: '#fef3c7', text: '#92400e' },
  },
  unavailable: {
    label: 'No disponible',
    shortLabel: 'No disp.',
    icon: 'user-x',
    textClass: 'text-gray-400',
    badgeClass: 'bg-gray-500/10 text-gray-400',
    pdf: { background: '#f3f4f6', text: '#374151' },
  },
  available: {
    label: 'Disponible',
    shortLabel: 'Disp.',
    icon: 'check-circle',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400',
    pdf: { background: '#d1fae5', text: '#065f46' },
  },
};

/** Jugador dentro de la plantilla activa (no dado de baja / archivado). */
export const isActiveRoster = (p: Player): boolean => p.isActive !== false;

/** Único criterio para convocatorias, selección de partido y recuentos de disponibles. */
export const isCallable = (p: Player): boolean =>
  p.isActive !== false && !p.isSuspended && p.status === 'available';

/**
 * Estado efectivo con precedencia explícita:
 * archived > suspended > injured > unavailable > available.
 */
export function getAvailabilityState(p: Player): AvailabilityState {
  if (p.isActive === false) return 'archived';
  if (p.isSuspended) return 'suspended';
  if (p.status === 'injured') return 'injured';
  if (p.status === 'unavailable') return 'unavailable';
  return 'available';
}

/** Estado + etiqueta + icono + colores listos para pintar. */
export function getAvailabilityInfo(p: Player): AvailabilityInfo {
  const state = getAvailabilityState(p);
  return { state, ...AVAILABILITY_META[state] };
}
