/** Placeholder visible cuando no hay fecha de nacimiento válida. */
export const NO_DATA = '—';

interface ParsedDate { year: number; month: number; day: number }

/** Parsea 'YYYY-MM-DD' sin pasar por `new Date(string)` (evita desfases de zona horaria). */
function parseIsoDate(value?: string | null): ParsedDate | null {
  if (!value || typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;
  return { year, month, day };
}

/** ¿Fecha de nacimiento utilizable? (formato ISO real, >= 1900 y no futura). */
export function isValidBirthDate(value?: string | null, today: Date = new Date()): boolean {
  const parsed = parseIsoDate(value);
  if (!parsed || parsed.year < 1900) return false;
  const birth = new Date(parsed.year, parsed.month - 1, parsed.day);
  return birth.getTime() <= today.getTime();
}

/** Edad en años, o null si la fecha falta o no es válida. */
export function getAge(birthDate?: string | null, today: Date = new Date()): number | null {
  if (!isValidBirthDate(birthDate, today)) return null;
  const { year, month, day } = parseIsoDate(birthDate)!;
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age--;
  return age;
}

/** "23 años" o "—" (nunca "NaN" ni "- años"). */
export function formatAge(birthDate?: string | null): string {
  const age = getAge(birthDate);
  return age === null ? NO_DATA : `${age} años`;
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY', o "—" si no es válida. */
export function formatBirthDateEsp(birthDate?: string | null): string {
  const parsed = parseIsoDate(birthDate);
  if (!parsed || !isValidBirthDate(birthDate)) return NO_DATA;
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  return `${dd}/${mm}/${parsed.year}`;
}
