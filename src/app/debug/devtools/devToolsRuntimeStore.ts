import { create } from "zustand";
import { defaultDevToolsPreferences, readDevToolsPreferences, writeDevToolsPreferences } from "./devToolsPreferences";
import type { DebugRandomRoll, DevToolsMode, DockAnchor, DockSize, RngMode } from "./devToolsTypes";
export type RngOverrideKind = "hit" | "crit" | "dodge" | "parry" | "block";

export interface DebugRuntimeEvent {
  id: number;
  type: string;
  text: string;
  at: number;
}

interface DevToolsRuntimeState {
  mode: DevToolsMode;
  dockSize: DockSize;
  dockAnchor: DockAnchor;
  dockPosition: { x: number; y: number } | null;
  expandedSections: string[];
  simulationPaused: boolean;
  timeScale: number;
  rngMode: RngMode;
  rngSeed: number;
  rngState: number;
  rngRollIndex: number;
  rngOverrides: Partial<Record<RngOverrideKind, "hit" | "miss" | "crit" | "dodge" | "parry" | "block">>;
  rngHistory: DebugRandomRoll[];
  automationTraceEnabled: boolean;
  automationTrace: Array<{ id: number; text: string; passed: boolean; at: number }>;
  eventsEnabled: boolean;
  events: DebugRuntimeEvent[];
  eventFilter: string;
  openConsole: () => void;
  openDock: () => void;
  close: () => void;
  setDockSize: (size: DockSize) => void;
  setDockAnchor: (anchor: DockAnchor) => void;
  setDockPosition: (position: { x: number; y: number } | null) => void;
  toggleSection: (section: string) => void;
  setSimulationPaused: (paused: boolean) => void;
  setTimeScale: (scale: number) => void;
  setRngMode: (mode: RngMode) => void;
  setRngSeed: (seed: number) => void;
  setRngOverride: (kind: RngOverrideKind, value: "hit" | "miss" | "crit" | "dodge" | "parry" | "block" | undefined) => void;
  recordRoll: (roll: DebugRandomRoll) => void;
  clearRngHistory: () => void;
  setAutomationTraceEnabled: (enabled: boolean) => void;
  recordAutomationTrace: (entry: { text: string; passed: boolean }) => void;
  setEventsEnabled: (enabled: boolean) => void;
  recordEvent: (event: Omit<DebugRuntimeEvent, "id" | "at">) => void;
  clearEvents: () => void;
  setEventFilter: (filter: string) => void;
}

const preferences = readDevToolsPreferences();
let nextRuntimeId = 1;

function persist(state: Pick<DevToolsRuntimeState, "dockSize" | "dockAnchor" | "dockPosition" | "expandedSections" | "eventFilter">) {
  writeDevToolsPreferences({
    ...defaultDevToolsPreferences,
    dockSize: state.dockSize,
    dockAnchor: state.dockAnchor,
    dockPosition: state.dockPosition,
    expandedSections: state.expandedSections,
    eventFilter: state.eventFilter,
  });
}

export const useDevToolsRuntimeStore = create<DevToolsRuntimeState>((set) => ({
  mode: "closed",
  dockSize: preferences.dockSize,
  dockAnchor: preferences.dockAnchor,
  dockPosition: preferences.dockPosition,
  expandedSections: preferences.expandedSections,
  simulationPaused: false,
  timeScale: 1,
  rngMode: "normal",
  rngSeed: 12345,
  rngState: 12345,
  rngRollIndex: 0,
  rngOverrides: {},
  rngHistory: [],
  automationTraceEnabled: false,
  automationTrace: [],
  eventsEnabled: true,
  events: [],
  eventFilter: preferences.eventFilter,
  openConsole: () => set({ mode: "console" }),
  openDock: () => set({ mode: "dock" }),
  close: () => set({ mode: "closed" }),
  setDockSize: (dockSize) => set((state) => { const next = { ...state, dockSize }; persist(next); return { dockSize }; }),
  setDockAnchor: (dockAnchor) => set((state) => { const next = { ...state, dockAnchor, dockPosition: null }; persist(next); return { dockAnchor, dockPosition: null }; }),
  setDockPosition: (dockPosition) => set((state) => { const next = { ...state, dockPosition }; persist(next); return { dockPosition }; }),
  toggleSection: (section) => set((state) => {
    const expandedSections = state.expandedSections.includes(section)
      ? state.expandedSections.filter((entry) => entry !== section)
      : [...state.expandedSections, section];
    persist({ ...state, expandedSections });
    return { expandedSections };
  }),
  setSimulationPaused: (simulationPaused) => set({ simulationPaused }),
  setTimeScale: (timeScale) => set({ timeScale: Math.max(0.25, Math.min(8, timeScale)) }),
  setRngMode: (rngMode) => set((state) => ({ rngMode, rngState: state.rngSeed, rngRollIndex: 0, rngHistory: [] })),
  setRngSeed: (rngSeed) => set({ rngSeed: Math.floor(Number.isFinite(rngSeed) ? rngSeed : 0), rngState: Math.floor(Number.isFinite(rngSeed) ? rngSeed : 0), rngRollIndex: 0, rngHistory: [] }),
  setRngOverride: (kind, value) => set((state) => ({ rngOverrides: { ...state.rngOverrides, [kind]: value } })),
  recordRoll: (roll) => set((state) => ({ rngRollIndex: state.rngRollIndex + 1, rngState: roll.stateAfter ?? state.rngState, rngHistory: [...state.rngHistory, roll].slice(-100) })),
  clearRngHistory: () => set({ rngHistory: [], rngRollIndex: 0 }),
  setAutomationTraceEnabled: (automationTraceEnabled) => set({ automationTraceEnabled }),
  recordAutomationTrace: (entry) => set((state) => ({ automationTrace: [...state.automationTrace, { ...entry, id: nextRuntimeId++, at: Date.now() }].slice(-100) })),
  setEventsEnabled: (eventsEnabled) => set({ eventsEnabled }),
  recordEvent: (event) => set((state) => state.eventsEnabled ? ({ events: [...state.events, { ...event, id: nextRuntimeId++, at: Date.now() }].slice(-100) }) : state),
  clearEvents: () => set({ events: [] }),
  setEventFilter: (eventFilter) => set((state) => { persist({ ...state, eventFilter }); return { eventFilter }; }),
}));
