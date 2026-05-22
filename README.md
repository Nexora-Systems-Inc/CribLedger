# CribLedger v2

Private cribbage league wager and balance tracker.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS 3 |
| Routing | React Router 6 |
| Server state | TanStack React Query v5 |
| Client state | Zustand v4 |
| Database | Supabase (Postgres 15) |
| Auth | Supabase Auth (wired in V2) |
| Edge Functions | Supabase Edge Functions (Deno) |

---

## Architecture

### Obligation vs Settlement — critical distinction

| Concept | What it is | When created |
|---|---|---|
| **Obligation** | A debt record. "Mark owes Joey $4." | Automatically when a match completes or a side wager settles |
| **Settlement** | A payment event. "Mark paid Joey $4 via Venmo." | When an admin confirms money changed hands |

A wager with `status = 'settled'` means the **outcome has been determined** and an obligation record has been created. It does **not** mean money has been paid. That requires a confirmed Settlement.

### Granular obligations + bilateral rollup

Each match result and side wager generates its own obligation record. This enables:
- Full audit trail per wager
- Partial payment tracking
- Dispute handling per obligation
- The `bilateral_debt_summary` materialized view rolls up all obligations between two users for the "who owes who" UI display.

### Transaction-first ledger

User balances are **never stored**. They are always derived from the `transactions` table via the `user_balances` materialized view. The `transactions` table is append-only and can only be written by Postgres RPC functions — never directly from the client.

### Wager pick validation

`proposer_picks_player_id` must reference a participant in the match. PostgreSQL does not support subqueries in `CHECK` constraints, so this is enforced at two layers:
1. **Service layer** — `validateWagerPick()` in `src/lib/wagerUtils.ts`
2. **Database trigger** — `trg_validate_wager_pick` in migration 004

---

## Quick start

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

The app runs fully on mock data until Supabase is wired. Every service function has a `// TODO: Supabase` block with the exact query to uncomment.

---

## Connecting to Supabase

### 1. Create a project

Create a Supabase project at https://app.supabase.com.

### 2. Run migrations in order

```bash
# In the Supabase SQL editor, run these in order:
supabase/migrations/001_enums.sql
supabase/migrations/002_tables.sql
supabase/migrations/003_indexes_views.sql
supabase/migrations/004_triggers.sql
supabase/migrations/005_rls.sql
supabase/migrations/006_rpc_functions.sql
supabase/migrations/007_seed_dev.sql   # dev only
```

Or using the Supabase CLI:
```bash
supabase db push
```

### 3. Generate TypeScript types

```bash
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/config/database.types.ts
```

This replaces the stub file with real types from your schema.

### 4. Deploy Edge Functions

```bash
supabase functions deploy finalize-match
supabase functions deploy confirm-settlement
supabase functions deploy settle-external-wager
```

### 5. Wire the services

Each file in `src/services/` has mock implementations with `// TODO: Supabase` comments. Uncomment the Supabase queries and remove the mock imports to go live.

---

## Data flow for a complete match

```
Admin creates match
  → matches row (status: pending)
  → match_wagers row (status: active)

Wager proposals flow through WagerInbox
  → external_wagers rows (proposed → accepted → active)

Admin enters scores → finalize_match RPC (atomic):
  → matches updated (status: completed, scores, winner_id)
  → match_wagers updated (debtor, creditor, amount, status: settled)
  → obligations INSERT (match_wager source) ← DEBT RECORD CREATED
  → external_wagers updated (settled, winner/loser)
  → obligations INSERT per side wager ← DEBT RECORDS CREATED
  → transactions INSERT per obligation ← LEDGER ENTRIES
  → notifications queued
  → user_balances view refreshed (trigger)
  → bilateral_debt_summary view refreshed (trigger)

When money actually changes hands:
  Admin creates settlement (pending)
    → settlements row
    → settlement_obligations rows

  Admin confirms settlement → confirm_settlement RPC (atomic):
    → settlements updated (status: confirmed)
    → obligations.amount_paid incremented
    → obligation.status updated (outstanding → partially_paid → paid)
    → transactions INSERT (settlement type) ← LEDGER ENTRY
    → user_balances view refreshed (trigger)
```

---

## Project structure

```
src/
  config/        Supabase client, table/RPC name constants, type stubs
  types/         All TypeScript domain types (mirrors DB schema)
  lib/           Pure functions: calculations, wager lifecycle, mock data
  services/      All Supabase calls (never imported into components directly)
  stores/        Zustand: match mutations, UI state
  hooks/         React Query hooks (components use these, not services)
  components/    UI component library + layout
  screens/       Page-level components

supabase/
  migrations/    SQL: enums, tables, indexes, triggers, RLS, RPCs, seed
  functions/     Edge Functions (Deno): thin HTTP wrappers over RPCs
```

---

## V2 TODO

- [ ] Wire Supabase Auth — populate `auth_id` on user rows
- [ ] Scope RLS policies per authenticated user (`auth.uid()`)
- [ ] Replace all `// TODO: Supabase` mock implementations with real queries
- [ ] Run `npx supabase gen types typescript` to replace type stubs
- [ ] Enable Realtime on `matches`, `external_wagers`, `notifications`
- [ ] Add React Query `useSubscription` hooks for live score updates
- [ ] Add Realtime badge count for wager inbox
- [ ] Add pagination to MatchHistory
- [ ] Add admin user management screen
