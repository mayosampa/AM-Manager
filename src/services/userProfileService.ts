import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type CoachRole =
  | 'primer_entrenador'
  | 'segundo_entrenador'
  | 'preparador_fisico'
  | 'entrenador_porteros'
  | 'coordinador';

export type MainCategory =
  | 'futbol_7_base'
  | 'infantil_cadete'
  | 'juvenil'
  | 'senior_regional'
  | 'femenino';

export const COACH_ROLE_OPTIONS: { value: CoachRole; label: string }[] = [
  { value: 'primer_entrenador', label: 'Primer Entrenador' },
  { value: 'segundo_entrenador', label: 'Segundo Entrenador' },
  { value: 'preparador_fisico', label: 'Preparador Físico' },
  { value: 'entrenador_porteros', label: 'Entrenador de Porteros' },
  { value: 'coordinador', label: 'Coordinador / Director Deportivo' },
];

export const MAIN_CATEGORY_OPTIONS: { value: MainCategory; label: string }[] = [
  { value: 'futbol_7_base', label: 'Fútbol 7 / Base (Prebenjamín - Alevín)' },
  { value: 'infantil_cadete', label: 'Infantil / Cadete' },
  { value: 'juvenil', label: 'Juvenil' },
  { value: 'senior_regional', label: 'Sénior / Regional' },
  { value: 'femenino', label: 'Fútbol Femenino' },
];

export interface CoachProfilePayload {
  id: string;
  email: string;
  fullName: string;
  birthYear: number | null;
  clubName: string;
  coachRole: CoachRole;
  mainCategory: MainCategory;
  province: string;
  acceptedTermsAt?: string | null;
  termsVersion?: string | null;
}

const VALID_ROLES = new Set<string>(COACH_ROLE_OPTIONS.map(o => o.value));
const VALID_CATEGORIES = new Set<string>(MAIN_CATEGORY_OPTIONS.map(o => o.value));

function sanitizeBirthYear(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  const year = Math.trunc(num);
  return year >= 1940 && year <= 2015 ? year : null;
}

export function extractCoachProfileFromAuthUser(user: User): CoachProfilePayload {
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const role: CoachRole = VALID_ROLES.has(meta.coach_role) ? meta.coach_role : 'primer_entrenador';
  const cat: MainCategory = VALID_CATEGORIES.has(meta.main_category) ? meta.main_category : 'senior_regional';

  return {
    id: user.id,
    email: user.email || '',
    fullName: String(meta.full_name || '').trim(),
    birthYear: sanitizeBirthYear(meta.birth_year),
    clubName: String(meta.club_name || '').trim(),
    coachRole: role,
    mainCategory: cat,
    province: String(meta.province || '').trim(),
    acceptedTermsAt: meta.accepted_terms_at || null,
    termsVersion: meta.terms_version || null,
  };
}

/**
 * Sincroniza silenciosamente `user_profiles` en Supabase a partir de `user.user_metadata`.
 * Envuelto en try/catch para no bloquear nunca el flujo si la migración SQL aún no se ha aplicado.
 */
export async function syncUserProfileFromAuthUser(user: User | null | undefined): Promise<void> {
  if (!user?.id) return;
  try {
    const profile = extractCoachProfileFromAuthUser(user);
    await supabase.from('user_profiles').upsert(
      {
        id: profile.id,
        email: profile.email || null,
        full_name: profile.fullName,
        birth_year: profile.birthYear,
        club_name: profile.clubName,
        coach_role: profile.coachRole,
        main_category: profile.mainCategory,
        province: profile.province,
        accepted_terms_at: profile.acceptedTermsAt || null,
        terms_version: profile.termsVersion || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Fallback silencioso si la tabla user_profiles aún no existe o está offline
  }
}

export async function loadCurrentCoachProfile(): Promise<CoachProfilePayload | null> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return null;

    const fromMeta = extractCoachProfileFromAuthUser(user);
    const { data: row, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && row) {
      return {
        id: user.id,
        email: row.email || fromMeta.email,
        fullName: row.full_name || fromMeta.fullName,
        birthYear: sanitizeBirthYear(row.birth_year) ?? fromMeta.birthYear,
        clubName: row.club_name ?? fromMeta.clubName,
        coachRole: VALID_ROLES.has(row.coach_role) ? row.coach_role : fromMeta.coachRole,
        mainCategory: VALID_CATEGORIES.has(row.main_category) ? row.main_category : fromMeta.mainCategory,
        province: row.province ?? fromMeta.province,
        acceptedTermsAt: row.accepted_terms_at ?? fromMeta.acceptedTermsAt,
        termsVersion: row.terms_version ?? fromMeta.termsVersion,
      };
    }

    return fromMeta;
  } catch {
    return null;
  }
}

export async function saveCurrentCoachProfile(
  patch: Partial<Omit<CoachProfilePayload, 'id' | 'email'>>
): Promise<CoachProfilePayload | null> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) throw new Error('Sesión no iniciada.');

  const current = extractCoachProfileFromAuthUser(user);
  const next: CoachProfilePayload = {
    ...current,
    ...patch,
    fullName: (patch.fullName !== undefined ? patch.fullName : current.fullName).trim(),
    clubName: (patch.clubName !== undefined ? patch.clubName : current.clubName).trim(),
    province: (patch.province !== undefined ? patch.province : current.province).trim(),
    birthYear: patch.birthYear !== undefined ? sanitizeBirthYear(patch.birthYear) : current.birthYear,
  };

  const { error: authErr } = await supabase.auth.updateUser({
    data: {
      full_name: next.fullName,
      birth_year: next.birthYear,
      club_name: next.clubName,
      coach_role: next.coachRole,
      main_category: next.mainCategory,
      province: next.province,
    },
  });
  if (authErr) throw authErr;

  try {
    await supabase.from('user_profiles').upsert(
      {
        id: user.id,
        email: user.email || null,
        full_name: next.fullName,
        birth_year: next.birthYear,
        club_name: next.clubName,
        coach_role: next.coachRole,
        main_category: next.mainCategory,
        province: next.province,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Fallback silencioso si la tabla SQL aún no está desplegada
  }

  return next;
}

export function resolveInitialTeamDefaultsFromUser(
  user: User | null | undefined
): { initialTeamName: string; initialModality: 'F7' | 'F11' } {
  if (!user) return { initialTeamName: 'Mi Equipo', initialModality: 'F11' };
  const profile = extractCoachProfileFromAuthUser(user);
  const cleanClub = profile.clubName.trim();
  const hasRealClub = Boolean(cleanClub) && !/^sin\s*equipo$/i.test(cleanClub);

  return {
    initialTeamName: hasRealClub ? cleanClub : 'Mi Equipo',
    initialModality: profile.mainCategory === 'futbol_7_base' ? 'F7' : 'F11',
  };
}
