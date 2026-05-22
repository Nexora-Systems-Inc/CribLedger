// ============================================================
// CribLedger — Wager Lifecycle Utilities
// ============================================================

import type { WagerStatus, MatchStatus, ExternalWager, Match } from '@/types';

// ── Status transition guards ──────────────────────────────────

/** Can this wager be accepted by the counterparty? */
export function canAccept(wager: ExternalWager): boolean {
  return wager.status === 'proposed';
}

/** Can the proposer cancel this wager? */
export function canCancel(wager: ExternalWager): boolean {
  return wager.status === 'proposed';
}

/** Can the counterparty decline this wager? */
export function canDecline(wager: ExternalWager): boolean {
  return wager.status === 'proposed';
}

/**
 * Validate that the proposer's picked player is actually in the match.
 * Called in service layer (not a DB CHECK constraint — PG doesn't support subqueries there).
 */
export function validateWagerPick(
  proposerPicksPlayerId: string,
  match: Match,
): boolean {
  return (
    proposerPicksPlayerId === match.player_a_id ||
    proposerPicksPlayerId === match.player_b_id
  );
}

/**
 * When a match transitions to 'active', which accepted wagers should activate?
 */
export function wagersToActivate(
  wagers: ExternalWager[],
  matchId: string,
): ExternalWager[] {
  return wagers.filter(
    w => w.match_id === matchId && w.status === 'accepted',
  );
}

/**
 * When a match is cancelled, which wagers should be voided?
 */
export function wagersToVoid(
  wagers: ExternalWager[],
  matchId: string,
): ExternalWager[] {
  return wagers.filter(
    w => w.match_id === matchId && (w.status === 'active' || w.status === 'accepted'),
  );
}

// ── Wager status display helpers ─────────────────────────────

export const WAGER_STATUS_LABEL: Record<WagerStatus, string> = {
  proposed:  'Proposed',
  accepted:  'Accepted',
  declined:  'Declined',
  cancelled: 'Cancelled',
  active:    'Active',
  settled:   'Settled',
  voided:    'Voided',
};

export const WAGER_STATUS_VARIANT: Record<WagerStatus, string> = {
  proposed:  'pending',
  accepted:  'blue',
  declined:  'red',
  cancelled: 'default',
  active:    'active',
  settled:   'completed',
  voided:    'default',
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  pending:   'Pending',
  active:    'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed:  'Disputed',
};
