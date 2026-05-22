// ============================================================
// CribLedger — Mock Data (V2 architecture)
// TODO: Replace all references with Supabase queries.
// ============================================================

import type {
  User, Match, MatchWager, ExternalWager,
  Obligation, Settlement, Transaction,
} from '@/types';

// ── Users ─────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  { id: 'u1', auth_id: null, display_name: 'Joey',  role: 'admin',  avatar_color: '#f5b832', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', is_active: true },
  { id: 'u2', auth_id: null, display_name: 'Mark',  role: 'player', avatar_color: '#60a5fa', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', is_active: true },
  { id: 'u3', auth_id: null, display_name: 'Dave',  role: 'player', avatar_color: '#a78bfa', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', is_active: true },
  { id: 'u4', auth_id: null, display_name: 'Chris', role: 'player', avatar_color: '#34d399', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', is_active: true },
  { id: 'u5', auth_id: null, display_name: 'Lena',  role: 'player', avatar_color: '#f472b6', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z', is_active: true },
  { id: 'u6', auth_id: null, display_name: 'Zach',  role: 'player', avatar_color: '#fb923c', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z', is_active: true },
];

// ── Matches ───────────────────────────────────────────────────
export const MOCK_MATCHES: Match[] = [
  {
    id: 'm1', player_a_id: 'u1', player_b_id: 'u2',
    point_wager: 0.25, winner_bonus: 1.00,
    status: 'completed', winner_id: 'u1',
    player_a_score: 121, player_b_score: 98,
    notes: 'Thursday night classic.',
    created_by: 'u1', created_at: '2024-05-14T20:00:00Z',
    started_at: '2024-05-14T20:05:00Z', completed_at: '2024-05-14T22:10:00Z',
  },
  {
    id: 'm2', player_a_id: 'u2', player_b_id: 'u3',
    point_wager: 0.50, winner_bonus: 2.00,
    status: 'completed', winner_id: 'u2',
    player_a_score: 121, player_b_score: 88,
    notes: null,
    created_by: 'u1', created_at: '2024-05-16T19:00:00Z',
    started_at: '2024-05-16T19:10:00Z', completed_at: '2024-05-16T21:00:00Z',
  },
  {
    id: 'm3', player_a_id: 'u1', player_b_id: 'u4',
    point_wager: 0.25, winner_bonus: 1.00,
    status: 'active', winner_id: null,
    player_a_score: null, player_b_score: null,
    notes: 'High stakes Friday.',
    created_by: 'u1', created_at: '2024-05-22T19:00:00Z',
    started_at: '2024-05-22T19:05:00Z', completed_at: null,
  },
  {
    id: 'm4', player_a_id: 'u3', player_b_id: 'u5',
    point_wager: 0.25, winner_bonus: 1.00,
    status: 'completed', winner_id: 'u5',
    player_a_score: 105, player_b_score: 121,
    notes: null,
    created_by: 'u1', created_at: '2024-05-18T18:00:00Z',
    started_at: '2024-05-18T18:05:00Z', completed_at: '2024-05-18T20:30:00Z',
  },
];

// ── Match Wagers ──────────────────────────────────────────────
export const MOCK_MATCH_WAGERS: MatchWager[] = [
  { id: 'mw1', match_id: 'm1', debtor_id: 'u2', creditor_id: 'u1', calculated_amount: 6.75, status: 'settled', settled_at: '2024-05-14T22:10:00Z' },
  { id: 'mw2', match_id: 'm2', debtor_id: 'u3', creditor_id: 'u2', calculated_amount: 18.50, status: 'settled', settled_at: '2024-05-16T21:00:00Z' },
  { id: 'mw3', match_id: 'm3', debtor_id: null,  creditor_id: null,  calculated_amount: null, status: 'active',  settled_at: null },
  { id: 'mw4', match_id: 'm4', debtor_id: 'u3', creditor_id: 'u5', calculated_amount: 5.00,  status: 'settled', settled_at: '2024-05-18T20:30:00Z' },
];

// ── External / Side Wagers ────────────────────────────────────
export const MOCK_EXTERNAL_WAGERS: ExternalWager[] = [
  {
    id: 'ew1', match_id: 'm1',
    proposer_id: 'u3', proposer_picks_player_id: 'u1',
    counterparty_id: 'u4',
    proposer_amount: 10.00, counterparty_amount: 10.00,
    status: 'settled',
    proposed_at: '2024-05-14T19:30:00Z', responded_at: '2024-05-14T19:45:00Z',
    activated_at: '2024-05-14T20:05:00Z', settled_at: '2024-05-14T22:10:00Z',
    winner_id: 'u3', loser_id: 'u4',
    notes: null, created_by: 'u1',
  },
  {
    id: 'ew2', match_id: 'm1',
    proposer_id: 'u6', proposer_picks_player_id: 'u2',
    counterparty_id: 'u1',
    proposer_amount: 5.00, counterparty_amount: 8.00, // 5:8 odds on Mark
    status: 'settled',
    proposed_at: '2024-05-14T19:40:00Z', responded_at: '2024-05-14T19:55:00Z',
    activated_at: '2024-05-14T20:05:00Z', settled_at: '2024-05-14T22:10:00Z',
    winner_id: 'u1', loser_id: 'u6',
    notes: 'Zach bet on Mark, Joey backed Joey.', created_by: 'u1',
  },
  {
    id: 'ew3', match_id: 'm3',
    proposer_id: 'u2', proposer_picks_player_id: 'u4',
    counterparty_id: 'u5',
    proposer_amount: 8.00, counterparty_amount: 16.00, // 2:1 on Chris
    status: 'active',
    proposed_at: '2024-05-22T18:30:00Z', responded_at: '2024-05-22T18:45:00Z',
    activated_at: '2024-05-22T19:05:00Z', settled_at: null,
    winner_id: null, loser_id: null,
    notes: null, created_by: 'u1',
  },
  {
    id: 'ew4', match_id: 'm3',
    proposer_id: 'u3', proposer_picks_player_id: 'u1',
    counterparty_id: 'u6',
    proposer_amount: 15.00, counterparty_amount: 15.00,
    status: 'proposed',
    proposed_at: '2024-05-22T19:00:00Z', responded_at: null,
    activated_at: null, settled_at: null,
    winner_id: null, loser_id: null,
    notes: 'Dave proposes to Zach.', created_by: 'u1',
  },
];

// ── Obligations ───────────────────────────────────────────────
// Created automatically when a match or side wager settles.
// These are DEBT records — NOT payment confirmations.
export const MOCK_OBLIGATIONS: Obligation[] = [
  // From match m1: Mark owes Joey $6.75
  {
    id: 'ob1', debtor_id: 'u2', creditor_id: 'u1',
    amount: 6.75, amount_paid: 6.75,
    source: 'match_wager', match_id: 'm1', match_wager_id: 'mw1', external_wager_id: null,
    status: 'paid', created_at: '2024-05-14T22:10:00Z', notes: 'Joey vs Mark — match payout',
  },
  // From side wager ew1: Chris owes Dave $10
  {
    id: 'ob2', debtor_id: 'u4', creditor_id: 'u3',
    amount: 10.00, amount_paid: 10.00,
    source: 'side_wager', match_id: 'm1', match_wager_id: null, external_wager_id: 'ew1',
    status: 'paid', created_at: '2024-05-14T22:10:00Z', notes: 'Side wager: Dave backed Joey',
  },
  // From side wager ew2: Zach owes Joey $5
  {
    id: 'ob3', debtor_id: 'u6', creditor_id: 'u1',
    amount: 5.00, amount_paid: 0,
    source: 'side_wager', match_id: 'm1', match_wager_id: null, external_wager_id: 'ew2',
    status: 'outstanding', created_at: '2024-05-14T22:10:00Z', notes: 'Zach bet on Mark, lost',
  },
  // From match m2: Dave owes Mark $18.50
  {
    id: 'ob4', debtor_id: 'u3', creditor_id: 'u2',
    amount: 18.50, amount_paid: 10.00,
    source: 'match_wager', match_id: 'm2', match_wager_id: 'mw2', external_wager_id: null,
    status: 'partially_paid', created_at: '2024-05-16T21:00:00Z', notes: 'Mark vs Dave — match payout',
  },
  // From match m4: Dave owes Lena $5
  {
    id: 'ob5', debtor_id: 'u3', creditor_id: 'u5',
    amount: 5.00, amount_paid: 0,
    source: 'match_wager', match_id: 'm4', match_wager_id: 'mw4', external_wager_id: null,
    status: 'outstanding', created_at: '2024-05-18T20:30:00Z', notes: 'Dave vs Lena — match payout',
  },
];

// ── Settlements ───────────────────────────────────────────────
// Payment events that reduce obligation balances.
export const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: 'st1', debtor_id: 'u2', creditor_id: 'u1',
    amount: 6.75, status: 'paid',
    notes: 'Venmo — settled after Thursday game',
    requested_at: '2024-05-14T22:30:00Z', confirmed_at: '2024-05-14T22:35:00Z', paid_at: '2024-05-14T22:35:00Z',
    created_by: 'u1',
  },
  {
    id: 'st2', debtor_id: 'u4', creditor_id: 'u3',
    amount: 10.00, status: 'paid',
    notes: 'Cash on the spot',
    requested_at: '2024-05-14T22:30:00Z', confirmed_at: '2024-05-14T22:32:00Z', paid_at: '2024-05-14T22:32:00Z',
    created_by: 'u1',
  },
  {
    id: 'st3', debtor_id: 'u3', creditor_id: 'u2',
    amount: 10.00, status: 'confirmed',
    notes: 'Partial payment on Mark vs Dave match',
    requested_at: '2024-05-17T10:00:00Z', confirmed_at: '2024-05-17T10:15:00Z', paid_at: null,
    created_by: 'u1',
  },
];

// ── Transactions ──────────────────────────────────────────────
// Append-only. Created server-side when settlements are confirmed.
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx1', from_user_id: 'u2', to_user_id: 'u1', amount: 6.75,  type: 'match_payout', match_id: 'm1', wager_id: null, settlement_id: 'st1', obligation_id: 'ob1', created_by: 'u1', created_at: '2024-05-14T22:35:00Z', notes: 'Joey vs Mark payout' },
  { id: 'tx2', from_user_id: 'u4', to_user_id: 'u3', amount: 10.00, type: 'side_wager',   match_id: 'm1', wager_id: 'ew1', settlement_id: 'st2', obligation_id: 'ob2', created_by: 'u1', created_at: '2024-05-14T22:32:00Z', notes: 'Side wager ew1 settled' },
  { id: 'tx3', from_user_id: 'u3', to_user_id: 'u2', amount: 10.00, type: 'settlement',   match_id: 'm2', wager_id: null,  settlement_id: 'st3', obligation_id: 'ob4', created_by: 'u1', created_at: '2024-05-17T10:15:00Z', notes: 'Partial payment on ob4' },
];

// ── Helpers ───────────────────────────────────────────────────

export const getUserById = (id: string): User | undefined =>
  MOCK_USERS.find(u => u.id === id);

export const getMatchById = (id: string): Match | undefined =>
  MOCK_MATCHES.find(m => m.id === id);

export const getObligationsForUser = (userId: string): Obligation[] =>
  MOCK_OBLIGATIONS.filter(o => o.debtor_id === userId || o.creditor_id === userId);

export const getOutstandingObligations = (): Obligation[] =>
  MOCK_OBLIGATIONS.filter(o => o.status === 'outstanding' || o.status === 'partially_paid');

export const getExternalWagersForMatch = (matchId: string): ExternalWager[] =>
  MOCK_EXTERNAL_WAGERS.filter(w => w.match_id === matchId);

export const getPendingWagersForUser = (userId: string): ExternalWager[] =>
  MOCK_EXTERNAL_WAGERS.filter(
    w => w.counterparty_id === userId && w.status === 'proposed',
  );

/**
 * Derive a user's balance from transactions.
 * Positive = net creditor. Negative = net debtor.
 * NOTE: In production this comes from the user_balances materialized view.
 */
export function deriveBalance(userId: string, transactions: Transaction[]): number {
  return transactions.reduce((net, tx) => {
    if (tx.to_user_id   === userId) return net + tx.amount;
    if (tx.from_user_id === userId) return net - tx.amount;
    return net;
  }, 0);
}

/** Bilateral net between two users from obligations. */
export function bilateralObligationNet(
  userId: string,
  otherUserId: string,
  obligations: Obligation[],
): number {
  // positive = otherUser owes userId
  return obligations.reduce((net, o) => {
    const remaining = o.amount - o.amount_paid;
    if (o.creditor_id === userId && o.debtor_id === otherUserId) return net + remaining;
    if (o.debtor_id   === userId && o.creditor_id === otherUserId) return net - remaining;
    return net;
  }, 0);
}
