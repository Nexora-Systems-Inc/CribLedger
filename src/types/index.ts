// ============================================================
// CribLedger — Domain Types
// Mirrors the Supabase database schema exactly.
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type UserRole = 'admin' | 'player' | 'spectator';

export type MatchStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';

export type WagerStatus =
  | 'proposed'   // created, awaiting counterparty response
  | 'accepted'   // counterparty agreed, not yet active
  | 'declined'   // counterparty rejected
  | 'cancelled'  // proposer withdrew before acceptance
  | 'active'     // match is live, wager locked
  | 'settled'    // outcome determined, obligation created
  | 'voided';    // match cancelled, wager nullified

export type TransactionType =
  | 'match_payout'   // from completed match wager
  | 'side_wager'     // from settled external/side wager
  | 'settlement'     // manual debt payment between users
  | 'adjustment';    // admin correction (auditable)

export type ObligationSource = 'match_wager' | 'side_wager';

export type ObligationStatus = 'outstanding' | 'partially_paid' | 'paid' | 'disputed' | 'written_off';

export type SettlementStatus = 'pending' | 'confirmed' | 'paid' | 'disputed' | 'written_off';

export type NotificationType =
  | 'wager_proposed'
  | 'wager_accepted'
  | 'wager_declined'
  | 'wager_cancelled'
  | 'match_started'
  | 'match_completed'
  | 'settlement_requested'
  | 'settlement_confirmed';

// ── Entities ─────────────────────────────────────────────────

export interface User {
  id: string;
  auth_id: string | null;
  display_name: string;
  role: UserRole;
  avatar_color: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Match {
  id: string;
  player_a_id: string;
  player_b_id: string;
  point_wager: number;
  winner_bonus: number;
  status: MatchStatus;
  winner_id: string | null;
  player_a_score: number | null;
  player_b_score: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface MatchWager {
  id: string;
  match_id: string;
  debtor_id: string | null;
  creditor_id: string | null;
  calculated_amount: number | null;
  status: WagerStatus;
  settled_at: string | null;
}

export interface ExternalWager {
  id: string;
  match_id: string;
  proposer_id: string;
  proposer_picks_player_id: string; // must be player_a_id or player_b_id
  counterparty_id: string;
  proposer_amount: number;
  counterparty_amount: number;
  status: WagerStatus;
  proposed_at: string;
  responded_at: string | null;
  activated_at: string | null;
  settled_at: string | null;
  winner_id: string | null;  // which USER won this wager (not which match player)
  loser_id: string | null;
  notes: string | null;
  created_by: string;
}

/**
 * Obligation — the debt record created when a wager settles.
 *
 * IMPORTANT SEPARATION:
 *   - An Obligation is created automatically when a match completes
 *     or a side wager is settled. It records WHO OWES WHOM and how much.
 *   - A Settlement is a payment event against one or more obligations.
 *     It records that money actually changed hands.
 *   - "Wager settled" ≠ "Money paid". The obligation bridges the two.
 */
export interface Obligation {
  id: string;
  debtor_id: string;    // user who owes money
  creditor_id: string;  // user who is owed money
  amount: number;       // original amount owed
  amount_paid: number;  // cumulative payments received so far
  source: ObligationSource;
  match_id: string | null;
  match_wager_id: string | null;
  external_wager_id: string | null;
  status: ObligationStatus;
  created_at: string;
  notes: string | null;
}

/**
 * Settlement — a confirmed payment event that reduces obligation(s).
 *
 * One settlement can cover multiple obligations (e.g. "Mark pays Joey $14
 * to clear the $4 from Tuesday's match AND the $10 side wager").
 * The settlement_obligations join table links them.
 */
export interface Settlement {
  id: string;
  debtor_id: string;
  creditor_id: string;
  amount: number;       // total payment amount
  status: SettlementStatus;
  notes: string | null;
  requested_at: string;
  confirmed_at: string | null;
  paid_at: string | null;
  created_by: string;
}

/** Join table linking a payment to the specific obligations it covers. */
export interface SettlementObligation {
  id: string;
  settlement_id: string;
  obligation_id: string;
  amount_applied: number; // portion of this payment applied to this obligation
}

/**
 * Transaction — immutable append-only ledger record.
 * Created server-side only (RPC/Edge Function).
 * Never inserted directly from the client.
 */
export interface Transaction {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  type: TransactionType;
  match_id: string | null;
  wager_id: string | null;
  settlement_id: string | null;
  obligation_id: string | null;
  created_by: string;
  created_at: string;
  notes: string | null;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: 'match' | 'external_wager' | 'settlement' | 'obligation' | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

// ── Derived / View Types ──────────────────────────────────────

/** Result of the bilateral_debt_summary view or RPC. */
export interface BilateralDebt {
  user_a_id: string;
  user_b_id: string;
  /** Positive = user_a is owed by user_b. Negative = user_a owes user_b. */
  net_amount: number;
  outstanding_obligations: number; // count
}

/** User balance computed from transactions. */
export interface UserBalance {
  user_id: string;
  display_name: string;
  balance: number;
}

// ── Rich / Joined Types (frontend use) ───────────────────────

export interface MatchWithPlayers extends Match {
  player_a: User;
  player_b: User;
  winner: User | null;
  created_by_user: User;
  match_wager: MatchWager | null;
  external_wagers: ExternalWager[];
}

export interface ObligationWithParties extends Obligation {
  debtor: User;
  creditor: User;
  match: Match | null;
  amount_remaining: number; // amount - amount_paid
}

export interface SettlementWithObligations extends Settlement {
  debtor: User;
  creditor: User;
  applied_obligations: Array<SettlementObligation & { obligation: Obligation }>;
}

export interface ExternalWagerWithParties extends ExternalWager {
  proposer: User;
  counterparty: User;
  proposer_picks: User;
  match: Match;
}
