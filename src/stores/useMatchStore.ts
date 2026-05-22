// ============================================================
// CribLedger — Match Store (Zustand)
// Owns client-side match state and optimistic updates.
// Server state (fetching/caching) is handled by React Query.
// ============================================================

import { create } from 'zustand';
import type { Match, ExternalWager } from '@/types';
import {
  createMatch as svcCreate,
  finalizeMatch as svcFinalize,
  startMatch as svcStart,
  updateLiveScores,
  type CreateMatchInput,
} from '@/services/matchService';
import { proposeWager, acceptWager, declineWager, cancelWager, type ProposeWagerInput } from '@/services/wagerService';
import { calcMatchPayout, matchWinner } from '@/lib/calculations';
import { wagersToActivate, wagersToVoid } from '@/lib/wagerUtils';

interface MatchStoreState {
  // Optimistic overlay — keyed by match ID
  // React Query holds the server-truth; this holds pending client changes
  optimisticScores: Record<string, { a: number; b: number }>;

  // Actions
  updateOptimisticScores: (matchId: string, a: number, b: number) => void;
  clearOptimisticScores:  (matchId: string) => void;

  createMatch:   (input: CreateMatchInput, createdBy: string) => Promise<Match>;
  startMatch:    (matchId: string) => Promise<void>;
  finalizeMatch: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
  proposeWager:  (input: ProposeWagerInput, createdBy: string) => Promise<ExternalWager>;
  acceptWager:   (wagerId: string) => Promise<void>;
  declineWager:  (wagerId: string) => Promise<void>;
  cancelWager:   (wagerId: string) => Promise<void>;
}

export const useMatchStore = create<MatchStoreState>()((set, get) => ({
  optimisticScores: {},

  updateOptimisticScores: (matchId, a, b) =>
    set(s => ({ optimisticScores: { ...s.optimisticScores, [matchId]: { a, b } } })),

  clearOptimisticScores: (matchId) =>
    set(s => {
      const next = { ...s.optimisticScores };
      delete next[matchId];
      return { optimisticScores: next };
    }),

  createMatch: async (input, createdBy) => {
    const match = await svcCreate(input, createdBy);
    // React Query invalidation handled in the hook that calls this
    return match;
  },

  startMatch: async (matchId) => {
    await svcStart(matchId);
  },

  finalizeMatch: async (matchId, scoreA, scoreB) => {
    await svcFinalize(matchId, scoreA, scoreB);
    get().clearOptimisticScores(matchId);
  },

  proposeWager:  async (input, createdBy) => proposeWager(input, createdBy),
  acceptWager:   async (id) => acceptWager(id),
  declineWager:  async (id) => declineWager(id),
  cancelWager:   async (id) => cancelWager(id),
}));
