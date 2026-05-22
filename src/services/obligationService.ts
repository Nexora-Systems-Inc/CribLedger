// ============================================================
// CribLedger — Obligation & Settlement Service
//
// KEY DISTINCTION:
//   Obligations  = debts created automatically by wager/match results
//   Settlements  = payment events that reduce those debts
//   Transactions = immutable ledger entries created when a settlement is confirmed
// ============================================================

import { supabase, TABLES, RPC } from '@/config/supabase';
import type { Obligation, Settlement } from '@/types';

// ── OBLIGATIONS ───────────────────────────────────────────────

export async function fetchObligations(): Promise<Obligation[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.OBLIGATIONS)
  //   .select('*')
  //   .order('created_at', { ascending: false });
  // if (error) throw error;
  // return data;
  const { MOCK_OBLIGATIONS } = await import('@/lib/mockData');
  return [...MOCK_OBLIGATIONS];
}

export async function fetchObligationsForUser(userId: string): Promise<Obligation[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.OBLIGATIONS)
  //   .select('*')
  //   .or(`debtor_id.eq.${userId},creditor_id.eq.${userId}`)
  //   .order('created_at', { ascending: false });
  // if (error) throw error;
  // return data;
  const { MOCK_OBLIGATIONS } = await import('@/lib/mockData');
  return MOCK_OBLIGATIONS.filter(o => o.debtor_id === userId || o.creditor_id === userId);
}

export async function fetchOutstandingObligations(): Promise<Obligation[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.OBLIGATIONS)
  //   .select('*')
  //   .in('status', ['outstanding', 'partially_paid'])
  //   .order('created_at', { ascending: false });
  // if (error) throw error;
  // return data;
  const { MOCK_OBLIGATIONS } = await import('@/lib/mockData');
  return MOCK_OBLIGATIONS.filter(
    o => o.status === 'outstanding' || o.status === 'partially_paid',
  );
}

/**
 * Fetch bilateral debt summary between two users.
 * In production this queries the bilateral_debt_summary materialized view.
 * Positive = userAId is owed money by userBId.
 */
export async function fetchBilateralDebt(
  userAId: string,
  userBId: string,
): Promise<number> {
  // TODO: Supabase RPC
  // const { data, error } = await supabase.rpc(RPC.GET_BILATERAL_BALANCE, {
  //   user_a: userAId,
  //   user_b: userBId,
  // });
  // if (error) throw error;
  // return data as number;
  const { MOCK_OBLIGATIONS, bilateralObligationNet } = await import('@/lib/mockData');
  return bilateralObligationNet(userAId, userBId, MOCK_OBLIGATIONS);
}

// ── SETTLEMENTS ───────────────────────────────────────────────

export async function fetchSettlements(): Promise<Settlement[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.SETTLEMENTS)
  //   .select('*')
  //   .order('requested_at', { ascending: false });
  // if (error) throw error;
  // return data;
  const { MOCK_SETTLEMENTS } = await import('@/lib/mockData');
  return [...MOCK_SETTLEMENTS];
}

export interface CreateSettlementInput {
  debtor_id: string;
  creditor_id: string;
  amount: number;
  obligation_ids: string[]; // which obligations this payment covers
  notes?: string;
}

/**
 * Record that a payment is being requested/confirmed.
 *
 * This does NOT create a transaction — that happens in confirmSettlement.
 * Status starts as 'pending' (requested) or 'confirmed' depending on flow.
 */
export async function createSettlement(
  input: CreateSettlementInput,
  createdBy: string,
): Promise<Settlement> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.SETTLEMENTS)
  //   .insert({
  //     debtor_id:   input.debtor_id,
  //     creditor_id: input.creditor_id,
  //     amount:      input.amount,
  //     notes:       input.notes ?? null,
  //     status:      'pending',
  //     created_by:  createdBy,
  //   })
  //   .select()
  //   .single();
  // if (error) throw error;
  //
  // // Link to obligations
  // const links = input.obligation_ids.map(obId => ({
  //   settlement_id: data.id,
  //   obligation_id: obId,
  //   amount_applied: 0, // will be calculated on confirmation
  // }));
  // await supabase.from(TABLES.SETTLEMENT_OBLIGATIONS).insert(links);
  //
  // return data;
  const s: Settlement = {
    id: `st${Date.now()}`,
    debtor_id:    input.debtor_id,
    creditor_id:  input.creditor_id,
    amount:       input.amount,
    status:       'pending',
    notes:        input.notes ?? null,
    requested_at: new Date().toISOString(),
    confirmed_at: null,
    paid_at:      null,
    created_by:   createdBy,
  };
  return s;
}

/**
 * Confirm that a payment was received.
 *
 * This is the operation that:
 * 1. Updates the settlement status → 'confirmed'
 * 2. Updates obligation amount_paid for each linked obligation
 * 3. Sets obligation status to 'paid' or 'partially_paid'
 * 4. Inserts a Transaction record (the immutable ledger entry)
 *
 * MUST run as an atomic Postgres RPC — not piecemeal from the client.
 */
export async function confirmSettlement(settlementId: string): Promise<void> {
  // TODO: Supabase RPC (atomic)
  // const { error } = await supabase.rpc(RPC.CONFIRM_SETTLEMENT, {
  //   p_settlement_id: settlementId,
  // });
  // if (error) throw error;
  console.log('[mock] confirmSettlement', settlementId);
}

export async function markSettlementPaid(settlementId: string): Promise<void> {
  // TODO: Supabase
  // const { error } = await supabase
  //   .from(TABLES.SETTLEMENTS)
  //   .update({ status: 'paid', paid_at: new Date().toISOString() })
  //   .eq('id', settlementId);
  // if (error) throw error;
  console.log('[mock] markSettlementPaid', settlementId);
}
