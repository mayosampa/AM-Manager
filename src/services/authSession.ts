import { supabase } from './supabase';
import { cacheService } from './cacheService';
import { appDb } from '../infrastructure/database/db';

const purgeListeners = new Set<() => void>();
const preLogoutHooks = new Set<() => Promise<void>>();

export function registerCachePurgeListener(listener: () => void): () => void {
  purgeListeners.add(listener);
  return () => {
    purgeListeners.delete(listener);
  };
}

export function registerPreLogoutHook(hook: () => Promise<void>): () => void {
  preLogoutHooks.add(hook);
  return () => {
    preLogoutHooks.delete(hook);
  };
}

/**
 * Obtiene el `auth.uid()` de la sesión activa o lanza un error si el usuario no está autenticado.
 * Garantiza que ninguna operación de base de datos se ejecute de forma anónima.
 */
export async function requireAuthUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.id) {
    throw new Error('Sesión no autenticada. Inicia sesión para acceder o modificar datos.');
  }
  return session.user.id;
}

/**
 * Purga cualquier dato sensible cacheado localmente (memoria, localStorage, sessionStorage e IndexedDB)
 * para garantizar aislamiento estricto entre distintos entrenadores en el mismo dispositivo.
 * Mantiene intactas las preferencias no sensibles de consentimiento informativo (`am_cookie_notice_ack_v1`).
 */
export async function purgeLocalSensitiveCaches(): Promise<void> {
  cacheService.clear();
  purgeListeners.forEach(fn => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('am_open_callup_validator');
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith('visibleTableColumns_') ||
          key.startsWith('am_stat_metrics_') ||
          key.startsWith('am_board_')
        ) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore storage errors
    }
  }

  await appDb.exercises.clear().catch(() => {});
}

/**
 * Cierra la sesión de forma limpia: sincroniza/cancela operaciones pendientes antes del signOut,
 * cierra sesión en Supabase Auth y purga todas las cachés locales.
 */
export async function performCleanLogout(): Promise<void> {
  for (const hook of preLogoutHooks) {
    await hook().catch(() => {});
  }
  await supabase.auth.signOut().catch(() => {});
  await purgeLocalSensitiveCaches();
}
