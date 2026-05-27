// ============================================================
// CribLedger — Supabase Configuration
// ============================================================

import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_URL      = (import.meta as any).env?.VITE_SUPABASE_URL      as string | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[CribLedger] Missing Supabase env vars.\n' +
    'Create .env.local at PROJECT ROOT (next to vite.config.ts):\n' +
    '  VITE_SUPABASE_URL=https://<ref>.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=eyJ...  (anon/public JWT from Dashboard → Settings → API)\n\n' +
    'NOTE: The key must start with "eyJ", NOT "sb_publishable_".'
  );
}

export const supabase = createClient(
  SUPABASE_URL      ?? 'https://zwwglmdqldviiqotzyej.supabase.co',
  SUPABASE_ANON_KEY ?? 'sb_publishable_RpjFnqMcFgI6qlHkcepcvQ_bTEYxrMr',
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
  USER_BALANCES:          'user_balances',
  BILATERAL_DEBT_SUMMARY: 'bilateral_debt_summary',
} as const;

// ── RPC function names ────────────────────────────────────────
export const RPC = {
  FINALIZE_MATCH:        'finalize_match',
  SETTLE_EXTERNAL_WAGER: 'settle_external_wager',
  CONFIRM_SETTLEMENT:    'confirm_settlement',
  GET_USER_BALANCE:      'get_user_balance',
  GET_BILATERAL_BALANCE: 'get_bilateral_balance',
} as const;

// ── App config ────────────────────────────────────────────────
export const APP_CONFIG = {
  APP_NAME:             'CribLedger',
  VERSION:              '2.0.0',
  CURRENCY_SYMBOL:      '$',
  DEFAULT_POINT_WAGER:  0.25,
  DEFAULT_WINNER_BONUS: 1.00,
} as const;
