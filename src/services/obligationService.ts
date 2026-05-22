// ============================================================
// CribLedger — Obligation & Settlement Service (LIVE — Supabase)
//
// KEY DISTINCTION:
//   Obligations  = debts created automatically by wager/match results
//   Settlements  = payment events that reduce those debts
//   Transactions = immutable ledger entries (written only by RPCs)
// ============================================================

import { supabase, TABLES, RPC } from '@/config/supabase';
import type { Obligation, Settlement } from '@/types';

// ── OBLIGATIONS ───────────────────────────────────────────────

export async function fetchObligations(): Promise<Obligation[]> {
  const { data, error } = await supabase
    .from(TABLES.OBLIGATIONS)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Obligation[];
}

export async function fetchObligationsForUser(userId: string): Promise<Obligation[]> {
  const { data, error } = await supabase
    .from(TABLES.OBLIGATIONS)
    .select('*')
    .or(`debtor_id.eq.${userId},creditor_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Obligation[];
}

export async function fetchOutstandingObligations(): Promise<Obligation[]> {
  const { data, error } = await supabase
    .from(TABLES.OBLIGATIONS)
    .select('*')
    .in('status', ['outstanding', 'partially_paid'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Obligation[];
}

/**
 * Bilateral net between two users via the get_bilateral_balance RPC.
 * Positive  → userAId is owed money by userBId.
 * Negative  → userAId owes money to userBId.
 */
export async function fetchBilateralDebt(
  userAId: string,
  userBId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc(RPC.GET_BILATERAL_BALANCE, {
    user_a: userAId,
    user_b: userBId,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

// ── SETTLEMENTS ───────────────────────────────────────────────

export async function fetchSettlements(): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from(TABLES.SETTLEMENTS)
    .select('*')
    .order('requested_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Settlement[];
}

export interface CreateSettlementInput {
  debtor_id:       string;
  creditor_id:     string;
  amount:          number;
  obligation_ids:  string[];   // obligations this payment will cover
  notes?:          string;
}

/**
 * Create a settlement record and link it to its obligations.
 * Status starts as 'pending'. Call confirmSettlement() once money
 * is confirmed received — that is what moves obligations to paid
 * and writes the immutable ledger transaction.
 */
export async function createSettlement(
  input: CreateSettlementInput,
  createdBy: string,
): Promise<Settlement> {
  // 1. Insert settlement row
  const { data, error } = await supabase
    .from(TABLES.SETTLEMENTS)
    .insert({
      debtor_id:   input.debtor_id,
      creditor_id: input.creditor_id,
      amount:      input.amount,
      notes:       input.notes ?? null,
      status:      'pending',
      created_by:  createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const settlement = data as Settlement;

  // 2. Link to obligations via settlement_obligations join table.
  //    Distribute the payment evenly across linked obligations;
  //    the confirm_settlement RPC will apply exact amounts.
  if (input.obligation_ids.length > 0) {
    const amountPerOb = parseFloat(
      (input.amount / input.obligation_ids.length).toFixed(2),
    );
    const links = input.obligation_ids.map(obId => ({
      settlement_id:  settlement.id,
      obligation_id:  obId,
      amount_applied: amountPerOb,
    }));
    const { error: linkError } = await supabase
      .from(TABLES.SETTLEMENT_OBLIGATIONS)
      .insert(links);
    if (linkError) throw new Error(linkError.message);
  }

  return settlement;
}

/**
 * Confirm a payment was received.
 *
 * Delegates to the confirm_settlement RPC (migration 006) which
 * atomically:
 *   1. Updates settlement status → 'confirmed'
 *   2. Increments obligation.amount_paid for each linked obligation
 *   3. Triggers obligation status update (outstanding → paid)
 *   4. Inserts an immutable transaction record
 *   5. Queues a notification for the debtor
 *   6. Refreshes the user_balances materialized view (via trigger)
 */
export async function confirmSettlement(settlementId: string): Promise<void> {
  const { error } = await supabase.rpc(RPC.CONFIRM_SETTLEMENT, {
    p_settlement_id: settlementId,
  });
  if (error) throw new Error(error.message);
}

export async function markSettlementPaid(settlementId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.SETTLEMENTS)
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', settlementId);
  if (error) throw new Error(error.message);
}
