import type { DevToolsPreferences } from "./devToolsTypes";

export const DEVTOOLS_PREFERENCES_KEY = "combatbound-devtools-ui-v1";

export const defaultDevToolsPreferences: DevToolsPreferences = {
  dockSize: "compact",
  dockAnchor: "bottom-right",
  dockPosition: null,
  expandedSections: ["time", "player"],
  lastConsoleTab: "overview",
  eventFilter: "all",
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
    };
  } catch {
    return { ...defaultDevToolsPreferences };
  }
}

export function writeDevToolsPreferences(preferences: DevToolsPreferences) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEVTOOLS_PREFERENCES_KEY, JSON.stringify(preferences));
}
