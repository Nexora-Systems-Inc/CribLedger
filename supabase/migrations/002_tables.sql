-- ============================================================
-- CribLedger Migration 002 — Core Tables
-- ============================================================

-- ── Users ─────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       UUID          UNIQUE,                   -- NULL until Supabase Auth is wired (V2)
  display_name  TEXT          NOT NULL,
  role          user_role     NOT NULL DEFAULT 'player',
  avatar_color  TEXT          NOT NULL DEFAULT '#f5b832',
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── Matches ───────────────────────────────────────────────────

CREATE TABLE matches (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a_id     UUID          NOT NULL REFERENCES users(id),
  player_b_id     UUID          NOT NULL REFERENCES users(id),
  point_wager     NUMERIC(8,2)  NOT NULL CHECK (point_wager > 0),
  winner_bonus    NUMERIC(8,2)  NOT NULL DEFAULT 0 CHECK (winner_bonus >= 0),
  status          match_status  NOT NULL DEFAULT 'pending',
  winner_id       UUID          REFERENCES users(id),
  player_a_score  INTEGER       CHECK (player_a_score >= 0),
  player_b_score  INTEGER       CHECK (player_b_score >= 0),
  notes           TEXT,
  created_by      UUID          NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,

  -- Players must be different
  CONSTRAINT different_players
    CHECK (player_a_id <> player_b_id),

  -- Scores only present when active or completed
  CONSTRAINT valid_scores
    CHECK (
      (status IN ('pending') AND player_a_score IS NULL AND player_b_score IS NULL)
      OR (status IN ('active', 'completed', 'disputed'))
      OR (status IN ('cancelled'))
    ),

  -- Winner must be a participant
  CONSTRAINT winner_is_participant
    CHECK (
      winner_id IS NULL
      OR winner_id = player_a_id
      OR winner_id = player_b_id
    )
);

-- ── Match Wagers ──────────────────────────────────────────────
-- One per match, created automatically when match is created.
-- debtor/creditor/calculated_amount populated when match completes.

CREATE TABLE match_wagers (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID          NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  debtor_id         UUID          REFERENCES users(id),    -- NULL until match completed
  creditor_id       UUID          REFERENCES users(id),    -- NULL until match completed
  calculated_amount NUMERIC(8,2)  CHECK (calculated_amount > 0),
  status            wager_status  NOT NULL DEFAULT 'active',
  settled_at        TIMESTAMPTZ,

  CONSTRAINT debtor_creditor_differ
    CHECK (debtor_id IS NULL OR creditor_id IS NULL OR debtor_id <> creditor_id)
);

-- ── External (Side) Wagers ────────────────────────────────────
-- Peer-to-peer bets proposed before or during a match.
--
-- IMPORTANT: proposer_picks_player_id must be player_a_id or player_b_id
-- on the associated match. This CANNOT be a CHECK constraint in PostgreSQL
-- because CHECK constraints do not support subqueries.
-- Validation is enforced by:
--   1. Service layer  — validateWagerPick() in src/lib/wagerUtils.ts
--   2. DB trigger     — trg_validate_wager_pick (migration 004)

CREATE TABLE external_wagers (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id                  UUID          NOT NULL REFERENCES matches(id),
  proposer_id               UUID          NOT NULL REFERENCES users(id),
  proposer_picks_player_id  UUID          NOT NULL REFERENCES users(id),
  counterparty_id           UUID          NOT NULL REFERENCES users(id),
  proposer_amount           NUMERIC(8,2)  NOT NULL CHECK (proposer_amount > 0),
  counterparty_amount       NUMERIC(8,2)  NOT NULL CHECK (counterparty_amount > 0),
  status                    wager_status  NOT NULL DEFAULT 'proposed',
  proposed_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  responded_at              TIMESTAMPTZ,
  activated_at              TIMESTAMPTZ,
  settled_at                TIMESTAMPTZ,
  winner_id                 UUID          REFERENCES users(id),  -- the USER who won the bet
  loser_id                  UUID          REFERENCES users(id),
  notes                     TEXT,
  created_by                UUID          NOT NULL REFERENCES users(id),

  CONSTRAINT proposer_counterparty_differ
    CHECK (proposer_id <> counterparty_id)

  -- NOTE: No CHECK constraint for proposer_picks_player_id membership in match —
  -- subqueries are not permitted in CHECK constraints in PostgreSQL.
  -- See trg_validate_wager_pick in migration 004.
);

