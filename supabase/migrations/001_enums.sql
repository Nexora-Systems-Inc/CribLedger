-- ============================================================
-- CribLedger Migration 001 — Extensions & Enums
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'admin',
  'player',
  'spectator'
);

CREATE TYPE match_status AS ENUM (
  'pending',
  'active',
  'completed',
  'cancelled',
  'disputed'
);

CREATE TYPE wager_status AS ENUM (
  'proposed',    -- awaiting counterparty response
  'accepted',    -- counterparty agreed, not yet active
  'declined',    -- counterparty rejected
  'cancelled',   -- proposer withdrew before acceptance
  'active',      -- match is live, wager locked
  'settled',     -- outcome determined, obligation created
  'voided'       -- match was cancelled, wager nullified
);

-- Renamed from external_wager_payout → side_wager per architecture decision
CREATE TYPE transaction_type AS ENUM (
  'match_payout',  -- from a completed match wager
  'side_wager',    -- from a settled external/peer-to-peer wager
  'settlement',    -- manual debt payment between two users
  'adjustment'     -- admin correction (always auditable with notes)
);

CREATE TYPE obligation_source AS ENUM (
  'match_wager',
  'side_wager'
);

CREATE TYPE obligation_status AS ENUM (
  'outstanding',
  'partially_paid',
  'paid',
  'disputed',
  'written_off'
);

CREATE TYPE settlement_status AS ENUM (
  'pending',
  'confirmed',
  'paid',
  'disputed',
  'written_off'
);

CREATE TYPE notification_type AS ENUM (
  'wager_proposed',
  'wager_accepted',
  'wager_declined',
  'wager_cancelled',
  'match_started',
  'match_completed',
  'settlement_requested',
  'settlement_confirmed'
);
