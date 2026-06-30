-- ============================================================
-- Dynasty Portal — Row Level Security Policies
-- Run this entire file in Supabase SQL Editor (once)
-- ============================================================

-- ── Helper functions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION has_client_access(p_client_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (
      role = 'ADMIN'
      OR (role = 'CLIENT' AND client_id = p_client_id)
      OR (role IN ('ACCOUNTANT','BOOKKEEPER') AND EXISTS (
            SELECT 1 FROM client_assignments
            WHERE profile_id = auth.uid() AND client_id = p_client_id
          ))
    )
  )
$$;

-- ── Enable RLS on all tables ──────────────────────────────────

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_years          ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_locks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_codes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_account_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_custom_accounts ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_my_role() = 'ADMIN');

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (get_my_role() = 'ADMIN' OR id = auth.uid());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid() OR get_my_role() = 'ADMIN');

-- ── clients ───────────────────────────────────────────────────

CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (has_client_access(id));

CREATE POLICY "clients_insert" ON clients FOR INSERT
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "clients_update" ON clients FOR UPDATE
  USING (get_my_role() = 'ADMIN');

-- ── client_assignments ────────────────────────────────────────

CREATE POLICY "assignments_select" ON client_assignments FOR SELECT
  USING (profile_id = auth.uid() OR get_my_role() = 'ADMIN');

CREATE POLICY "assignments_insert" ON client_assignments FOR INSERT
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "assignments_delete" ON client_assignments FOR DELETE
  USING (get_my_role() = 'ADMIN');

-- ── fiscal_years ──────────────────────────────────────────────

CREATE POLICY "fiscal_years_select" ON fiscal_years FOR SELECT
  USING (has_client_access(client_id));

CREATE POLICY "fiscal_years_insert" ON fiscal_years FOR INSERT
  WITH CHECK (has_client_access(client_id));

CREATE POLICY "fiscal_years_update" ON fiscal_years FOR UPDATE
  USING (has_client_access(client_id) AND get_my_role() IN ('ADMIN','ACCOUNTANT'));

-- ── monthly_entries ───────────────────────────────────────────

CREATE POLICY "monthly_entries_select" ON monthly_entries FOR SELECT
  USING (has_client_access(client_id));

CREATE POLICY "monthly_entries_insert" ON monthly_entries FOR INSERT
  WITH CHECK (has_client_access(client_id));

CREATE POLICY "monthly_entries_update" ON monthly_entries FOR UPDATE
  USING (has_client_access(client_id));

CREATE POLICY "monthly_entries_delete" ON monthly_entries FOR DELETE
  USING (has_client_access(client_id) AND get_my_role() IN ('ADMIN','ACCOUNTANT','BOOKKEEPER'));

-- ── balance_sheet_entries ─────────────────────────────────────

CREATE POLICY "balance_sheet_select" ON balance_sheet_entries FOR SELECT
  USING (has_client_access(client_id));

CREATE POLICY "balance_sheet_insert" ON balance_sheet_entries FOR INSERT
  WITH CHECK (has_client_access(client_id) AND get_my_role() IN ('ADMIN','ACCOUNTANT','BOOKKEEPER'));

CREATE POLICY "balance_sheet_update" ON balance_sheet_entries FOR UPDATE
  USING (has_client_access(client_id) AND get_my_role() IN ('ADMIN','ACCOUNTANT','BOOKKEEPER'));

-- ── period_locks ──────────────────────────────────────────────

CREATE POLICY "period_locks_select" ON period_locks FOR SELECT
  USING (has_client_access(client_id));

CREATE POLICY "period_locks_insert" ON period_locks FOR INSERT
  WITH CHECK (has_client_access(client_id) AND get_my_role() IN ('ADMIN','ACCOUNTANT','BOOKKEEPER'));

CREATE POLICY "period_locks_update" ON period_locks FOR UPDATE
  USING (has_client_access(client_id) AND get_my_role() IN ('ADMIN','ACCOUNTANT','BOOKKEEPER'));

-- ── audit_log ─────────────────────────────────────────────────

CREATE POLICY "audit_log_select" ON audit_log FOR SELECT
  USING (get_my_role() IN ('ADMIN','ACCOUNTANT'));

CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT
  WITH CHECK (profile_id = auth.uid() OR get_my_role() = 'ADMIN');

-- ── tax_codes ─────────────────────────────────────────────────

CREATE POLICY "tax_codes_select" ON tax_codes FOR SELECT
  USING (has_client_access(client_id));

CREATE POLICY "tax_codes_insert" ON tax_codes FOR INSERT
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "tax_codes_update" ON tax_codes FOR UPDATE
  USING (get_my_role() = 'ADMIN');

CREATE POLICY "tax_codes_delete" ON tax_codes FOR DELETE
  USING (get_my_role() = 'ADMIN');

-- ── client_account_configs ────────────────────────────────────

CREATE POLICY "account_configs_select" ON client_account_configs FOR SELECT
  USING (has_client_access(client_id));

CREATE POLICY "account_configs_insert" ON client_account_configs FOR INSERT
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "account_configs_update" ON client_account_configs FOR UPDATE
  USING (get_my_role() = 'ADMIN');

CREATE POLICY "account_configs_delete" ON client_account_configs FOR DELETE
  USING (get_my_role() = 'ADMIN');

-- ── client_custom_accounts ────────────────────────────────────

CREATE POLICY "custom_accounts_select" ON client_custom_accounts FOR SELECT
  USING (has_client_access(client_id));

CREATE POLICY "custom_accounts_insert" ON client_custom_accounts FOR INSERT
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "custom_accounts_update" ON client_custom_accounts FOR UPDATE
  USING (get_my_role() = 'ADMIN');

CREATE POLICY "custom_accounts_delete" ON client_custom_accounts FOR DELETE
  USING (get_my_role() = 'ADMIN');
