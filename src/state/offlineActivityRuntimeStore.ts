import { create } from "zustand";
import type { OfflineActivitySimulationResult } from "../game/offline/offlineActivityContract";

export interface OfflineActivityLastResult {
  activityType: string;
  simulation: OfflineActivitySimulationResult<unknown, unknown>;
}

interface OfflineActivityRuntimeState {
  transactionRunning: boolean;
  lastResult: OfflineActivityLastResult | null;
  message: string | null;
  setTransactionRunning: (running: boolean) => void;
  setLastResult: (result: OfflineActivityLastResult | null) => void;
  setMessage: (message: string | null) => void;
  reset: () => void;
}

export const useOfflineActivityRuntimeStore = create<OfflineActivityRuntimeState>((set) => ({
  transactionRunning: false,
  lastResult: null,
  message: null,
  setTransactionRunning: (transactionRunning) => set({ transactionRunning }),
  setLastResult: (lastResult) => set({ lastResult, message: null }),
  setMessage: (message) => set({ message }),
  reset: () => set({ transactionRunning: false, lastResult: null, message: null }),
}));
