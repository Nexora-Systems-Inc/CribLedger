// ============================================================
// CribLedger — Pure Calculation Functions
// No imports from Supabase or stores. Fully unit-testable.
// ============================================================

import type { Match, ExternalWager, Obligation } from '@/types';

// ── Match payout ──────────────────────────────────────────────

/**
 * Calculate what the loser owes the winner from a completed match.
 *
 * Formula: |scoreA - scoreB| × pointWager + winnerBonus
 */
export function calcMatchPayout(
  scoreA: number,
  scoreB: number,
  pointWager: number,
  winnerBonus: number,
): number {
  const diff = Math.abs(scoreA - scoreB);
  return parseFloat((diff * pointWager + winnerBonus).toFixed(2));
}

/**
 * Determine the winner of a match given two scores.
 * Returns 'a' | 'b' | null (null = tie, shouldn't happen in cribbage).
 */
export function matchWinner(scoreA: number, scoreB: number): 'a' | 'b' | null {
  if (scoreA > scoreB) return 'a';
  if (scoreB > scoreA) return 'b';
  return null;
}

/**
 * Determine winner/loser IDs from a completed match.
 */
export function matchPayoutParties(match: Match): {
  winnerId: string;
  loserId: string;
  amount: number;
} | null {
  if (
    match.player_a_score === null ||
    match.player_b_score === null ||
    match.winner_id === null
  ) return null;

  const loserId =
    match.winner_id === match.player_a_id
      ? match.player_b_id
      : match.player_a_id;

  return {
    winnerId: match.winner_id,
    loserId,
    amount: calcMatchPayout(
      match.player_a_score,
      match.player_b_score,
      match.point_wager,
      match.winner_bonus,
    ),
  };
}

// ── External wager payout ─────────────────────────────────────

/**
 * Determine the outcome of a side wager given the match winner.
 *
 * - If the match winner is the player the proposer backed:
 *     proposer wins → counterparty pays proposer `counterparty_amount`
 * - Otherwise:
 *     counterparty wins → proposer pays counterparty `proposer_amount`
 */
export function calcExternalWagerOutcome(
  wager: ExternalWager,
  matchWinnerId: string,
): { winnerId: string; loserId: string; payoutAmount: number } {
  const proposerWon = wager.proposer_picks_player_id === matchWinnerId;
  return {
    winnerId:     proposerWon ? wager.proposer_id    : wager.counterparty_id,
    loserId:      proposerWon ? wager.counterparty_id : wager.proposer_id,
    payoutAmount: proposerWon ? wager.counterparty_amount : wager.proposer_amount,
  };
}

/**
 * Implied odds as a ratio string, e.g. "2:1" or "Even".
 */
export function impliedOddsLabel(proposerAmount: number, counterpartyAmount: number): string {
  if (proposerAmount === counterpartyAmount) return 'Even';
  const [a, b] = proposerAmount > counterpartyAmount
    ? [proposerAmount / counterpartyAmount, 1]
    : [1, counterpartyAmount / proposerAmount];
  return `${+a.toFixed(2)}:${+b.toFixed(2)}`;
}

// ── Obligation / balance helpers ─────────────────────────────

/** Remaining unpaid amount on an obligation. */
export function obligationBalance(o: Obligation): number {
  return parseFloat((o.amount - o.amount_paid).toFixed(2));
}

/**
 * Given a list of obligations between two users, compute the net
 * bilateral balance.  Positive = userA is owed by userB.
 */
export function bilateralNet(
  obligations: Obligation[],
  userAId: string,
  userBId: string,
): number {
  return obligations.reduce((net, o) => {
    const remaining = obligationBalance(o);
    if (o.creditor_id === userAId && o.debtor_id === userBId) return net + remaining;
    if (o.creditor_id === userBId && o.debtor_id === userAId) return net - remaining;
    return net;
  }, 0);
}

// ── Formatting ───────────────────────────────────────────────

export function formatCurrency(amount: number, symbol = '$'): string {
  const abs = Math.abs(amount).toFixed(2);
  return `${symbol}${abs}`;
}

export function formatSignedCurrency(amount: number, symbol = '$'): string {
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${symbol}${Math.abs(amount).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
