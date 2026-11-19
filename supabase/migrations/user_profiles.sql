-- =============================================================================
-- AM Manager — Tabla `public.user_profiles` + Trigger + Políticas RLS
-- =============================================================================
-- Propósito:
--   Almacenar el perfil deportivo y estadístico del entrenador registrado en
--   AM Manager con aislamiento estricto por usuario (`auth.uid() = id`).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text NOT NULL DEFAULT '',
  birth_year integer CHECK (birth_year IS NULL OR (birth_year >= 1940 AND birth_year <= 2015)),
  club_name text DEFAULT '',
  coach_role text NOT NULL DEFAULT 'primer_entrenador',
  main_category text NOT NULL DEFAULT 'senior_regional',
  province text DEFAULT '',
  accepted_terms_at timestamptz,
  terms_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_coach_role ON public.user_profiles(coach_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_main_category ON public.user_profiles(main_category);
CREATE INDEX IF NOT EXISTS idx_user_profiles_province ON public.user_profiles(province);

-- Activar Row Level Security y bloquear acceso anónimo
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_profiles FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO authenticated;

DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
CREATE POLICY user_profiles_select_own
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
CREATE POLICY user_profiles_insert_own
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
CREATE POLICY user_profiles_update_own
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS user_profiles_delete_own ON public.user_profiles;
CREATE POLICY user_profiles_delete_own
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger automático al registrar una cuenta nueva en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  raw_year text := NEW.raw_user_meta_data ->> 'birth_year';
  parsed_year integer := NULL;
BEGIN
  IF raw_year ~ '^\d{4}$' THEN
    parsed_year := raw_year::integer;
    IF parsed_year < 1940 OR parsed_year > 2015 THEN
      parsed_year := NULL;
    END IF;
  END IF;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    birth_year,
    club_name,
    coach_role,
    main_category,
    province,
    accepted_terms_at,
    terms_version,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), ''),
    parsed_year,
    COALESCE(trim(NEW.raw_user_meta_data ->> 'club_name'), ''),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'coach_role'), ''), 'primer_entrenador'),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'main_category'), ''), 'senior_regional'),
    COALESCE(trim(NEW.raw_user_meta_data ->> 'province'), ''),
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'accepted_terms_at') IS NOT NULL
      THEN (NEW.raw_user_meta_data ->> 'accepted_terms_at')::timestamptz
      ELSE NULL
    END,
    NEW.raw_user_meta_data ->> 'terms_version',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.user_profiles.full_name),
    birth_year = COALESCE(EXCLUDED.birth_year, public.user_profiles.birth_year),
    club_name = COALESCE(NULLIF(EXCLUDED.club_name, ''), public.user_profiles.club_name),
    coach_role = COALESCE(NULLIF(EXCLUDED.coach_role, ''), public.user_profiles.coach_role),
    main_category = COALESCE(NULLIF(EXCLUDED.main_category, ''), public.user_profiles.main_category),
    province = COALESCE(NULLIF(EXCLUDED.province, ''), public.user_profiles.province),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_profile();

-- Backfill seguro para usuarios ya existentes en auth.users
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  club_name,
  coach_role,
  main_category,
  province
)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', ''),
  COALESCE(u.raw_user_meta_data ->> 'club_name', ''),
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'coach_role', ''), 'primer_entrenador'),
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'main_category', ''), 'senior_regional'),
  COALESCE(u.raw_user_meta_data ->> 'province', '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

COMMIT;