-- ── Obligations ───────────────────────────────────────────────
-- Debt records. Created AUTOMATICALLY when a match or wager settles.
-- These are NOT payments — they record who owes whom and how much.
--
-- KEY DESIGN:
--   One obligation per wager/match result (granular for audit trail).
--   The bilateral_debt_summary VIEW provides rollup totals for UI.
--   Settlements reference obligations via settlement_obligations join table.

CREATE TABLE obligations (
  id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  debtor_id           UUID                NOT NULL REFERENCES users(id),
  creditor_id         UUID                NOT NULL REFERENCES users(id),
  amount              NUMERIC(8,2)        NOT NULL CHECK (amount > 0),
  amount_paid         NUMERIC(8,2)        NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  source              obligation_source   NOT NULL,
  match_id            UUID                REFERENCES matches(id),
  match_wager_id      UUID                REFERENCES match_wagers(id),
  external_wager_id   UUID                REFERENCES external_wagers(id),
  status              obligation_status   NOT NULL DEFAULT 'outstanding',
  notes               TEXT,
  created_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),

  CONSTRAINT debtor_creditor_differ
    CHECK (debtor_id <> creditor_id),

  CONSTRAINT amount_paid_lte_amount
    CHECK (amount_paid <= amount),

  -- Each obligation ties to exactly one source
  CONSTRAINT single_source
    CHECK (
      (match_wager_id IS NOT NULL AND external_wager_id IS NULL)
      OR
      (match_wager_id IS NULL AND external_wager_id IS NOT NULL)
    )
);

-- ── Settlements ───────────────────────────────────────────────
-- Payment confirmation events. Each settlement records that money
-- actually changed hands between a debtor and creditor.
--
-- CRITICAL DISTINCTION:
--   A settlement REDUCES obligations — it does NOT replace them.
--   "Wager settled" (wager_status='settled') means outcome determined,
--   obligation created. It does NOT mean the debt has been paid.
--   Only a confirmed Settlement means money changed hands.

CREATE TABLE settlements (
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  debtor_id     UUID                NOT NULL REFERENCES users(id),
  creditor_id   UUID                NOT NULL REFERENCES users(id),
  amount        NUMERIC(8,2)        NOT NULL CHECK (amount > 0),
  status        settlement_status   NOT NULL DEFAULT 'pending',
  notes         TEXT,
  requested_at  TIMESTAMPTZ         NOT NULL DEFAULT now(),
  confirmed_at  TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  created_by    UUID                NOT NULL REFERENCES users(id),

  CONSTRAINT settlement_debtor_creditor_differ
    CHECK (debtor_id <> creditor_id)
);

-- ── Settlement → Obligation join table ───────────────────────
-- Links a payment to the specific obligations it (partially) covers.
-- amount_applied tracks how much of this payment reduces each obligation.

CREATE TABLE settlement_obligations (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   UUID          NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  obligation_id   UUID          NOT NULL REFERENCES obligations(id),
  amount_applied  NUMERIC(8,2)  NOT NULL CHECK (amount_applied > 0),

  UNIQUE (settlement_id, obligation_id)
);

-- ── Transactions ──────────────────────────────────────────────
-- Append-only immutable ledger. NEVER inserted from the client.
-- All inserts happen inside RPC functions (finalize_match, confirm_settlement).
-- Balances are derived from this table — never stored separately.

CREATE TABLE transactions (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID              NOT NULL REFERENCES users(id),
  to_user_id      UUID              NOT NULL REFERENCES users(id),
  amount          NUMERIC(8,2)      NOT NULL CHECK (amount > 0),
  type            transaction_type  NOT NULL,
  match_id        UUID              REFERENCES matches(id),
  wager_id        UUID              REFERENCES external_wagers(id),
  settlement_id   UUID              REFERENCES settlements(id),
  obligation_id   UUID              REFERENCES obligations(id),
  created_by      UUID              NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
  notes           TEXT,

  CONSTRAINT transaction_parties_differ
    CHECK (from_user_id <> to_user_id)
);

-- ── Notifications ─────────────────────────────────────────────

CREATE TABLE notifications (
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID                NOT NULL REFERENCES users(id),
  type          notification_type   NOT NULL,
  title         TEXT                NOT NULL,
  body          TEXT,
  entity_type   TEXT                CHECK (entity_type IN ('match','external_wager','settlement','obligation')),
  entity_id     UUID,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT now()
);
