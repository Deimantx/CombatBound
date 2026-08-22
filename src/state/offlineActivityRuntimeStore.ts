import { create } from "zustand";
import type { OfflineActivityLastResult } from "../app/offline/offlineActivityTypes";

export type { OfflineActivityLastResult } from "../app/offline/offlineActivityTypes";

interface OfflineActivityRuntimeState {
  transactionRunning: boolean;
  resultsOpen: boolean;
  lastResult: OfflineActivityLastResult | null;
  message: string | null;
  setTransactionRunning: (running: boolean) => void;
  setLastResult: (result: OfflineActivityLastResult | null) => void;
  openResults: () => void;
  closeResults: () => void;
  setMessage: (message: string | null) => void;
  reset: () => void;
}

export const useOfflineActivityRuntimeStore = create<OfflineActivityRuntimeState>((set) => ({
  transactionRunning: false,
  resultsOpen: false,
  lastResult: null,
  message: null,
  setTransactionRunning: (transactionRunning) => set({ transactionRunning }),
  setLastResult: (lastResult) => set({ lastResult, message: null }),
  openResults: () => set({ resultsOpen: true }),
  closeResults: () => set({ resultsOpen: false }),
  setMessage: (message) => set({ message }),
  reset: () => set({ transactionRunning: false, resultsOpen: false, lastResult: null, message: null }),
}));
