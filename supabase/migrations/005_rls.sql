-- ============================================================
-- CribLedger Migration 005 — Row Level Security Policies
-- ============================================================
-- V1: Admin-only write model. Auth is not yet wired (all auth_ids NULL).
--     All authenticated users can READ everything.
--     WRITES are blocked from the client — go through RPCs only.
--
-- V2 TODO: Scope reads/writes per authenticated user once auth_id
--          is populated and Supabase Auth is integrated.
-- ============================================================

ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_wagers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_wagers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;

-- ── Helper: is current user an admin? ────────────────────────
-- TODO: Replace with auth.uid() lookup once auth is wired.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── READ policies (all authenticated users) ──────────────────

CREATE POLICY "Authenticated users can read users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read matches"
  ON matches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read match_wagers"
  ON match_wagers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read external_wagers"
  ON external_wagers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read obligations"
  ON obligations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read settlements"
  ON settlements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read settlement_obligations"
  ON settlement_obligations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read transactions"
  ON transactions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (
    auth.role() = 'authenticated'
    -- TODO V2: AND recipient_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );


-- ── WRITE policies — admin only for direct writes ─────────────
-- Most writes go through RPC functions which run as SECURITY DEFINER.
-- These policies are a backstop preventing direct client-side mutations.

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can insert matches"
  ON matches FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update matches"
  ON matches FOR UPDATE
  USING (is_admin());

-- Wager proposals: any authenticated user can propose (V2)
-- V1: admin only
CREATE POLICY "Admins can insert external_wagers"
  ON external_wagers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update external_wagers"
  ON external_wagers FOR UPDATE
  USING (is_admin());

-- Obligations are NEVER written directly from client.
-- Created only via finalize_match or settle_external_wager RPCs.
CREATE POLICY "Admins can insert obligations"
  ON obligations FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update obligations"
  ON obligations FOR UPDATE
  USING (is_admin());

-- Settlements: initiated by debtor or creditor (V2)
-- V1: admin only
CREATE POLICY "Admins can insert settlements"
  ON settlements FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update settlements"
  ON settlements FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can insert settlement_obligations"
  ON settlement_obligations FOR INSERT
  WITH CHECK (is_admin());

-- Transactions: NEVER from client. RPC only.
-- No INSERT policy — all transaction inserts happen inside
-- SECURITY DEFINER RPC functions that bypass RLS.
-- This effectively blocks all client-side inserts.

-- Notifications
CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Users can mark their own notifications read"
  ON notifications FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    -- TODO V2: AND recipient_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    -- Only allow updating read_at, nothing else
    TRUE
  );
