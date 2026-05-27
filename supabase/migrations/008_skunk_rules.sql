-- ============================================================
-- CribLedger Migration 008 — Skunk Rules (per-match)
-- ============================================================
-- Adds three configurable skunk fields to the matches table.
-- Skunk behavior is NOT global — it is opted into per match.
-- ============================================================

ALTER TABLE matches
  ADD COLUMN skunk_enabled    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN skunk_threshold  INTEGER      NOT NULL DEFAULT 90
    CHECK (skunk_threshold >= 0 AND skunk_threshold < 121),
  ADD COLUMN skunk_multiplier NUMERIC(4,2) NOT NULL DEFAULT 2
    CHECK (skunk_multiplier >= 1);

COMMENT ON COLUMN matches.skunk_enabled    IS 'When true, skunk rules apply to this match.';
COMMENT ON COLUMN matches.skunk_threshold  IS 'Loser score at or below this value triggers the skunk multiplier.';
COMMENT ON COLUMN matches.skunk_multiplier IS 'Multiplier applied to the total payout when skunk conditions are met.';
