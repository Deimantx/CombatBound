import type { GameSaveV16 } from "./saveTypes";
import type { LegacyItemInstanceV2 } from "./saveTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Structural V15/V12 parser. It intentionally knows nothing about affix gameplay. */
export function isLegacyItemInstanceV2(value: unknown): value is LegacyItemInstanceV2 {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && /^item-instance-\d+$/.test(value.id) && typeof value.definitionId === "string" && value.version === 2 && Array.isArray(value.affixes);
}

/** Frozen V16 item boundary: v3 nodes, before single-branch exclusivity. */
export function isItemInstanceV16(value: unknown): value is GameSaveV16["inventory"]["instances"][string] {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && /^item-instance-\d+$/.test(value.id) && typeof value.definitionId === "string" && value.version === 3 && Array.isArray(value.unlockedUpgradeNodeIds) && value.unlockedUpgradeNodeIds.every((nodeId) => typeof nodeId === "string");
}
