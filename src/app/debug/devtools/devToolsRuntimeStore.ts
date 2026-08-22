import { create } from "zustand";
import { defaultDevToolsPreferences, readDevToolsPreferences, writeDevToolsPreferences } from "./devToolsPreferences";
import type { DevToolsMode, DevToolsVisualMode, DockAnchor, DockDimensions, DockSize } from "./devToolsTypes";
import type { DebugTab } from "../admin/debugTabs";
import { DEBUG_MAX_TIME_SCALE, DEBUG_MIN_TIME_SCALE } from "./devToolsTypes";
import { DEFAULT_DEBUG_TAB_ORDER, normalizeDebugTabId, normalizeDebugTabOrder } from "../admin/debugTabs";
export interface DebugRuntimeEvent {
  id: number;
  type: string;
  text: string;
  at: number;
}

export interface DevToolsVisibilityState {
  consoleOpen: boolean;
  dockActive: boolean;
}

interface DevToolsRuntimeState extends DevToolsVisibilityState {
  mode: DevToolsMode;
  visualMode: DevToolsVisualMode;
  dockSize: DockSize;
  dockAnchor: DockAnchor;
  dockPosition: { x: number; y: number } | null;
  dockDimensions: DockDimensions | null;
  expandedSections: string[];
  lastConsoleTab: string;
  simulationPaused: boolean;
  simulationResetVersion: number;
  timeScale: number;
  playerImmortal: boolean;
  immortalEnemyInstanceIds: string[];
  automationTraceEnabled: boolean;
  eventsEnabled: boolean;
  eventFilter: string;
  consoleTabOrder: DebugTab[];
  openConsole: () => void;
  closeConsole: () => void;
  openDock: () => void;
  activateDockAndCloseConsole: () => void;
  closeDock: () => void;
  close: () => void;
  setDockSize: (size: DockSize) => void;
  setDockAnchor: (anchor: DockAnchor) => void;
  setDockPosition: (position: { x: number; y: number } | null) => void;
  commitDockGeometry: (position: { x: number; y: number } | null, dimensions: DockDimensions | null) => void;
  setDockDimensions: (dimensions: DockDimensions | null) => void;
  isEnemyImmortal: (instanceId: string) => boolean;
  setEnemyImmortal: (instanceId: string, enabled: boolean) => void;
  clearEnemyImmortality: () => void;
  toggleSection: (section: string) => void;
  setSimulationPaused: (paused: boolean) => void;
  resetSimulationAccumulator: () => void;
  setTimeScale: (scale: number) => void;
  setPlayerImmortal: (enabled: boolean) => void;
  setAutomationTraceEnabled: (enabled: boolean) => void;
  recordAutomationTrace: (entry: unknown) => void;
  setEventsEnabled: (enabled: boolean) => void;
  recordEvent: (event: Omit<DebugRuntimeEvent, "id" | "at">) => void;
  clearEvents: () => void;
  setEventFilter: (filter: string) => void;
  setLastConsoleTab: (tab: string) => void;
  setConsoleTabOrder: (order: string[]) => void;
  resetConsoleTabOrder: () => void;
}

const preferences = readDevToolsPreferences();
function persist(state: Pick<DevToolsRuntimeState, "dockSize" | "dockAnchor" | "dockPosition" | "dockDimensions" | "expandedSections" | "eventFilter" | "lastConsoleTab" | "consoleTabOrder">) {
  writeDevToolsPreferences({
    ...defaultDevToolsPreferences,
    dockSize: state.dockSize,
    dockAnchor: state.dockAnchor,
    dockPosition: state.dockPosition,
    dockDimensions: state.dockDimensions,
    expandedSections: state.expandedSections,
    eventFilter: state.eventFilter,
    lastConsoleTab: state.lastConsoleTab,
    consoleTabOrder: state.consoleTabOrder,
  });
}

function visualMode(consoleOpen: boolean, dockActive: boolean): DevToolsVisualMode {
  if (consoleOpen && dockActive) return "console-with-dock";
  if (consoleOpen) return "console-only";
  if (dockActive) return "dock-only";
  return "closed";
}

function legacyMode(consoleOpen: boolean, dockActive: boolean): DevToolsMode {
  if (consoleOpen) return "console";
  if (dockActive) return "dock";
  return "closed";
}

