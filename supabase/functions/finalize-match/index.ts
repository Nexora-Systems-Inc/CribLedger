// ============================================================
// CribLedger — Edge Function: finalize-match
// POST /functions/v1/finalize-match
//
// Thin HTTP wrapper around the finalize_match Postgres RPC.
// The actual atomic logic lives in the RPC (migration 006).
// This layer handles auth, request validation, and error shaping.
//
// Body: { match_id: string, score_a: number, score_b: number }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // ── Validate caller is admin ──────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // TODO V2: check user row for role='admin' when auth_id is populated

    // ── Parse and validate body ───────────────────────────────
    const body = await req.json();
    const { match_id, score_a, score_b } = body;

    if (!match_id || typeof score_a !== 'number' || typeof score_b !== 'number') {
      return new Response(
        JSON.stringify({ error: 'match_id, score_a, score_b are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (score_a < 0 || score_b < 0) {
      return new Response(
        JSON.stringify({ error: 'Scores must be non-negative' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (score_a === score_b) {
      return new Response(
        JSON.stringify({ error: 'Cribbage cannot end in a tie' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Call RPC (all atomic logic lives there) ───────────────
    // Use the service-role client for the RPC to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabaseAdmin.rpc('finalize_match', {
      p_match_id: match_id,
      p_score_a:  score_a,
      p_score_b:  score_b,
    });

    if (error) {
      console.error('[finalize-match] RPC error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[finalize-match] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
