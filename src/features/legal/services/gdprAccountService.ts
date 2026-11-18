import { supabase } from '../../../services/supabase';
import { performCleanLogout, requireAuthUserId } from '../../../services/authSession';

export interface GdprExportBundle {
  exportedAt: string;
  formatVersion: '1.0';
  platform: string;
  gdprBasis: string;
  account: {
    id: string;
    email: string | null;
    metadata: Record<string, any>;
  };
  data: {
    teams: any[];
    match_history: any[];
    exercises: any[];
    season_plan: any[];
  };
}

/**
 * Consulta si la sesión actual pertenece al staff fundador mediante RPC `is_founder_staff`
 * (con fallback seguro si la función SQL aún no se ha desplegado).
 */
export async function checkIsFounderStaff(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_founder_staff');
    if (!error && typeof data === 'boolean') return data;
  } catch {
    // fallback silencioso si la RPC todavía no existe
  }
  return false;
}

/**
 * Exporta todos los datos del usuario autenticado en formato JSON (Art. 20 RGPD - Portabilidad).
 */
export async function exportAllUserDataAsJson(): Promise<GdprExportBundle> {
  const userId = await requireAuthUserId();
  const { data: userData } = await supabase.auth.getUser();

  const [teamsRes, matchesRes, exercisesRes, planRes] = await Promise.all([
    supabase.from('teams').select('*'),
    supabase.from('match_history').select('*'),
    supabase.from('exercises').select('*'),
    supabase.from('season_plan').select('*'),
  ]);

  if (teamsRes.error) throw new Error(`Error exportando equipos: ${teamsRes.error.message}`);
  if (matchesRes.error) throw new Error(`Error exportando historial: ${matchesRes.error.message}`);
  if (exercisesRes.error) throw new Error(`Error exportando ejercicios: ${exercisesRes.error.message}`);
  if (planRes.error) throw new Error(`Error exportando planificación: ${planRes.error.message}`);

  const bundle: GdprExportBundle = {
    exportedAt: new Date().toISOString(),
    formatVersion: '1.0',
    platform: 'AM Manager (ammanager.es)',
    gdprBasis: 'Derecho a la portabilidad de los datos (Art. 20 RGPD)',
    account: {
      id: userId,
      email: userData?.user?.email ?? null,
      metadata: userData?.user?.user_metadata ?? {},
    },
    data: {
      teams: teamsRes.data || [],
      match_history: matchesRes.data || [],
      exercises: exercisesRes.data || [],
      season_plan: planRes.data || [],
    },
  };

  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateTag = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', `am-manager-rgpd-export-${dateTag}.json`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return bundle;
}

/**
 * Elimina todos los registros propiedad del `user_id` actual en Supabase
 * (`match_history`, `exercises`, `season_plan`, `teams`), purga cachés locales y cierra sesión.
 */
export async function deleteAllUserDataAndLogout(): Promise<void> {
  const userId = await requireAuthUserId();

  const tables = ['match_history', 'exercises', 'season_plan', 'teams'] as const;
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) {
      throw new Error(`No se pudieron eliminar tus datos en '${table}': ${error.message}`);
    }
  }

  await performCleanLogout();
}
