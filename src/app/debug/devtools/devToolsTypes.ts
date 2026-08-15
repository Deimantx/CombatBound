export type DevToolsVisualMode = "closed" | "console-only" | "dock-only" | "console-with-dock";
/** @deprecated Use consoleOpen/dockActive and DevToolsVisualMode instead. */
export type DevToolsMode = "closed" | "console" | "dock";
export type DockSize = "minimized" | "compact" | "expanded";
export type DockAnchor = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type RngMode = "normal" | "seeded";

export const DEBUG_TIME_SCALES = [0.25, 0.5, 1, 2, 5, 10] as const;
export const DEBUG_MIN_TIME_SCALE = DEBUG_TIME_SCALES[0];
export const DEBUG_MAX_TIME_SCALE = DEBUG_TIME_SCALES[DEBUG_TIME_SCALES.length - 1];

export interface DebugRandomRoll {
  id: number;
  kind: string;
  value: number;
  source: RngMode;
  forced?: "hit" | "miss" | "crit" | "dodge" | "parry" | "block";
  stateAfter?: number;
  at: number;
}

export interface DevToolsPreferences {
  dockSize: DockSize;
  dockAnchor: DockAnchor;
  dockPosition: { x: number; y: number } | null;
  expandedSections: string[];
  lastConsoleTab: string;
  eventFilter: string;
  consoleTabOrder: string[];
}
