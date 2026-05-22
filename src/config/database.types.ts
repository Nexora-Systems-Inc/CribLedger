// ============================================================
// CribLedger — Supabase Generated Database Types (stub)
// ============================================================
// TODO: Replace this file with the output of:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/config/database.types.ts
//
// Until then this stub satisfies the TypeScript compiler
// so the rest of the codebase can be strongly typed.
// ============================================================

export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
  };
};
