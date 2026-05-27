// ============================================================
// CribLedger — User Service (LIVE — Supabase)
// ============================================================

import { supabase, TABLES, VIEWS } from '@/config/supabase';
import type { User, UserBalance, UserRole } from '@/types';

// ── READ ─────────────────────────────────────────────────────

/** All users including inactive — for the management screen. */
export async function fetchAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .order('display_name');
  if (error) throw new Error(error.message);
  return data as User[];
}

/** Active users only — for match / wager player pickers. */
export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('is_active', true)
    .order('display_name');

  console.log('FETCH USERS DATA:', data);
  console.log('FETCH USERS ERROR:', error);

  if (error) throw new Error(error.message);

  return data as User[];
}

export async function fetchUserById(id: string): Promise<User> {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as User;
}

/**
 * Balances are derived from the user_balances materialized view.
 * They are NEVER stored directly — always computed from transactions.
 */
export async function fetchUserBalances(): Promise<UserBalance[]> {
  const { data, error } = await supabase
    .from(VIEWS.USER_BALANCES)
    .select('*')
    .order('balance', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserBalance[];
}

// ── CREATE ────────────────────────────────────────────────────

export interface CreateUserInput {
  display_name: string;
  role: UserRole;
  avatar_color: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .insert({
      display_name: input.display_name.trim(),
      role:         input.role,
      avatar_color: input.avatar_color,
      is_active:    true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as User;
}

// ── UPDATE ────────────────────────────────────────────────────

export interface UpdateUserInput {
  display_name?: string;
  role?:         UserRole;
  avatar_color?: string;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const patch: Record<string, unknown> = { ...input };
  if (input.display_name) patch.display_name = input.display_name.trim();
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as User;
}

// ── TOGGLE ACTIVE ─────────────────────────────────────────────

export async function setUserActive(id: string, is_active: boolean): Promise<User> {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as User;
}
