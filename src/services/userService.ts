// ============================================================
// CribLedger — User Service
// ============================================================

import { supabase, TABLES, VIEWS } from '@/config/supabase';
import type { User, UserBalance, UserRole } from '@/types';

// ── In-memory mock store (dev fallback) ───────────────────────
// Gives create/edit/toggle operations somewhere to land
// until Supabase is wired. Initialised lazily from MOCK_USERS.
let _mockStore: User[] | null = null;

async function getMockStore(): Promise<User[]> {
  if (!_mockStore) {
    const { MOCK_USERS } = await import('@/lib/mockData');
    _mockStore = [...MOCK_USERS];
  }
  return _mockStore;
}

// ── READ ─────────────────────────────────────────────────────

/** Fetch ALL users (active and inactive) — for management screen. */
export async function fetchAllUsers(): Promise<User[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.USERS)
  //   .select('*')
  //   .order('display_name');
  // if (error) throw error;
  // return data;
  const store = await getMockStore();
  return [...store].sort((a, b) => a.display_name.localeCompare(b.display_name));
}

/** Fetch only active users — for match/wager player pickers. */
export async function fetchUsers(): Promise<User[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.USERS)
  //   .select('*')
  //   .eq('is_active', true)
  //   .order('display_name');
  // if (error) throw error;
  // return data;
  const store = await getMockStore();
  return store.filter(u => u.is_active).sort((a, b) => a.display_name.localeCompare(b.display_name));
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
  const store = await getMockStore();
  const u = store.find(u => u.id === id);
  if (!u) throw new Error(`User ${id} not found`);
  return u;
}

/**
 * Fetch user balances from the materialized view.
 * Balances are NEVER stored directly — always derived from transactions.
 */
export async function fetchUserBalances(): Promise<UserBalance[]> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(VIEWS.USER_BALANCES)
  //   .select('*')
  //   .order('balance', { ascending: false });
  // if (error) throw error;
  // return data;
  const { MOCK_TRANSACTIONS, deriveBalance } = await import('@/lib/mockData');
  const store = await getMockStore();
  return store.map(u => ({
    user_id:      u.id,
    display_name: u.display_name,
    balance:      parseFloat(deriveBalance(u.id, MOCK_TRANSACTIONS).toFixed(2)),
  })).sort((a, b) => b.balance - a.balance);
}

// ── CREATE ────────────────────────────────────────────────────

export interface CreateUserInput {
  display_name: string;
  role: UserRole;
  avatar_color: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.USERS)
  //   .insert({
  //     display_name: input.display_name,
  //     role:         input.role,
  //     avatar_color: input.avatar_color,
  //     is_active:    true,
  //   })
  //   .select()
  //   .single();
  // if (error) throw error;
  // return data;
  const store = await getMockStore();
  const now = new Date().toISOString();
  const newUser: User = {
    id:           `u${Date.now()}`,
    auth_id:      null,
    display_name: input.display_name.trim(),
    role:         input.role,
    avatar_color: input.avatar_color,
    is_active:    true,
    created_at:   now,
    updated_at:   now,
  };
  store.push(newUser);
  return newUser;
}

// ── UPDATE ────────────────────────────────────────────────────

export interface UpdateUserInput {
  display_name?: string;
  role?:         UserRole;
  avatar_color?: string;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.USERS)
  //   .update({ ...input, updated_at: new Date().toISOString() })
  //   .eq('id', id)
  //   .select()
  //   .single();
  // if (error) throw error;
  // return data;
  const store = await getMockStore();
  const idx = store.findIndex(u => u.id === id);
  if (idx === -1) throw new Error(`User ${id} not found`);
  store[idx] = {
    ...store[idx],
    ...input,
    display_name: input.display_name?.trim() ?? store[idx].display_name,
    updated_at: new Date().toISOString(),
  };
  return { ...store[idx] };
}

// ── TOGGLE ACTIVE ─────────────────────────────────────────────

export async function setUserActive(id: string, is_active: boolean): Promise<User> {
  // TODO: Supabase
  // const { data, error } = await supabase
  //   .from(TABLES.USERS)
  //   .update({ is_active, updated_at: new Date().toISOString() })
  //   .eq('id', id)
  //   .select()
  //   .single();
  // if (error) throw error;
  // return data;
  const store = await getMockStore();
  const idx = store.findIndex(u => u.id === id);
  if (idx === -1) throw new Error(`User ${id} not found`);
  store[idx] = { ...store[idx], is_active, updated_at: new Date().toISOString() };
  return { ...store[idx] };
}
