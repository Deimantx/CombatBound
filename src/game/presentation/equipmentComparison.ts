import { formatCombatStatDelta, formatCombatStatValue, formatDamageRange, getCombatStatDisplaySpec, labelForStatKey } from "./statFormatting";

export interface EquipmentComparisonRow {
  key: string;
  label: string;
  before: string;
  after: string;
  delta?: string;
  tone: "is-positive" | "is-negative" | "";
}

const comparisonKeys = ["accuracyRating", "baseAttackTime", "armour", "evasionRating", "maxLife", "maxStamina", "maxMana", "manaRegenFlat", "staminaRegen", "fireResistance", "coldResistance", "lightningResistance", "chaosResistance"];

function comparisonTone(key: string, delta: number) {
  const direction = getCombatStatDisplaySpec(key)?.comparisonDirection;
  if (!direction || direction === "neutral" || delta === 0) return "";
  return direction === "higher-is-better"
    ? delta > 0 ? "is-positive" : "is-negative"
    : delta < 0 ? "is-positive" : "is-negative";
}

export function buildEquipmentComparisonRows(current: Record<string, number>, preview: Record<string, number>): EquipmentComparisonRow[] {
  const currentMin = Number(current.attackDamageMin ?? 0);
  const currentMax = Number(current.attackDamageMax ?? 0);
  const previewMin = Number(preview.attackDamageMin ?? 0);
  const previewMax = Number(preview.attackDamageMax ?? 0);
  const rangeChanged = Math.abs(currentMin - previewMin) > 1e-9 || Math.abs(currentMax - previewMax) > 1e-9;
  const rows: EquipmentComparisonRow[] = [];
  if (rangeChanged) {
    const averageDelta = ((previewMin + previewMax) - (currentMin + currentMax)) / 2;
    rows.push({
      key: "physicalDamageRange",
      label: "Physical Damage",
      before: formatDamageRange(currentMin, currentMax),
      after: formatDamageRange(previewMin, previewMax),
      delta: formatCombatStatDelta("attackDamage", averageDelta),
      tone: comparisonTone("attackDamage", averageDelta),
    });
  }
  for (const key of comparisonKeys) {
    const before = Number(current[key] ?? 0);
    const after = Number(preview[key] ?? 0);
    const delta = after - before;
    if (Math.abs(delta) < 1e-9) continue;
    rows.push({
      key,
      label: labelForStatKey(key),
      before: formatCombatStatValue(key, before, "comparison"),
      after: formatCombatStatValue(key, after, "comparison"),
      delta: formatCombatStatDelta(key, delta),
      tone: comparisonTone(key, delta),
    });
  }
  return rows;
}
