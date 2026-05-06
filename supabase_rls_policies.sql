-- ============================================================
-- DomusHR: Supabase RLS Policies & Audit Logs Table
-- ============================================================
-- Run this script in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This replaces the server-side security that was lost during Express→Supabase migration
-- ============================================================

-- ─── 1. Create audit_logs table ───────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ─── 2. Helper function: get user role from profiles ─────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── 3. Enable RLS on all tables ─────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on settings only if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    EXECUTE 'ALTER TABLE settings ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ─── 4. RLS Policies: EMPLOYEES ──────────────────────────────
-- All authenticated users can READ employees
DROP POLICY IF EXISTS "employees_select_all" ON employees;
CREATE POLICY "employees_select_all" ON employees
    FOR SELECT TO authenticated
    USING (true);

-- Only master/admin can INSERT, UPDATE, DELETE employees
DROP POLICY IF EXISTS "employees_insert_privileged" ON employees;
CREATE POLICY "employees_insert_privileged" ON employees
    FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() IN ('master', 'admin'));

DROP POLICY IF EXISTS "employees_update_privileged" ON employees;
CREATE POLICY "employees_update_privileged" ON employees
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('master', 'admin'));

DROP POLICY IF EXISTS "employees_delete_privileged" ON employees;
CREATE POLICY "employees_delete_privileged" ON employees
    FOR DELETE TO authenticated
    USING (public.get_user_role() IN ('master', 'admin'));

-- ─── 5. RLS Policies: SURVEYS ────────────────────────────────
-- All authenticated users can READ all surveys (needed for dashboard/history)
DROP POLICY IF EXISTS "surveys_select_all" ON surveys;
CREATE POLICY "surveys_select_all" ON surveys
    FOR SELECT TO authenticated
    USING (true);

-- Any authenticated user can CREATE surveys (surveyors create surveys)
DROP POLICY IF EXISTS "surveys_insert_auth" ON surveys;
CREATE POLICY "surveys_insert_auth" ON surveys
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- UPDATE: only the survey creator OR master/admin can update
DROP POLICY IF EXISTS "surveys_update_owner_or_admin" ON surveys;
CREATE POLICY "surveys_update_owner_or_admin" ON surveys
    FOR UPDATE TO authenticated
    USING (
        auth.uid()::text = surveyor_id
        OR public.get_user_role() IN ('master', 'admin')
    );

-- DELETE: only master/admin can delete surveys
DROP POLICY IF EXISTS "surveys_delete_privileged" ON surveys;
CREATE POLICY "surveys_delete_privileged" ON surveys
    FOR DELETE TO authenticated
    USING (public.get_user_role() IN ('master', 'admin'));

-- ─── 6. RLS Policies: TRIPS ─────────────────────────────────
-- All authenticated users can do everything with trips (shared planner)
DROP POLICY IF EXISTS "trips_all_auth" ON trips;
CREATE POLICY "trips_all_auth" ON trips
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- ─── 7. RLS Policies: PROFILES ──────────────────────────────
-- Users can read all profiles (needed for display names)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT TO authenticated
    USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Users can insert their own profile (for auto-creation on first login)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- ─── 8. RLS Policies: SETTINGS ──────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    -- All authenticated users can READ settings
    EXECUTE 'DROP POLICY IF EXISTS "settings_select_all" ON settings';
    EXECUTE 'CREATE POLICY "settings_select_all" ON settings FOR SELECT TO authenticated USING (true)';
    
    -- Only master can write settings
    EXECUTE 'DROP POLICY IF EXISTS "settings_write_master" ON settings';
    EXECUTE 'CREATE POLICY "settings_write_master" ON settings FOR ALL TO authenticated USING (public.get_user_role() = ''master'') WITH CHECK (public.get_user_role() = ''master'')';
  END IF;
END $$;

-- ─── 9. RLS Policies: AUDIT_LOGS ────────────────────────────
-- Any authenticated user can INSERT audit logs
DROP POLICY IF EXISTS "audit_logs_insert_auth" ON audit_logs;
CREATE POLICY "audit_logs_insert_auth" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Only master/admin can READ audit logs
DROP POLICY IF EXISTS "audit_logs_select_privileged" ON audit_logs;
CREATE POLICY "audit_logs_select_privileged" ON audit_logs
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('master', 'admin'));

-- ─── 10. Audit trigger: auto-log survey status changes ───────
CREATE OR REPLACE FUNCTION public.log_survey_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (action, user_id, user_name, details)
    VALUES (
      'SURVEY_STATUS_CHANGE',
      auth.uid(),
      (SELECT full_name FROM profiles WHERE id = auth.uid()),
      jsonb_build_object(
        'survey_id', NEW.id,
        'employee_name', NEW.employee_name,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_survey_status_change ON surveys;
CREATE TRIGGER trg_survey_status_change
  AFTER UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.log_survey_status_change();

-- ============================================================
-- DONE! All RLS policies and audit logging are now active.
-- ============================================================
