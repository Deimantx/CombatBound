export type DevToolsVisualMode = "closed" | "console-only" | "dock-only" | "console-with-dock";
/** @deprecated Use consoleOpen/dockActive and DevToolsVisualMode instead. */
export type DevToolsMode = "closed" | "console" | "dock";
export type DockSize = "minimized" | "compact" | "expanded";
export type DockAnchor = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface DockDimensions {
  width: number;
  height: number;
}

export const DEBUG_DOCK_MIN_WIDTH = 300;
export const DEBUG_DOCK_MIN_HEIGHT = 220;
export const DEBUG_DOCK_VIEWPORT_MARGIN = 12;

export const DEBUG_TIME_SCALES = [0.25, 0.5, 1, 2, 5, 10] as const;
export const DEBUG_MIN_TIME_SCALE = DEBUG_TIME_SCALES[0];
export const DEBUG_MAX_TIME_SCALE = DEBUG_TIME_SCALES[DEBUG_TIME_SCALES.length - 1];

export interface DevToolsPreferences {
  dockSize: DockSize;
  dockAnchor: DockAnchor;
  dockPosition: { x: number; y: number } | null;
  dockDimensions: DockDimensions | null;
  expandedSections: string[];
  lastConsoleTab: string;
  eventFilter: string;
  consoleTabOrder: string[];
}
