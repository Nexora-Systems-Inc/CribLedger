// ============================================================
// CribLedger — Match Service
// All Supabase interactions for matches.
// Components never call Supabase directly — always through services.
// ============================================================

import { supabase, TABLES, RPC } from '@/config/supabase';
import type { Match, MatchWager } from '@/types';

// ── READ ─────────────────────────────────────────────────────

export async function fetchMatches(): Promise<Match[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.MATCHES)
  //   .select('*')
  //   .order('created_at', { ascending: false });
  // if (error) throw error;
  // return data;
  const { MOCK_MATCHES } = await import('@/lib/mockData');
  return [...MOCK_MATCHES];
}

export async function fetchMatchById(id: string): Promise<Match> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.MATCHES)
  //   .select('*')
  //   .eq('id', id)
  //   .single();
  // if (error) throw error;
  // return data;
  const { MOCK_MATCHES } = await import('@/lib/mockData');
  const m = MOCK_MATCHES.find(m => m.id === id);
  if (!m) throw new Error(`Match ${id} not found`);
  return m;
}

export async function fetchMatchWagerForMatch(matchId: string): Promise<MatchWager | null> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.MATCH_WAGERS)
  //   .select('*')
  //   .eq('match_id', matchId)
  //   .maybeSingle();
  // if (error) throw error;
  // return data;
  const { MOCK_MATCH_WAGERS } = await import('@/lib/mockData');
  return MOCK_MATCH_WAGERS.find(w => w.match_id === matchId) ?? null;
}

// ── CREATE ────────────────────────────────────────────────────

export interface CreateMatchInput {
  player_a_id: string;
  player_b_id: string;
  point_wager: number;
  winner_bonus: number;
  notes?: string;
}

export async function createMatch(input: CreateMatchInput, createdBy: string): Promise<Match> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.MATCHES)
  //   .insert({
  //     ...input,
  //     status: 'pending',
  //     created_by: createdBy,
  //   })
  //   .select()
  //   .single();
  // if (error) throw error;
  //
  // // Also create match_wager record immediately
  // await supabase.from(TABLES.MATCH_WAGERS).insert({ match_id: data.id, status: 'active' });
  //
  // return data;

  const newMatch: Match = {
    id: `m${Date.now()}`,
    ...input,
    notes: input.notes ?? null,
    status: 'pending',
    winner_id: null,
    player_a_score: null,
    player_b_score: null,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
  };
  return newMatch;
}

export async function startMatch(matchId: string): Promise<void> {
  // TODO: Supabase
  // const { error } = await supabase
  //   .from(TABLES.MATCHES)
  //   .update({ status: 'active', started_at: new Date().toISOString() })
  //   .eq('id', matchId);
  // if (error) throw error;
  //
  // // Activate any accepted external wagers on this match
  // await supabase
  //   .from(TABLES.EXTERNAL_WAGERS)
  //   .update({ status: 'active', activated_at: new Date().toISOString() })
  //   .eq('match_id', matchId)
  //   .eq('status', 'accepted');
  console.log('[mock] startMatch', matchId);
}

// ── FINALIZE ──────────────────────────────────────────────────
/**
 * Finalize a match with final scores.
 *
 * This is the most critical operation — it must be ATOMIC:
 * 1. Update match: scores, winner, status=completed, completed_at
 * 2. Update match_wager: debtor, creditor, amount, status=settled
 * 3. Insert obligation record (the DEBT — not payment)
 * 4. Settle all active external wagers on this match
 * 5. Insert obligation records for each external wager
 * 6. Insert notifications for all affected users
 *
 * All of the above runs inside a Postgres transaction via RPC.
 * NEVER do this piecemeal from the client.
 */
export async function finalizeMatch(
  matchId: string,
  playerAScore: number,
  playerBScore: number,
): Promise<void> {
  // TODO: Supabase RPC — replaces all mock logic below
  // const { error } = await supabase.rpc(RPC.FINALIZE_MATCH, {
  //   p_match_id:      matchId,
  //   p_score_a:       playerAScore,
  //   p_score_b:       playerBScore,
  // });
  // if (error) throw error;

  console.log('[mock] finalizeMatch', { matchId, playerAScore, playerBScore });
  // Mock: handled optimistically in the store
}

export async function updateLiveScores(
  matchId: string,
  playerAScore: number,
  playerBScore: number,
): Promise<void> {
  // TODO: Supabase realtime update (non-atomic, for live display only)
  // const { error } = await supabase
  //   .from(TABLES.MATCHES)
  //   .update({ player_a_score: playerAScore, player_b_score: playerBScore })
  //   .eq('id', matchId);
  // if (error) throw error;
  console.log('[mock] updateLiveScores', { matchId, playerAScore, playerBScore });
}
