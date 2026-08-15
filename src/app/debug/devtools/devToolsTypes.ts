export type DevToolsMode = "closed" | "console" | "dock";
export type DockSize = "minimized" | "compact" | "expanded";
export type DockAnchor = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type RngMode = "normal" | "seeded";

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
}
