// ============================================================
// CribLedger — Wager Service
// ============================================================

import { supabase, TABLES } from '@/config/supabase';
import type { ExternalWager } from '@/types';
import { validateWagerPick } from '@/lib/wagerUtils';
import { fetchMatchById } from './matchService';

// ── READ ─────────────────────────────────────────────────────

export async function fetchExternalWagers(): Promise<ExternalWager[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.EXTERNAL_WAGERS)
  //   .select('*')
  //   .order('proposed_at', { ascending: false });
  // if (error) throw error;
  // return data;
  const { MOCK_EXTERNAL_WAGERS } = await import('@/lib/mockData');
  return [...MOCK_EXTERNAL_WAGERS];
}

export async function fetchWagersForMatch(matchId: string): Promise<ExternalWager[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.EXTERNAL_WAGERS)
  //   .select('*')
  //   .eq('match_id', matchId);
  // if (error) throw error;
  // return data;
  const { MOCK_EXTERNAL_WAGERS } = await import('@/lib/mockData');
  return MOCK_EXTERNAL_WAGERS.filter(w => w.match_id === matchId);
}

export async function fetchPendingWagersForUser(userId: string): Promise<ExternalWager[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.EXTERNAL_WAGERS)
  //   .select('*')
  //   .eq('counterparty_id', userId)
  //   .eq('status', 'proposed');
  // if (error) throw error;
  // return data;
  const { MOCK_EXTERNAL_WAGERS } = await import('@/lib/mockData');
  return MOCK_EXTERNAL_WAGERS.filter(
    w => w.counterparty_id === userId && w.status === 'proposed',
  );
}

// ── CREATE ────────────────────────────────────────────────────

export interface ProposeWagerInput {
  match_id: string;
  proposer_id: string;
  proposer_picks_player_id: string;
  counterparty_id: string;
  proposer_amount: number;
  counterparty_amount: number;
  notes?: string;
}

/**
 * Propose a side wager.
 *
 * Validation happens here (service layer), not as a DB CHECK constraint
 * because PostgreSQL doesn't support subqueries in CHECK constraints.
 * The trigger `trg_validate_wager_pick` on the DB provides a second
 * line of defense.
 */
export async function proposeWager(
  input: ProposeWagerInput,
  createdBy: string,
): Promise<ExternalWager> {
  // Validate pick (service-layer guard)
  const match = await fetchMatchById(input.match_id);
  if (!validateWagerPick(input.proposer_picks_player_id, match)) {
    throw new Error('proposer_picks_player_id must be a participant in the match');
  }
  if (input.proposer_id === input.counterparty_id) {
    throw new Error('Proposer and counterparty must be different users');
  }
  if (input.proposer_amount <= 0 || input.counterparty_amount <= 0) {
    throw new Error('Wager amounts must be positive');
  }

  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.EXTERNAL_WAGERS)
  //   .insert({ ...input, notes: input.notes ?? null, status: 'proposed', created_by: createdBy })
  //   .select()
  //   .single();
  // if (error) throw error;
  //
  // // Queue notification for counterparty
  // await supabase.from(TABLES.NOTIFICATIONS).insert({
  //   recipient_id: input.counterparty_id,
  //   type: 'wager_proposed',
  //   title: 'New wager proposal',
  //   body: `Someone wants to place a side bet with you on this match.`,
  //   entity_type: 'external_wager',
  //   entity_id: data.id,
  // });
  //
  // return data;

  const newWager: ExternalWager = {
    id: `ew${Date.now()}`,
    ...input,
    notes: input.notes ?? null,
    status: 'proposed',
    proposed_at: new Date().toISOString(),
    responded_at: null,
    activated_at: null,
    settled_at: null,
    winner_id: null,
    loser_id: null,
    created_by: createdBy,
  };
  return newWager;
}

// ── LIFECYCLE ─────────────────────────────────────────────────

export async function acceptWager(wagerId: string): Promise<void> {
  // TODO: Supabase
  // const { error } = await supabase
  //   .from(TABLES.EXTERNAL_WAGERS)
  //   .update({ status: 'accepted', responded_at: new Date().toISOString() })
  //   .eq('id', wagerId)
  //   .eq('status', 'proposed'); // guard against double-accept
  // if (error) throw error;
  console.log('[mock] acceptWager', wagerId);
}

export async function declineWager(wagerId: string): Promise<void> {
  // TODO: Supabase
  // const { error } = await supabase
  //   .from(TABLES.EXTERNAL_WAGERS)
  //   .update({ status: 'declined', responded_at: new Date().toISOString() })
  //   .eq('id', wagerId)
  //   .eq('status', 'proposed');
  // if (error) throw error;
  console.log('[mock] declineWager', wagerId);
}

export async function cancelWager(wagerId: string): Promise<void> {
  // TODO: Supabase
  // const { error } = await supabase
  //   .from(TABLES.EXTERNAL_WAGERS)
  //   .update({ status: 'cancelled' })
  //   .eq('id', wagerId)
  //   .eq('status', 'proposed');
  // if (error) throw error;
  console.log('[mock] cancelWager', wagerId);
}
