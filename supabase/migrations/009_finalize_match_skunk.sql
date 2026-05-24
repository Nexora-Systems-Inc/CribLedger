-- ============================================================
-- CribLedger Migration 009 — Update finalize_match RPC for Skunk
-- ============================================================
-- Replaces the finalize_match function (migration 006) with a
-- version that reads skunk_enabled / skunk_threshold /
-- skunk_multiplier from the match row and applies the multiplier
-- to the payout when skunk conditions are met.
-- ============================================================

CREATE OR REPLACE FUNCTION finalize_match(
  p_match_id UUID,
  p_score_a  INTEGER,
  p_score_b  INTEGER
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
  v_loser_score     INTEGER;
  v_base_payout     NUMERIC(8,2);
  v_multiplier      NUMERIC(4,2);
  v_payout          NUMERIC(8,2);
  v_skunked         BOOLEAN;
  v_wager           external_wagers%ROWTYPE;
  v_wager_winner_id UUID;
  v_wager_loser_id  UUID;
  v_wager_payout    NUMERIC(8,2);
  v_obligation_id   UUID;
  v_notes_suffix    TEXT;
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

  -- 2. Determine winner / loser
  IF p_score_a > p_score_b THEN
    v_winner_id   := v_match.player_a_id;
    v_loser_id    := v_match.player_b_id;
    v_loser_score := p_score_b;
  ELSE
    v_winner_id   := v_match.player_b_id;
    v_loser_id    := v_match.player_a_id;
    v_loser_score := p_score_a;
  END IF;

  -- 3. Base payout: |scoreA - scoreB| * point_wager + winner_bonus
  v_base_payout := (ABS(p_score_a - p_score_b) * v_match.point_wager) + v_match.winner_bonus;

  -- 4. Apply skunk multiplier if conditions are met
  v_skunked    := v_match.skunk_enabled AND (v_loser_score <= v_match.skunk_threshold);
  v_multiplier := CASE WHEN v_skunked THEN v_match.skunk_multiplier ELSE 1 END;
  v_payout     := ROUND(v_base_payout * v_multiplier, 2);

  -- Build notes suffix for audit trail
  v_notes_suffix := CASE
    WHEN v_skunked THEN format(' [SKUNKED ×%s, loser score %s ≤ %s]',
      v_multiplier, v_loser_score, v_match.skunk_threshold)
    ELSE ''
  END;

  -- 5. Update match
  UPDATE matches SET
    player_a_score = p_score_a,
    player_b_score = p_score_b,
    winner_id      = v_winner_id,
    status         = 'completed',
    completed_at   = now()
  WHERE id = p_match_id;

  -- 6. Update match_wager
  UPDATE match_wagers SET
    debtor_id         = v_loser_id,
    creditor_id       = v_winner_id,
    calculated_amount = v_payout,
    status            = 'settled',
    settled_at        = now()
  WHERE match_id = p_match_id
  RETURNING * INTO v_match_wager;

  -- 7. Insert obligation (debt record — not payment)
  INSERT INTO obligations (
    debtor_id, creditor_id, amount, source,
    match_id, match_wager_id, notes
  ) VALUES (
    v_loser_id, v_winner_id, v_payout, 'match_wager',
    p_match_id, v_match_wager.id,
    'Match payout — obligation created on finalize' || v_notes_suffix
  )
  RETURNING id INTO v_obligation_id;

  -- 8. Insert ledger transaction
  INSERT INTO transactions (
    from_user_id, to_user_id, amount, type,
    match_id, obligation_id, created_by, notes
  ) VALUES (
    v_loser_id, v_winner_id, v_payout, 'match_payout',
    p_match_id, v_obligation_id, v_match.created_by,
    'Match payout transaction' || v_notes_suffix
  );

  -- 9. Settle all active external wagers on this match
  FOR v_wager IN
    SELECT * FROM external_wagers
    WHERE match_id = p_match_id AND status = 'active'
    FOR UPDATE
  LOOP
    IF v_wager.proposer_picks_player_id = v_winner_id THEN
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
    WHERE id = v_wager.id;

    INSERT INTO obligations (
      debtor_id, creditor_id, amount, source,
      match_id, external_wager_id, notes
    ) VALUES (
      v_wager_loser_id, v_wager_winner_id, v_wager_payout, 'side_wager',
      p_match_id, v_wager.id,
      'Side wager obligation — created on match finalize'
    )
    RETURNING id INTO v_obligation_id;

    INSERT INTO transactions (
      from_user_id, to_user_id, amount, type,
      match_id, wager_id, obligation_id, created_by, notes
    ) VALUES (
      v_wager_loser_id, v_wager_winner_id, v_wager_payout, 'side_wager',
      p_match_id, v_wager.id, v_obligation_id, v_match.created_by,
      'Side wager payout transaction'
    );
  END LOOP;

  -- 10. Void any proposed/accepted wagers that didn't activate
  UPDATE external_wagers
  SET status = 'voided'
  WHERE match_id = p_match_id
  AND   status IN ('proposed', 'accepted');

  -- 11. Queue notifications
  INSERT INTO notifications (recipient_id, type, title, body, entity_type, entity_id)
  VALUES
    (v_match.player_a_id, 'match_completed', 'Match completed',
     'Final scores recorded. Check Settlements to pay up.', 'match', p_match_id),
    (v_match.player_b_id, 'match_completed', 'Match completed',
     'Final scores recorded. Check Settlements to pay up.', 'match', p_match_id);

END;
$$;
