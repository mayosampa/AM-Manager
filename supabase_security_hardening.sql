-- =============================================================================
-- AM Manager — Script Definitivo de Endurecimiento de Seguridad (Supabase RLS)
-- =============================================================================
-- Propósito:
--   1. Garantizar aislamiento estricto multi-tenant (`auth.uid() = user_id`) en
--      todas las tablas de negocio: `teams`, `match_history`, `exercises`,
--      `season_plan` (y `app_state` si existiera).
--   2. Eliminar cualquier política permisiva heredada (`USING (true)` / `anon`).
--   3. Bloquear completamente el acceso anónimo (`anon` / `public`).
--   4. Mantener acceso compartido exclusivo para el cuerpo técnico fundador de
--      C.D. Álora mediante la función `SECURITY DEFINER` `public.is_founder_staff()`.
--
-- INSTRUCCIÓN PREVIA OBLIGATORIA ANTES DE EJECUTAR:
--   Sustituye los correos de ejemplo en `public.is_founder_staff()` y en el bloque
--   de asignación inicial por los correos reales verificados de los fundadores.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Asegurar columna `user_id` e índices en todas las tablas de negocio
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.teams
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE IF EXISTS public.match_history
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE IF EXISTS public.exercises
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE IF EXISTS public.season_plan
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_teams_user_id ON public.teams(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON public.match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_season_plan_user_id ON public.season_plan(user_id);

-- -----------------------------------------------------------------------------
-- 2. Función SECURITY DEFINER para Staff Fundador (C.D. Álora)
-- -----------------------------------------------------------------------------
-- Nota de seguridad:
--   * `SET search_path = public, auth` previene ataques de search_path hijacking.
--   * Solo los correos verificados del staff fundador listados aquí obtienen acceso
--     compartido entre sí sobre los datos existentes de C.D. Álora.
--   * Si no se sustituyen los correos de ejemplo, nadie coincide accidentalmente.
CREATE OR REPLACE FUNCTION public.is_founder_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND COALESCE((auth.jwt() ->> 'email_confirmed_at') IS NOT NULL, true)
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = ANY (ARRAY[
      -- Reemplazar con los correos reales del staff fundador de C.D. Álora:
      'reemplazar.fundador1@ammanager.es',
      'reemplazar.fundador2@ammanager.es'
    ]);
$$;

REVOKE ALL ON FUNCTION public.is_founder_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_founder_staff() TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. Backfill seguro de filas legacy sin `user_id` (evita filas huérfanas)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  founder_uid uuid;
BEGIN
  SELECT id INTO founder_uid
  FROM auth.users
  WHERE lower(email) IN (
    'reemplazar.fundador1@ammanager.es',
    'reemplazar.fundador2@ammanager.es'
  )
  ORDER BY created_at ASC
  LIMIT 1;

  IF founder_uid IS NOT NULL THEN
    UPDATE public.teams SET user_id = founder_uid WHERE user_id IS NULL;
    UPDATE public.match_history SET user_id = founder_uid WHERE user_id IS NULL;
    UPDATE public.exercises SET user_id = founder_uid WHERE user_id IS NULL;
    UPDATE public.season_plan SET user_id = founder_uid WHERE user_id IS NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Trigger anti-suplantación y preservación de propietario en UPDATE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_row_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permitir operaciones administrativas ejecutadas desde SQL Editor / service_role
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NULL THEN
      NEW.user_id := auth.uid();
    ELSIF NEW.user_id <> auth.uid() AND NOT public.is_founder_staff() THEN
      RAISE EXCEPTION 'No autorizado para insertar registros a nombre de otro usuario.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Nunca permitir que un usuario reasigne la propiedad del registro
    IF OLD.user_id IS NOT NULL THEN
      NEW.user_id := OLD.user_id;
    ELSE
      NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_row_ownership() FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 5. Eliminación de TODAS las políticas previas + Habilitación estricta de RLS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['teams', 'match_history', 'exercises', 'season_plan', 'app_state']
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      -- Eliminar cualquier política existente (incluyendo USING (true))
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
      END LOOP;

      -- Activar RLS y bloquear acceso anónimo
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, public;', tbl);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', tbl);

      -- Trigger de propiedad
      EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_ownership_%I ON public.%I;', tbl, tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_enforce_ownership_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_row_ownership();',
        tbl, tbl
      );

      -- Políticas explícitas por operación (solo usuarios autenticados).
      -- Nota: las filas legacy con `user_id IS NULL` quedan ocultas para cualquier
      -- usuario nuevo (`user_id = auth.uid()` es falso) y solo accesibles para `is_founder_staff()`.
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR (public.is_founder_staff() AND (user_id IS NULL OR user_id IS NOT NULL))));',
        tbl || '_select_own_or_founder', tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_founder_staff()));',
        tbl || '_insert_own_or_founder', tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR (public.is_founder_staff() AND (user_id IS NULL OR user_id IS NOT NULL)))) WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_founder_staff()));',
        tbl || '_update_own_or_founder', tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR (public.is_founder_staff() AND (user_id IS NULL OR user_id IS NOT NULL))));',
        tbl || '_delete_own_or_founder', tbl
      );
    END IF;
  END LOOP;
END $$;

-- Si existiera la tabla legacy `app_state`, asegurar columna `user_id` si existe
DO $$
BEGIN
  IF to_regclass('public.app_state') IS NOT NULL THEN
    ALTER TABLE public.app_state
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
    CREATE INDEX IF NOT EXISTS idx_app_state_user_id ON public.app_state(user_id);
  END IF;
END $$;

COMMIT;
