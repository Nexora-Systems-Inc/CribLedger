// ============================================================
// CribLedger — Supabase Configuration
// ============================================================

import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_URL      = (import.meta as any).env?.VITE_SUPABASE_URL      as string | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[CribLedger] Supabase env vars not set — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

/**
 * The Supabase client used throughout the service layer.
 *
 * We instantiate without a Database generic so TypeScript does not
 * constrain insert/update payloads to `never` while generated types
 * are unavailable. Runtime query correctness is guaranteed by the
 * real DB schema. To enable full compile-time column checking, run:
 *
 *   npx supabase gen types typescript \
 *     --project-id YOUR_PROJECT_ID \
 *     > src/config/database.types.ts
 *
 * Then re-add the generic: createClient<Database>(...)
 */
export const supabase = createClient(
  SUPABASE_URL      ?? 'https://zwwglmdqldviiqotzyej.supabase.co/rest/v1/',
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