export const useDevToolsRuntimeStore = create<DevToolsRuntimeState>((set, get) => ({
  consoleOpen: false,
  dockActive: false,
  mode: "closed",
  visualMode: "closed",
  dockSize: preferences.dockSize,
  dockAnchor: preferences.dockAnchor,
  dockPosition: preferences.dockPosition,
  dockDimensions: preferences.dockDimensions,
  expandedSections: preferences.expandedSections,
  lastConsoleTab: preferences.lastConsoleTab,
  simulationPaused: false,
  simulationResetVersion: 0,
  timeScale: 1,
  playerImmortal: false,
  immortalEnemyInstanceIds: [],
  automationTraceEnabled: false,
  eventsEnabled: true,
  eventFilter: preferences.eventFilter,
  consoleTabOrder: normalizeDebugTabOrder(preferences.consoleTabOrder),
  openConsole: () => set({ consoleOpen: true, mode: legacyMode(true, useDevToolsRuntimeStore.getState().dockActive), visualMode: visualMode(true, useDevToolsRuntimeStore.getState().dockActive) }),
  closeConsole: () => set((state) => ({ consoleOpen: false, mode: legacyMode(false, state.dockActive), visualMode: visualMode(false, state.dockActive) })),
  openDock: () => set((state) => ({ dockActive: true, mode: legacyMode(state.consoleOpen, true), visualMode: visualMode(state.consoleOpen, true) })),
  activateDockAndCloseConsole: () => set({ consoleOpen: false, dockActive: true, mode: "dock", visualMode: "dock-only" }),
  closeDock: () => set((state) => ({ dockActive: false, mode: legacyMode(state.consoleOpen, false), visualMode: visualMode(state.consoleOpen, false) })),
  close: () => set({ consoleOpen: false, dockActive: false, mode: "closed", visualMode: "closed" }),
  setDockSize: (dockSize) => set((state) => {
    const dockDimensions = dockSize === "minimized" ? state.dockDimensions : null;
    const next = { ...state, dockSize, dockDimensions };
    persist(next);
    return { dockSize, dockDimensions };
  }),
  setDockAnchor: (dockAnchor) => set((state) => { const next = { ...state, dockAnchor, dockPosition: null }; persist(next); return { dockAnchor, dockPosition: null }; }),
  setDockPosition: (dockPosition) => set((state) => { const next = { ...state, dockPosition }; persist(next); return { dockPosition }; }),
  commitDockGeometry: (dockPosition, dockDimensions) => set((state) => {
    const next = { ...state, dockPosition, dockDimensions };
    persist(next);
    return { dockPosition, dockDimensions };
  }),
  setDockDimensions: (dockDimensions) => set((state) => { const next = { ...state, dockDimensions }; persist(next); return { dockDimensions }; }),
  toggleSection: (section) => set((state) => {
    const expandedSections = state.expandedSections.includes(section)
      ? state.expandedSections.filter((entry) => entry !== section)
      : [...state.expandedSections, section];
    persist({ ...state, expandedSections });
    return { expandedSections };
  }),
  setSimulationPaused: (simulationPaused) => set((state) => ({ simulationPaused, simulationResetVersion: simulationPaused ? state.simulationResetVersion + 1 : state.simulationResetVersion })),
  resetSimulationAccumulator: () => set((state) => ({ simulationResetVersion: state.simulationResetVersion + 1 })),
  setTimeScale: (timeScale) => set({ timeScale: Math.max(DEBUG_MIN_TIME_SCALE, Math.min(DEBUG_MAX_TIME_SCALE, timeScale)) }),
  setPlayerImmortal: (playerImmortal) => set({ playerImmortal }),
  isEnemyImmortal: (instanceId): boolean => get().immortalEnemyInstanceIds.includes(instanceId),
  setEnemyImmortal: (instanceId, enabled) => set((state) => ({ immortalEnemyInstanceIds: enabled
    ? state.immortalEnemyInstanceIds.includes(instanceId) ? state.immortalEnemyInstanceIds : [...state.immortalEnemyInstanceIds, instanceId]
    : state.immortalEnemyInstanceIds.filter((candidate) => candidate !== instanceId) })),
  clearEnemyImmortality: () => set({ immortalEnemyInstanceIds: [] }),
  setAutomationTraceEnabled: (automationTraceEnabled) => set({ automationTraceEnabled }),
  setEventsEnabled: (eventsEnabled) => set({ eventsEnabled }),
  recordAutomationTrace: () => undefined,
  recordEvent: () => undefined,
  clearEvents: () => undefined,
  setEventFilter: (eventFilter) => set((state) => { persist({ ...state, eventFilter }); return { eventFilter }; }),
  setLastConsoleTab: (lastConsoleTab) => set((state) => { const normalized = normalizeDebugTabId(lastConsoleTab) ?? "overview"; persist({ ...state, lastConsoleTab: normalized }); return { lastConsoleTab: normalized }; }),
  setConsoleTabOrder: (order) => set((state) => { const consoleTabOrder = normalizeDebugTabOrder(order); persist({ ...state, consoleTabOrder }); return { consoleTabOrder }; }),
  resetConsoleTabOrder: () => set((state) => { const consoleTabOrder = [...DEFAULT_DEBUG_TAB_ORDER]; persist({ ...state, consoleTabOrder }); return { consoleTabOrder }; }),
}));
