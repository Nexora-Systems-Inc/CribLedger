// ============================================================
// CribLedger — UI Store (Zustand)
// Modal state, loading indicators, active selections.
// ============================================================

import { create } from 'zustand';

type ModalKey = 'createSettlement' | 'proposeWager' | 'finalizeMatch' | 'confirmSettlement' | null;

interface UIStoreState {
  activeModal: ModalKey;
  modalPayload: Record<string, unknown>;
  openModal: (key: ModalKey, payload?: Record<string, unknown>) => void;
  closeModal: () => void;

  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  // Global async loading flag (for full-page spinners)
  globalLoading: boolean;
  setGlobalLoading: (v: boolean) => void;
}

export const useUIStore = create<UIStoreState>()((set) => ({
  activeModal:   null,
  modalPayload:  {},
  openModal:     (key, payload = {}) => set({ activeModal: key, modalPayload: payload }),
  closeModal:    () => set({ activeModal: null, modalPayload: {} }),

  sidebarOpen:    false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  globalLoading:    false,
  setGlobalLoading: (v) => set({ globalLoading: v }),
}));
