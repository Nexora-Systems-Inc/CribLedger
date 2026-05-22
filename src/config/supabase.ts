// ============================================================
// CribLedger — Supabase Configuration
// ============================================================
// Copy .env.example → .env and fill in values before running.
// NEVER commit .env to source control.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_URL     = (import.meta as any).env?.VITE_SUPABASE_URL     as string | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // In dev, fall back gracefully so the UI still renders with mock data.
  console.warn('[CribLedger] Supabase env vars not set — running in mock/offline mode.');
}

export const supabase = createClient<Database>(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY ?? 'placeholder',
);

// ── Table name constants ──────────────────────────────────────
export const TABLES = {
  USERS:                  'users',
  MATCHES:                'matches',
  MATCH_WAGERS:           'match_wagers',
  EXTERNAL_WAGERS:        'external_wagers',
  OBLIGATIONS:            'obligations',
  SETTLEMENTS:            'settlements',
  SETTLEMENT_OBLIGATIONS: 'settlement_obligations',
  TRANSACTIONS:           'transactions',
  NOTIFICATIONS:          'notifications',
} as const;

// ── View / materialized view names ────────────────────────────
export const VIEWS = {
  USER_BALANCES:            'user_balances',
  BILATERAL_DEBT_SUMMARY:   'bilateral_debt_summary',
} as const;

// ── RPC function names ────────────────────────────────────────
// All write operations that touch the ledger go through RPCs,
// never direct client-side inserts.
export const RPC = {
  FINALIZE_MATCH:           'finalize_match',
  SETTLE_EXTERNAL_WAGER:    'settle_external_wager',
  CONFIRM_SETTLEMENT:       'confirm_settlement',
  GET_USER_BALANCE:         'get_user_balance',
  GET_BILATERAL_BALANCE:    'get_bilateral_balance',
} as const;

// ── App config ────────────────────────────────────────────────
export const APP_CONFIG = {
  APP_NAME:              'CribLedger',
  VERSION:               '2.0.0',
  CURRENCY_SYMBOL:       '$',
  DEFAULT_POINT_WAGER:   0.25,
  DEFAULT_WINNER_BONUS:  1.00,
} as const;
