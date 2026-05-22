// ============================================================
// CribLedger — Match Service (LIVE — Supabase)
// ============================================================

import { supabase, TABLES, RPC } from '@/config/supabase';
import type { Match, MatchWager } from '@/types';

// ── READ ─────────────────────────────────────────────────────

export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from(TABLES.MATCHES)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Match[];
}

export async function fetchMatchById(id: string): Promise<Match> {
  const { data, error } = await supabase
    .from(TABLES.MATCHES)
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as Match;
}

export async function fetchMatchWagerForMatch(matchId: string): Promise<MatchWager | null> {
  const { data, error } = await supabase
    .from(TABLES.MATCH_WAGERS)
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as MatchWager | null;
}

// ── CREATE ────────────────────────────────────────────────────

export interface CreateMatchInput {
  player_a_id:  string;
  player_b_id:  string;
  point_wager:  number;
  winner_bonus: number;
  notes?:       string;
}

export async function createMatch(input: CreateMatchInput, createdBy: string): Promise<Match> {
  // Insert match row
  const { data, error } = await supabase
    .from(TABLES.MATCHES)
    .insert({
      player_a_id:  input.player_a_id,
      player_b_id:  input.player_b_id,
      point_wager:  input.point_wager,
      winner_bonus: input.winner_bonus,
      notes:        input.notes ?? null,
      status:       'pending',
      created_by:   createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Create the companion match_wager row immediately
  const { error: mwError } = await supabase
    .from(TABLES.MATCH_WAGERS)
    .insert({ match_id: data.id, status: 'active' });
  if (mwError) throw new Error(mwError.message);

  return data as Match;
}

export async function startMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.MATCHES)
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', matchId);
  if (error) throw new Error(error.message);

  // Activate accepted side wagers for this match
  const { error: wErr } = await supabase
    .from(TABLES.EXTERNAL_WAGERS)
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .eq('status', 'accepted');
  if (wErr) throw new Error(wErr.message);
}

// ── FINALIZE ──────────────────────────────────────────────────
/**
 * Finalize a match atomically via the finalize_match RPC.
 *
 * The RPC (migration 006) handles in a single transaction:
 *   1. Updates match row (scores, winner, status=completed)
 *   2. Updates match_wager (debtor, creditor, amount, status=settled)
 *   3. Inserts obligation (debt record — NOT payment)
 *   4. Settles all active side wagers → inserts obligations per wager
 *   5. Inserts transaction records for the ledger
 *   6. Queues notifications
 *   7. Refreshes materialized views via triggers
 */
export async function finalizeMatch(
  matchId:     string,
  playerAScore: number,
  playerBScore: number,
): Promise<void> {
  const { error } = await supabase.rpc(RPC.FINALIZE_MATCH, {
    p_match_id: matchId,
    p_score_a:  playerAScore,
    p_score_b:  playerBScore,
  });
  if (error) throw new Error(error.message);
}

/** Non-atomic live-score update — for in-game display only, not ledger. */
export async function updateLiveScores(
  matchId:     string,
  playerAScore: number,
  playerBScore: number,
): Promise<void> {
  const { error } = await supabase
    .from(TABLES.MATCHES)
    .update({ player_a_score: playerAScore, player_b_score: playerBScore })
    .eq('id', matchId);
  if (error) throw new Error(error.message);
}
