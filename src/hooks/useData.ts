// ============================================================
// CribLedger — Data Hooks (React Query + Zustand)
//
// Components use these hooks. They never import services directly.
// React Query handles: fetching, caching, background refetch.
// Zustand handles: optimistic updates, UI state, mutations.
// ============================================================

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMatchStore } from '@/stores/useMatchStore';
import * as matchSvc from '@/services/matchService';
import * as wagerSvc from '@/services/wagerService';
import * as obligSvc from '@/services/obligationService';
import * as userSvc  from '@/services/userService';
import type {
  Match, ExternalWager, Obligation, Settlement, User, UserBalance,
} from '@/types';

// ── Query keys ────────────────────────────────────────────────
export const QK = {
  users:          ['users'] as const,
  userBalances:   ['userBalances'] as const,
  user:           (id: string) => ['user', id] as const,
  matches:        ['matches'] as const,
  match:          (id: string) => ['match', id] as const,
  matchWager:     (matchId: string) => ['matchWager', matchId] as const,
  externalWagers: ['externalWagers'] as const,
  wagersForMatch: (matchId: string) => ['wagersForMatch', matchId] as const,
  pendingWagers:  (userId: string) => ['pendingWagers', userId] as const,
  obligations:    ['obligations'] as const,
  obligationsForUser: (uid: string) => ['obligationsForUser', uid] as const,
  outstanding:    ['outstanding'] as const,
  settlements:    ['settlements'] as const,
  bilateralDebt:  (a: string, b: string) => ['bilateralDebt', a, b] as const,
};

// ── Users ─────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({ queryKey: QK.users, queryFn: userSvc.fetchUsers, staleTime: 60_000 });
}

export function useUserBalances() {
  return useQuery({ queryKey: QK.userBalances, queryFn: userSvc.fetchUserBalances, staleTime: 10_000 });
}

export function useUser(id: string) {
  return useQuery({ queryKey: QK.user(id), queryFn: () => userSvc.fetchUserById(id) });
}

/**
 * Resolves the acting "current user" from the live users table.
 * V1 no-auth pattern: returns the first admin user found.
 * Replace with real auth context when auth is added.
 */
export function useCurrentUser(): User | undefined {
  const { data: users } = useAllUsers();
  return users?.find(u => u.role === 'admin') ?? users?.[0];
}

// ── Matches ───────────────────────────────────────────────────

export function useMatches() {
  return useQuery({ queryKey: QK.matches, queryFn: matchSvc.fetchMatches, staleTime: 5_000 });
}

export function useMatch(id: string) {
  return useQuery({ queryKey: QK.match(id), queryFn: () => matchSvc.fetchMatchById(id) });
}

export function useMatchWager(matchId: string) {
  return useQuery({
    queryKey: QK.matchWager(matchId),
    queryFn: () => matchSvc.fetchMatchWagerForMatch(matchId),
  });
}

/** Matches with status = 'pending' — not yet started. */
export function usePendingMatches() {
  const { data: matches, ...rest } = useMatches();
  return {
    data: (matches?.filter(m => m.status === 'pending') ?? [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    ...rest,
  };
}

export function useActiveMatches() {
  const { data: matches, ...rest } = useMatches();
  return { data: matches?.filter(m => m.status === 'active') ?? [], ...rest };
}

export function useCompletedMatches() {
  const { data: matches, ...rest } = useMatches();
  return {
    data: (matches?.filter(m => m.status === 'completed') ?? [])
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()),
    ...rest,
  };
}

// ── Match mutations ───────────────────────────────────────────

export function useCreateMatch() {
  const qc = useQueryClient();
  const store = useMatchStore();
  return useMutation({
    mutationFn: ({ input, createdBy }: { input: matchSvc.CreateMatchInput; createdBy: string }) =>
      store.createMatch(input, createdBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.matches }),
  });
}

/**
 * Transition a pending match to active status.
 * Also activates any accepted side wagers for this match.
 */
export function useStartMatch() {
  const qc = useQueryClient();
  const store = useMatchStore();
  return useMutation({
    mutationFn: (matchId: string) => store.startMatch(matchId),
    onSuccess: (_data, matchId) => {
      qc.invalidateQueries({ queryKey: QK.matches });
      qc.invalidateQueries({ queryKey: QK.match(matchId) });
      qc.invalidateQueries({ queryKey: QK.externalWagers });
    },
  });
}

