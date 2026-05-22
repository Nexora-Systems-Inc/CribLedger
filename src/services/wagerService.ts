// ============================================================
// CribLedger — Wager Service (LIVE — Supabase)
// ============================================================

import { supabase, TABLES } from '@/config/supabase';
import type { ExternalWager } from '@/types';
import { validateWagerPick } from '@/lib/wagerUtils';
import { fetchMatchById } from './matchService';

// ── READ ─────────────────────────────────────────────────────

export async function fetchExternalWagers(): Promise<ExternalWager[]> {
  const { data, error } = await supabase
    .from(TABLES.EXTERNAL_WAGERS)
    .select('*')
    .order('proposed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as ExternalWager[];
}

export async function fetchWagersForMatch(matchId: string): Promise<ExternalWager[]> {
  const { data, error } = await supabase
    .from(TABLES.EXTERNAL_WAGERS)
    .select('*')
    .eq('match_id', matchId)
    .order('proposed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as ExternalWager[];
}

export async function fetchPendingWagersForUser(userId: string): Promise<ExternalWager[]> {
  const { data, error } = await supabase
    .from(TABLES.EXTERNAL_WAGERS)
    .select('*')
    .eq('counterparty_id', userId)
    .eq('status', 'proposed')
    .order('proposed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as ExternalWager[];
}

// ── CREATE ────────────────────────────────────────────────────

export interface ProposeWagerInput {
  match_id:                 string;
  proposer_id:              string;
  proposer_picks_player_id: string;
  counterparty_id:          string;
  proposer_amount:          number;
  counterparty_amount:      number;
  notes?:                   string;
}

/**
 * Propose a side wager.
 *
 * Service-layer validation runs first; the DB trigger
 * trg_validate_wager_pick provides a second line of defense.
 */
export async function proposeWager(
  input: ProposeWagerInput,
  createdBy: string,
): Promise<ExternalWager> {
  // Client-side guards
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

  const { data, error } = await supabase
    .from(TABLES.EXTERNAL_WAGERS)
    .insert({
      match_id:                 input.match_id,
      proposer_id:              input.proposer_id,
      proposer_picks_player_id: input.proposer_picks_player_id,
      counterparty_id:          input.counterparty_id,
      proposer_amount:          input.proposer_amount,
      counterparty_amount:      input.counterparty_amount,
      notes:                    input.notes ?? null,
      status:                   'proposed',
      created_by:               createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Notify the counterparty
  await supabase.from(TABLES.NOTIFICATIONS).insert({
    recipient_id: input.counterparty_id,
    type:         'wager_proposed',
    title:        'New wager proposal',
    body:         'Someone wants to place a side bet with you on this match.',
    entity_type:  'external_wager',
    entity_id:    (data as ExternalWager).id,
  });

  return data as ExternalWager;
}

// ── LIFECYCLE ─────────────────────────────────────────────────

export async function acceptWager(wagerId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.EXTERNAL_WAGERS)
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', wagerId)
    .eq('status', 'proposed'); // idempotency guard
  if (error) throw new Error(error.message);
}

export async function declineWager(wagerId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.EXTERNAL_WAGERS)
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', wagerId)
    .eq('status', 'proposed');
  if (error) throw new Error(error.message);
}

export async function cancelWager(wagerId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.EXTERNAL_WAGERS)
    .update({ status: 'cancelled' })
    .eq('id', wagerId)
    .eq('status', 'proposed');
  if (error) throw new Error(error.message);
}
