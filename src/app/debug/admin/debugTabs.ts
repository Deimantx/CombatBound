import type { LucideIcon } from "lucide-react";
import { Bug, Clock3, Crosshair, Heart, Package, Pickaxe, Shield, Sparkles, Swords } from "lucide-react";

export const DEFAULT_DEBUG_TAB_ORDER = [
  "overview",
  "offline-time",
  "player",
  "progression",
  "professions",
  "items",
  "collection",
  "combat",
  "magic-arts",
  "state",
  "scenarios",
  "stats",
  "validation",
  "encounter",
  "save-tools",
] as const;

export type DebugTab = (typeof DEFAULT_DEBUG_TAB_ORDER)[number];

export interface DebugTabDefinition {
  id: DebugTab;
  label: string;
  icon: LucideIcon;
}

export const DEBUG_TAB_DEFINITIONS: DebugTabDefinition[] = [
  { id: "overview", label: "Overview", icon: Bug },
  { id: "offline-time", label: "Offline Time", icon: Clock3 },
  { id: "player", label: "Player", icon: Heart },
  { id: "progression", label: "Progression", icon: Sparkles },
  { id: "professions", label: "Professions", icon: Pickaxe },
  { id: "items", label: "Items", icon: Package },
  { id: "collection", label: "Collection", icon: Crosshair },
  { id: "combat", label: "Combat", icon: Swords },
  { id: "magic-arts", label: "Magic Arts", icon: Sparkles },
  { id: "state", label: "State", icon: Shield },
  { id: "scenarios", label: "Scenarios", icon: Bug },
  { id: "stats", label: "Stats", icon: Sparkles },
  { id: "validation", label: "Validate", icon: Shield },
  { id: "encounter", label: "Encounter", icon: Crosshair },
  { id: "save-tools", label: "Save Tools", icon: Shield },
];

const validTabIds = new Set<string>(DEFAULT_DEBUG_TAB_ORDER);

export function normalizeDebugTabId(input: string | null | undefined): DebugTab | null {
  const mapped = input === "mining" || input === "blacksmithing" ? "professions" : input;
  return mapped && validTabIds.has(mapped) ? mapped as DebugTab : null;
}

export function normalizeDebugTabOrder(input: readonly string[] | null | undefined): DebugTab[] {
  const normalized: DebugTab[] = [];
  for (const id of input ?? []) {
    const mapped = normalizeDebugTabId(id);
    if (mapped && !normalized.includes(mapped)) normalized.push(mapped);
  }
  for (const id of DEFAULT_DEBUG_TAB_ORDER) if (!normalized.includes(id)) normalized.push(id);
  return normalized;
}

export function reorderDebugTabs(order: readonly string[], draggedId: string, targetId: string, placement: "before" | "after"): DebugTab[] {
  const normalized = normalizeDebugTabOrder(order);
  if (draggedId === targetId) return normalized;
  const draggedIndex = normalized.indexOf(draggedId as DebugTab);
  const targetIndex = normalized.indexOf(targetId as DebugTab);
  if (draggedIndex < 0 || targetIndex < 0) return normalized;
  const next = normalized.filter((id) => id !== draggedId);
  const adjustedTargetIndex = next.indexOf(targetId as DebugTab);
  next.splice(adjustedTargetIndex + (placement === "after" ? 1 : 0), 0, draggedId as DebugTab);
  return next;
}