export function useFinalizeMatch() {
  const qc = useQueryClient();
  const store = useMatchStore();
  return useMutation({
    mutationFn: ({ matchId, scoreA, scoreB }: { matchId: string; scoreA: number; scoreB: number }) =>
      store.finalizeMatch(matchId, scoreA, scoreB),
    onSuccess: (_data, { matchId }) => {
      qc.invalidateQueries({ queryKey: QK.matches });
      qc.invalidateQueries({ queryKey: QK.match(matchId) });
      qc.invalidateQueries({ queryKey: QK.obligations });
      qc.invalidateQueries({ queryKey: QK.outstanding });
      qc.invalidateQueries({ queryKey: QK.userBalances });
    },
  });
}

// ── External Wagers ───────────────────────────────────────────

export function useExternalWagers() {
  return useQuery({ queryKey: QK.externalWagers, queryFn: wagerSvc.fetchExternalWagers });
}

export function useWagersForMatch(matchId: string) {
  return useQuery({
    queryKey: QK.wagersForMatch(matchId),
    queryFn: () => wagerSvc.fetchWagersForMatch(matchId),
  });
}

export function usePendingWagers(userId: string) {
  return useQuery({
    queryKey: QK.pendingWagers(userId),
    queryFn: () => wagerSvc.fetchPendingWagersForUser(userId),
  });
}

export function useProposeWager() {
  const qc = useQueryClient();
  const store = useMatchStore();
  return useMutation({
    mutationFn: ({ input, createdBy }: { input: wagerSvc.ProposeWagerInput; createdBy: string }) =>
      store.proposeWager(input, createdBy),
    onSuccess: (_data, { input }) => {
      qc.invalidateQueries({ queryKey: QK.externalWagers });
      qc.invalidateQueries({ queryKey: QK.wagersForMatch(input.match_id) });
    },
  });
}

export function useRespondToWager() {
  const qc = useQueryClient();
  const store = useMatchStore();
  return useMutation({
    mutationFn: ({ wagerId, action }: { wagerId: string; action: 'accept' | 'decline' | 'cancel' }) => {
      if (action === 'accept')  return store.acceptWager(wagerId);
      if (action === 'decline') return store.declineWager(wagerId);
      return store.cancelWager(wagerId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.externalWagers });
    },
  });
}

// ── Obligations ───────────────────────────────────────────────

export function useObligations() {
  return useQuery({ queryKey: QK.obligations, queryFn: obligSvc.fetchObligations });
}

export function useOutstandingObligations() {
  return useQuery({ queryKey: QK.outstanding, queryFn: obligSvc.fetchOutstandingObligations });
}

export function useObligationsForUser(userId: string) {
  return useQuery({
    queryKey: QK.obligationsForUser(userId),
    queryFn: () => obligSvc.fetchObligationsForUser(userId),
  });
}

export function useBilateralDebt(userAId: string, userBId: string) {
  return useQuery({
    queryKey: QK.bilateralDebt(userAId, userBId),
    queryFn: () => obligSvc.fetchBilateralDebt(userAId, userBId),
    enabled: !!userAId && !!userBId && userAId !== userBId,
  });
}

// ── Settlements ───────────────────────────────────────────────

export function useSettlements() {
  return useQuery({ queryKey: QK.settlements, queryFn: obligSvc.fetchSettlements });
}

export function useCreateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, createdBy }: { input: obligSvc.CreateSettlementInput; createdBy: string }) =>
      obligSvc.createSettlement(input, createdBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.settlements });
      qc.invalidateQueries({ queryKey: QK.obligations });
      qc.invalidateQueries({ queryKey: QK.outstanding });
    },
  });
}

export function useConfirmSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settlementId: string) => obligSvc.confirmSettlement(settlementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.settlements });
      qc.invalidateQueries({ queryKey: QK.obligations });
      qc.invalidateQueries({ queryKey: QK.outstanding });
      qc.invalidateQueries({ queryKey: QK.userBalances });
    },
  });
}

// ── Player Management ─────────────────────────────────────────

/** All users including inactive — for the management screen. */
export function useAllUsers() {
  return useQuery({ queryKey: ['allUsers'], queryFn: userSvc.fetchAllUsers, staleTime: 30_000 });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: userSvc.CreateUserInput) => userSvc.createUser(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.users });
      qc.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: userSvc.UpdateUserInput }) =>
      userSvc.updateUser(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.users });
      qc.invalidateQueries({ queryKey: ['allUsers'] });
      qc.invalidateQueries({ queryKey: QK.user(id) });
    },
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      userSvc.setUserActive(id, is_active),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.users });
      qc.invalidateQueries({ queryKey: ['allUsers'] });
      qc.invalidateQueries({ queryKey: QK.user(id) });
      qc.invalidateQueries({ queryKey: QK.matches });
    },
  });
}
