import { COMBAT_STAT_EPSILON, formatCombatStatDelta, formatCombatStatValue, formatDamageRange, getCombatStatDisplaySpec, labelForStatKey } from "./statFormatting";
import { COMBAT_STAT_REGISTRY } from "./combatStatRegistry";

export interface EquipmentComparisonRow {
  key: string;
  label: string;
  before: string;
  after: string;
  delta?: string;
  tone: "is-positive" | "is-negative" | "";
  group?: string;
  beforeValue?: number;
  afterValue?: number;
}

const groupOrder: Record<string, number> = { offense: 1, defense: 2, resources: 3, resistances: 4, utility: 5 };

function comparisonTone(key: string, delta: number) {
  const direction = getCombatStatDisplaySpec(key)?.comparisonDirection;
  if (!direction || direction === "neutral" || Math.abs(delta) < COMBAT_STAT_EPSILON) return "";
  return direction === "higher-is-better"
    ? delta > 0 ? "is-positive" : "is-negative"
    : delta < 0 ? "is-positive" : "is-negative";
}

function numberAt(stats: Record<string, number>, key: string) {
  const value = stats[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildDamageRangeRow(current: Record<string, number>, preview: Record<string, number>): EquipmentComparisonRow | undefined {
  const currentMin = numberAt(current, "attackDamageMin");
  const currentMax = numberAt(current, "attackDamageMax");
  const previewMin = numberAt(preview, "attackDamageMin");
  const previewMax = numberAt(preview, "attackDamageMax");
  if (Math.abs(currentMin - previewMin) <= COMBAT_STAT_EPSILON && Math.abs(currentMax - previewMax) <= COMBAT_STAT_EPSILON) return undefined;
  const averageDelta = (previewMin + previewMax - currentMin - currentMax) / 2;
  return {
    key: "physicalDamageRange",
    label: "Physical Damage",
    before: formatDamageRange(currentMin, currentMax),
    after: formatDamageRange(previewMin, previewMax),
    delta: `${averageDelta > 0 ? "+" : averageDelta < 0 ? "−" : ""}${Math.abs(averageDelta).toLocaleString(undefined, { maximumFractionDigits: 2 })} avg`,
    tone: comparisonTone("attackDamage", averageDelta),
    group: "offense",
    beforeValue: (currentMin + currentMax) / 2,
    afterValue: (previewMin + previewMax) / 2,
  };
}

/** Builds every meaningful comparison row from the canonical Combat stat registry. */
export function buildEquipmentComparisonRows(current: Record<string, number>, preview: Record<string, number>): EquipmentComparisonRow[] {
  const rows: EquipmentComparisonRow[] = [];
  const damageRow = buildDamageRangeRow(current, preview);
  if (damageRow) rows.push(damageRow);
  const registryRows = COMBAT_STAT_REGISTRY
    .filter((entry) => entry.equipmentComparison?.visible && entry.id !== "attackDamage")
    .map((entry) => {
      const before = numberAt(current, entry.id);
      const after = numberAt(preview, entry.id);
      const delta = after - before;
      if (Math.abs(delta) <= COMBAT_STAT_EPSILON) return undefined;
      return {
        key: entry.id,
        label: entry.label || labelForStatKey(entry.id),
        before: formatCombatStatValue(entry.id, before, "comparison"),
        after: formatCombatStatValue(entry.id, after, "comparison"),
        delta: formatCombatStatDelta(entry.id, delta),
        tone: comparisonTone(entry.id, delta) as EquipmentComparisonRow["tone"],
        group: entry.equipmentComparison?.group,
        priority: entry.equipmentComparison?.priority ?? 999,
        beforeValue: before,
        afterValue: after,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => (groupOrder[left.group ?? "utility"] ?? 99) - (groupOrder[right.group ?? "utility"] ?? 99) || left.priority - right.priority);
  rows.push(...registryRows);
  return rows;
}
