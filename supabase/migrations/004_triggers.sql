-- ============================================================
-- CribLedger Migration 004 — Triggers
-- ============================================================

-- ── 1. Validate wager pick (second-line guard) ────────────────
-- Service layer (validateWagerPick in wagerUtils.ts) is the primary guard.
-- This trigger is the second line of defense at the DB level.
-- PostgreSQL does not allow subqueries in CHECK constraints, so this
-- trigger enforces that proposer_picks_player_id is a participant
-- in the associated match.

CREATE OR REPLACE FUNCTION fn_validate_wager_pick()
RETURNS TRIGGER AS $$
DECLARE
  v_player_a UUID;
  v_player_b UUID;
BEGIN
  SELECT player_a_id, player_b_id
  INTO   v_player_a, v_player_b
  FROM   matches
  WHERE  id = NEW.match_id;

  IF v_player_a IS NULL THEN
    RAISE EXCEPTION 'Match % not found', NEW.match_id;
  END IF;

  IF NEW.proposer_picks_player_id <> v_player_a
     AND NEW.proposer_picks_player_id <> v_player_b
  THEN
    RAISE EXCEPTION
      'proposer_picks_player_id (%) must be player_a (%) or player_b (%) of match %',
      NEW.proposer_picks_player_id, v_player_a, v_player_b, NEW.match_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_wager_pick
  BEFORE INSERT OR UPDATE OF proposer_picks_player_id, match_id
  ON external_wagers
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_wager_pick();


-- ── 2. Auto-refresh user_balances after transaction insert ─────

CREATE OR REPLACE FUNCTION fn_refresh_user_balances()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_balances;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_user_balances
  AFTER INSERT ON transactions
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_refresh_user_balances();


-- ── 3. Auto-refresh bilateral_debt_summary after obligation change ─

CREATE OR REPLACE FUNCTION fn_refresh_bilateral_debt()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY bilateral_debt_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_bilateral_debt
  AFTER INSERT OR UPDATE OF amount_paid, status ON obligations
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_refresh_bilateral_debt();


-- ── 4. Auto-set obligation status from amount_paid ────────────
-- When amount_paid is updated, automatically derive obligation status.

CREATE OR REPLACE FUNCTION fn_update_obligation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount_paid >= NEW.amount THEN
    NEW.status := 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status := 'partially_paid';
  ELSE
    -- Only reset to outstanding if not in a terminal state
    IF OLD.status NOT IN ('disputed', 'written_off') THEN
      NEW.status := 'outstanding';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_obligation_status
  BEFORE UPDATE OF amount_paid ON obligations
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_obligation_status();


-- ── 5. updated_at auto-timestamp for users ────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
