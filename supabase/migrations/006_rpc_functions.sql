-- ============================================================
-- CribLedger Migration 006 — RPC Functions (Atomic Write Layer)
-- ============================================================
-- These functions are the ONLY way to write to core ledger tables.
-- They run as SECURITY DEFINER to bypass RLS for internal writes.
-- All operations inside are atomic (single transaction).
-- ============================================================


-- ── finalize_match ────────────────────────────────────────────
-- Called when admin enters final scores and confirms the result.
--
-- Steps (all in one transaction):
--   1. Validate: match must be active, scores provided, winner determinable
--   2. Update match: scores, winner_id, status=completed, completed_at
--   3. Update match_wager: debtor, creditor, calculated_amount, status=settled
--   4. Insert OBLIGATION for the match wager (debt record — NOT payment)
--   5. For each active external_wager on this match:
--      a. Determine winner/loser via proposer_picks_player_id
--      b. Update external_wager: winner_id, loser_id, status=settled, settled_at
--      c. Insert OBLIGATION for this side wager
--   6. Insert TRANSACTION for each obligation (ledger entry)
--   7. Queue notifications for affected users
--   8. Refresh materialized views (handled by triggers)

CREATE OR REPLACE FUNCTION finalize_match(
  p_match_id  UUID,
  p_score_a   INTEGER,
  p_score_b   INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match           matches%ROWTYPE;
  v_match_wager     match_wagers%ROWTYPE;
  v_winner_id       UUID;
  v_loser_id        UUID;
  v_payout          NUMERIC(8,2);
  v_wager           external_wagers%ROWTYPE;
  v_wager_winner_id UUID;
  v_wager_loser_id  UUID;
  v_wager_payout    NUMERIC(8,2);
  v_obligation_id   UUID;
BEGIN
  -- 1. Load and validate match
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match % not found', p_match_id;
  END IF;
  IF v_match.status <> 'active' THEN
    RAISE EXCEPTION 'Match % is not active (status: %)', p_match_id, v_match.status;
  END IF;
  IF p_score_a = p_score_b THEN
    RAISE EXCEPTION 'Cribbage cannot end in a tie';
  END IF;

  -- Determine winner/loser
  IF p_score_a > p_score_b THEN
    v_winner_id := v_match.player_a_id;
    v_loser_id  := v_match.player_b_id;
  ELSE
    v_winner_id := v_match.player_b_id;
    v_loser_id  := v_match.player_a_id;
  END IF;

  -- Calculate match payout: |scoreA - scoreB| * point_wager + winner_bonus
  v_payout := (ABS(p_score_a - p_score_b) * v_match.point_wager) + v_match.winner_bonus;

  -- 2. Update match
  UPDATE matches SET
    player_a_score = p_score_a,
    player_b_score = p_score_b,
    winner_id      = v_winner_id,
    status         = 'completed',
    completed_at   = now()
  WHERE id = p_match_id;

  -- 3. Update match_wager
  UPDATE match_wagers SET
    debtor_id         = v_loser_id,
    creditor_id       = v_winner_id,
    calculated_amount = v_payout,
    status            = 'settled',
    settled_at        = now()
  WHERE match_id = p_match_id
  RETURNING * INTO v_match_wager;

  -- 4. Insert obligation for the match wager (DEBT RECORD — not payment)
  INSERT INTO obligations (
    debtor_id, creditor_id, amount, source,
    match_id, match_wager_id, notes
  ) VALUES (
    v_loser_id, v_winner_id, v_payout, 'match_wager',
    p_match_id, v_match_wager.id,
    'Match payout — obligation created on finalize'
  )
  RETURNING id INTO v_obligation_id;

  -- 5. Insert ledger transaction for match payout
  INSERT INTO transactions (
    from_user_id, to_user_id, amount, type,
    match_id, obligation_id, created_by, notes
  ) VALUES (
    v_loser_id, v_winner_id, v_payout, 'match_payout',
    p_match_id, v_obligation_id, v_match.created_by,
    'Match payout transaction'
  );

  -- 6. Settle all active external wagers on this match
  FOR v_wager IN
    SELECT * FROM external_wagers
    WHERE match_id = p_match_id AND status = 'active'
    FOR UPDATE
  LOOP
    -- Determine wager outcome from proposer's pick
    IF v_wager.proposer_picks_player_id = v_winner_id THEN
      -- Proposer backed the winner → counterparty pays proposer
      v_wager_winner_id := v_wager.proposer_id;
      v_wager_loser_id  := v_wager.counterparty_id;
      v_wager_payout    := v_wager.counterparty_amount;
    ELSE
      -- Proposer backed the loser → proposer pays counterparty
      v_wager_winner_id := v_wager.counterparty_id;
      v_wager_loser_id  := v_wager.proposer_id;
      v_wager_payout    := v_wager.proposer_amount;
    END IF;

    -- Update external wager
    UPDATE external_wagers SET
      status     = 'settled',
      winner_id  = v_wager_winner_id,
      loser_id   = v_wager_loser_id,
      settled_at = now()
    WHERE id = v_wager.id;

    -- Insert obligation for this side wager (granular, per-wager record)
    INSERT INTO obligations (
      debtor_id, creditor_id, amount, source,
      match_id, external_wager_id, notes
    ) VALUES (
      v_wager_loser_id, v_wager_winner_id, v_wager_payout, 'side_wager',
      p_match_id, v_wager.id,
      'Side wager obligation — created on match finalize'
    )
    RETURNING id INTO v_obligation_id;

    -- Insert transaction for side wager
    INSERT INTO transactions (
      from_user_id, to_user_id, amount, type,
      match_id, wager_id, obligation_id, created_by, notes
    ) VALUES (
      v_wager_loser_id, v_wager_winner_id, v_wager_payout, 'side_wager',
      p_match_id, v_wager.id, v_obligation_id, v_match.created_by,
      'Side wager payout transaction'
    );
  END LOOP;

  -- 7. Void any proposed/accepted wagers that didn't activate
  UPDATE external_wagers
  SET status = 'voided'
  WHERE match_id = p_match_id
  AND   status IN ('proposed', 'accepted');

  -- 8. Queue notifications (match completed)
  INSERT INTO notifications (recipient_id, type, title, body, entity_type, entity_id)
  VALUES
    (v_match.player_a_id, 'match_completed', 'Match completed',
     'Final scores have been recorded and obligations created.', 'match', p_match_id),
    (v_match.player_b_id, 'match_completed', 'Match completed',
     'Final scores have been recorded and obligations created.', 'match', p_match_id);

  -- Materialized view refresh handled by triggers on transactions/obligations tables

END;
$$;


-- ── confirm_settlement ────────────────────────────────────────
-- Called when a payment is confirmed as received.
--
-- Steps (all in one transaction):
--   1. Validate: settlement must exist and be pending or confirmed
--   2. Update settlement status → 'confirmed', set confirmed_at
--   3. For each linked obligation (via settlement_obligations):
--      a. Increment obligation.amount_paid by amount_applied
--      b. Trigger fn_update_obligation_status updates status automatically
--   4. Insert TRANSACTION record (immutable ledger entry)
--   5. Queue notification for debtor

CREATE OR REPLACE FUNCTION confirm_settlement(p_settlement_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settlement  settlements%ROWTYPE;
  v_so          settlement_obligations%ROWTYPE;
BEGIN
  -- 1. Load and validate settlement
  SELECT * INTO v_settlement FROM settlements WHERE id = p_settlement_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement % not found', p_settlement_id;
  END IF;
  IF v_settlement.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Settlement % cannot be confirmed (status: %)',
      p_settlement_id, v_settlement.status;
  END IF;

  -- 2. Update settlement
  UPDATE settlements SET
    status       = 'confirmed',
    confirmed_at = now()
  WHERE id = p_settlement_id;

  -- 3. Apply payment to each linked obligation
  FOR v_so IN
    SELECT * FROM settlement_obligations WHERE settlement_id = p_settlement_id
  LOOP
    UPDATE obligations SET
      amount_paid = amount_paid + v_so.amount_applied
      -- status updated automatically by trg_update_obligation_status
    WHERE id = v_so.obligation_id;
  END LOOP;

  -- 4. Insert transaction (immutable ledger entry)
  INSERT INTO transactions (
    from_user_id, to_user_id, amount, type,
    settlement_id, created_by, notes
  ) VALUES (
    v_settlement.debtor_id,
    v_settlement.creditor_id,
    v_settlement.amount,
    'settlement',
    p_settlement_id,
    v_settlement.created_by,
    COALESCE(v_settlement.notes, 'Settlement confirmed')
  );

  -- 5. Queue notification for debtor
  INSERT INTO notifications (recipient_id, type, title, body, entity_type, entity_id)
  VALUES (
    v_settlement.debtor_id,
    'settlement_confirmed',
    'Payment confirmed',
    'Your payment has been confirmed by the creditor.',
    'settlement',
    p_settlement_id
  );

END;
$$;


-- ── settle_external_wager ─────────────────────────────────────
-- Manual override to settle a single side wager outside of finalize_match.
-- Use case: a standalone side wager needs to be settled independently.

CREATE OR REPLACE FUNCTION settle_external_wager(
  p_wager_id      UUID,
  p_match_winner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wager           external_wagers%ROWTYPE;
  v_wager_winner_id UUID;
  v_wager_loser_id  UUID;
  v_wager_payout    NUMERIC(8,2);
  v_obligation_id   UUID;
BEGIN
  SELECT * INTO v_wager FROM external_wagers WHERE id = p_wager_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'External wager % not found', p_wager_id;
  END IF;
  IF v_wager.status <> 'active' THEN
    RAISE EXCEPTION 'External wager % is not active (status: %)', p_wager_id, v_wager.status;
  END IF;

  IF v_wager.proposer_picks_player_id = p_match_winner_id THEN
    v_wager_winner_id := v_wager.proposer_id;
    v_wager_loser_id  := v_wager.counterparty_id;
    v_wager_payout    := v_wager.counterparty_amount;
  ELSE
    v_wager_winner_id := v_wager.counterparty_id;
    v_wager_loser_id  := v_wager.proposer_id;
    v_wager_payout    := v_wager.proposer_amount;
  END IF;

  UPDATE external_wagers SET
    status     = 'settled',
    winner_id  = v_wager_winner_id,
    loser_id   = v_wager_loser_id,
    settled_at = now()
  WHERE id = p_wager_id;

  INSERT INTO obligations (
    debtor_id, creditor_id, amount, source,
    match_id, external_wager_id, notes
  ) VALUES (
    v_wager_loser_id, v_wager_winner_id, v_wager_payout, 'side_wager',
    v_wager.match_id, p_wager_id,
    'Side wager obligation — manual settle'
  )
  RETURNING id INTO v_obligation_id;

  INSERT INTO transactions (
    from_user_id, to_user_id, amount, type,
    match_id, wager_id, obligation_id, created_by, notes
  ) VALUES (
    v_wager_loser_id, v_wager_winner_id, v_wager_payout, 'side_wager',
    v_wager.match_id, p_wager_id, v_obligation_id, v_wager.created_by,
    'Side wager manual settle'
  );

END;
$$;
