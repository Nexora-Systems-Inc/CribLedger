// ============================================================
// CribLedger — User Service
// ============================================================

import { supabase, TABLES, VIEWS } from '@/config/supabase';
import type { User, UserBalance } from '@/types';

export async function fetchUsers(): Promise<User[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.USERS)
  //   .select('*')
  //   .eq('is_active', true)
  //   .order('display_name');
  // if (error) throw error;
  // return data;
  const { MOCK_USERS } = await import('@/lib/mockData');
  return [...MOCK_USERS];
}

export async function fetchUserById(id: string): Promise<User> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.USERS)
  //   .select('*')
  //   .eq('id', id)
  //   .single();
  // if (error) throw error;
  // return data;
  const { MOCK_USERS } = await import('@/lib/mockData');
  const u = MOCK_USERS.find(u => u.id === id);
  if (!u) throw new Error(`User ${id} not found`);
  return u;
}

/**
 * Fetch user balances from the materialized view.
 * Balances are NEVER stored directly — always derived from transactions.
 *
 * The view is: SELECT user_id, SUM(credit) - SUM(debit) FROM transactions GROUP BY user_id
 */
export async function fetchUserBalances(): Promise<UserBalance[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(VIEWS.USER_BALANCES)
  //   .select('*')
  //   .order('balance', { ascending: false });
  // if (error) throw error;
  // return data;

  // Mock: derive from mock transactions
  const { MOCK_USERS, MOCK_TRANSACTIONS, deriveBalance } = await import('@/lib/mockData');
  return MOCK_USERS.map(u => ({
    user_id:      u.id,
    display_name: u.display_name,
    balance:      parseFloat(deriveBalance(u.id, MOCK_TRANSACTIONS).toFixed(2)),
  })).sort((a, b) => b.balance - a.balance);
}
