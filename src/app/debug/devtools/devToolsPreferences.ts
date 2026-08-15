import type { DevToolsPreferences } from "./devToolsTypes";
import { DEFAULT_DEBUG_TAB_ORDER, normalizeDebugTabOrder } from "../admin/debugTabs";

export const DEVTOOLS_PREFERENCES_KEY = "combatbound-devtools-ui-v1";

export const defaultDevToolsPreferences: DevToolsPreferences = {
  dockSize: "compact",
  dockAnchor: "bottom-right",
  dockPosition: null,
  dockDimensions: null,
  expandedSections: ["time", "player", "enemy"],
  lastConsoleTab: "overview",
  eventFilter: "all",
  consoleTabOrder: [...DEFAULT_DEBUG_TAB_ORDER],
};

export function readDevToolsPreferences(): DevToolsPreferences {
  if (typeof localStorage === "undefined") return { ...defaultDevToolsPreferences };
  try {
    const raw = localStorage.getItem(DEVTOOLS_PREFERENCES_KEY);
    if (!raw) return { ...defaultDevToolsPreferences };
    const value = JSON.parse(raw) as Partial<DevToolsPreferences>;
    return {
      ...defaultDevToolsPreferences,
      ...value,
      expandedSections: Array.isArray(value.expandedSections)
        ? value.expandedSections.filter((entry): entry is string => typeof entry === "string")
        : defaultDevToolsPreferences.expandedSections,
      dockPosition: value.dockPosition && Number.isFinite(value.dockPosition.x) && Number.isFinite(value.dockPosition.y)
        ? { x: value.dockPosition.x, y: value.dockPosition.y }
        : null,
      dockDimensions: value.dockDimensions && Number.isFinite(value.dockDimensions.width) && Number.isFinite(value.dockDimensions.height)
        ? { width: value.dockDimensions.width, height: value.dockDimensions.height }
        : null,
      consoleTabOrder: normalizeDebugTabOrder(value.consoleTabOrder),
    };
  } catch {
    return { ...defaultDevToolsPreferences };
  }
}

export function writeDevToolsPreferences(preferences: DevToolsPreferences) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEVTOOLS_PREFERENCES_KEY, JSON.stringify(preferences));
}
