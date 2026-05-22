-- ============================================================
-- CribLedger Migration 003 — Indexes, Views & Balance Functions
-- ============================================================

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_matches_player_a        ON matches(player_a_id);
CREATE INDEX idx_matches_player_b        ON matches(player_b_id);
CREATE INDEX idx_matches_status          ON matches(status);
CREATE INDEX idx_matches_created_at      ON matches(created_at DESC);

CREATE INDEX idx_match_wagers_match      ON match_wagers(match_id);
CREATE INDEX idx_match_wagers_status     ON match_wagers(status);

CREATE INDEX idx_ext_wagers_match        ON external_wagers(match_id);
CREATE INDEX idx_ext_wagers_proposer     ON external_wagers(proposer_id);
CREATE INDEX idx_ext_wagers_counterparty ON external_wagers(counterparty_id);
CREATE INDEX idx_ext_wagers_status       ON external_wagers(status);

CREATE INDEX idx_obligations_debtor      ON obligations(debtor_id);
CREATE INDEX idx_obligations_creditor    ON obligations(creditor_id);
CREATE INDEX idx_obligations_status      ON obligations(status);
CREATE INDEX idx_obligations_match       ON obligations(match_id);

CREATE INDEX idx_settlements_debtor      ON settlements(debtor_id);
CREATE INDEX idx_settlements_creditor    ON settlements(creditor_id);
CREATE INDEX idx_settlements_status      ON settlements(status);

CREATE INDEX idx_transactions_from       ON transactions(from_user_id);
CREATE INDEX idx_transactions_to         ON transactions(to_user_id);
CREATE INDEX idx_transactions_type       ON transactions(type);
CREATE INDEX idx_transactions_created    ON transactions(created_at DESC);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_read      ON notifications(read_at) WHERE read_at IS NULL;

-- ── user_balances (materialized view) ─────────────────────────
-- Balances are NEVER stored — always derived from the transactions table.
-- Positive balance = net creditor (more money coming in than going out).
-- Refreshed after every transaction insert (see trigger in migration 004).

CREATE MATERIALIZED VIEW user_balances AS
  SELECT
    u.id           AS user_id,
    u.display_name,
    COALESCE(
      SUM(CASE WHEN t.to_user_id   = u.id THEN  t.amount ELSE 0 END) -
      SUM(CASE WHEN t.from_user_id = u.id THEN  t.amount ELSE 0 END),
      0
    )              AS balance
  FROM users u
  LEFT JOIN transactions t ON t.from_user_id = u.id OR t.to_user_id = u.id
  WHERE u.is_active = true
  GROUP BY u.id, u.display_name;

CREATE UNIQUE INDEX ON user_balances(user_id);

-- ── bilateral_debt_summary (materialized view) ────────────────
-- Net outstanding obligation between every user pair.
-- user_a_id < user_b_id always (canonical ordering).
-- net_amount > 0 means user_b owes user_a.
-- Refreshed after every obligation insert/update.

CREATE MATERIALIZED VIEW bilateral_debt_summary AS
  SELECT
    LEAST(debtor_id, creditor_id)    AS user_a_id,
    GREATEST(debtor_id, creditor_id) AS user_b_id,
    SUM(
      CASE
        WHEN creditor_id = LEAST(debtor_id, creditor_id)
        THEN  (amount - amount_paid)
        ELSE -(amount - amount_paid)
      END
    )                                AS net_amount,
    COUNT(*)                         AS outstanding_obligations
  FROM obligations
  WHERE status IN ('outstanding', 'partially_paid')
  GROUP BY
    LEAST(debtor_id, creditor_id),
    GREATEST(debtor_id, creditor_id);

CREATE UNIQUE INDEX ON bilateral_debt_summary(user_a_id, user_b_id);

-- ── get_user_balance (function) ───────────────────────────────

CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(balance, 0)
  FROM user_balances
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- ── get_bilateral_balance (function) ──────────────────────────
-- Returns net amount p_user_a is owed by p_user_b.
-- Positive = p_user_a is owed money. Negative = p_user_a owes money.

CREATE OR REPLACE FUNCTION get_bilateral_balance(p_user_a UUID, p_user_b UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(
    SUM(
      CASE
        WHEN creditor_id = p_user_a AND debtor_id = p_user_b
          THEN  (amount - amount_paid)
        WHEN debtor_id = p_user_a AND creditor_id = p_user_b
          THEN -(amount - amount_paid)
        ELSE 0
      END
    ),
    0
  )
  FROM obligations
  WHERE
    status IN ('outstanding', 'partially_paid')
    AND (
      (creditor_id = p_user_a AND debtor_id = p_user_b)
      OR
      (debtor_id = p_user_a AND creditor_id = p_user_b)
    );
$$ LANGUAGE sql STABLE;
