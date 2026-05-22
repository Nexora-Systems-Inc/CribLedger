// ============================================================
// CribLedger — Supabase Database Types
// ============================================================
// This file provides permissive pass-through types that let the
// compiler accept all Supabase queries without errors.
//
// To upgrade to fully generated types run:
//   npx supabase gen types typescript \
//     --project-id YOUR_PROJECT_ID \
//     > src/config/database.types.ts
// ============================================================

// A permissive row type: all string keys, any value
type AnyRow    = Record<string, unknown>;
type AnyInsert = Record<string, unknown>;
type AnyUpdate = Record<string, unknown>;

// A permissive table definition
type PermissiveTable = {
  Row:    AnyRow;
  Insert: AnyInsert;
  Update: AnyUpdate;
};

// A permissive RPC function: accepts any args, returns any value
type PermissiveFunction = {
  Args:    Record<string, unknown>;
  Returns: unknown;
};

export type Database = {
  public: {
    Tables: {
      users:                  PermissiveTable;
      matches:                PermissiveTable;
      match_wagers:           PermissiveTable;
      external_wagers:        PermissiveTable;
      obligations:            PermissiveTable;
      settlements:            PermissiveTable;
      settlement_obligations: PermissiveTable;
      transactions:           PermissiveTable;
      notifications:          PermissiveTable;
    };
    Views: {
      user_balances:          { Row: AnyRow };
      bilateral_debt_summary: { Row: AnyRow };
    };
    Functions: {
      finalize_match:        PermissiveFunction;
      settle_external_wager: PermissiveFunction;
      confirm_settlement:    PermissiveFunction;
      get_user_balance:      PermissiveFunction;
      get_bilateral_balance: PermissiveFunction;
    };
    Enums: Record<string, string>;
  };
};
