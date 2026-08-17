import type { ResolvedItemInstance } from "../items/itemTypes";
import { itemModifierDisplays } from "./itemPresentation";
import {
  COMBAT_STAT_EPSILON,
  formatCombatStatDelta,
  formatItemStatsWithKeys,
  getCombatStatDisplaySpec,
} from "./statFormatting";

export interface EquipmentItemDifferenceRow {
  key: string;
  label: string;
  current?: string;
  candidate?: string;
  delta?: string;
  tone: "is-positive" | "is-negative" | "is-neutral";
}

function toneForDelta(key: string, delta: number): EquipmentItemDifferenceRow["tone"] {
  if (key === "quality" || key === "upgrade") return delta > 0 ? "is-positive" : delta < 0 ? "is-negative" : "is-neutral";
  const direction = getCombatStatDisplaySpec(key)?.comparisonDirection;
  if (!direction || direction === "neutral" || Math.abs(delta) <= COMBAT_STAT_EPSILON) return "is-neutral";
  const positive = direction === "lower-is-better" ? delta < 0 : delta > 0;
  return positive ? "is-positive" : "is-negative";
}

function addValueRows(current: ResolvedItemInstance | undefined, candidate: ResolvedItemInstance | undefined) {
  const currentRows = current ? formatItemStatsWithKeys(current.effectiveStats) : [];
  const candidateRows = candidate ? formatItemStatsWithKeys(candidate.effectiveStats) : [];
  const byKey = new Map<string, { current?: (typeof currentRows)[number]; candidate?: (typeof candidateRows)[number] }>();
  currentRows.forEach((row) => byKey.set(row.key, { ...(byKey.get(row.key) ?? {}), current: row }));
  candidateRows.forEach((row) => byKey.set(row.key, { ...(byKey.get(row.key) ?? {}), candidate: row }));

  return [...byKey.entries()].flatMap(([key, values]) => {
    const currentValue = values.current?.numericValue ?? 0;
    const candidateValue = values.candidate?.numericValue ?? 0;
    const delta = candidateValue - currentValue;
    if (Math.abs(delta) <= COMBAT_STAT_EPSILON) return [];
    return [{
      key,
      label: values.current?.label ?? values.candidate?.label ?? key,
      current: values.current?.value ?? "—",
      candidate: values.candidate?.value ?? "—",
      delta: formatCombatStatDelta(key, delta),
      tone: toneForDelta(key, delta),
    } satisfies EquipmentItemDifferenceRow];
  });
}

function addModifierValueRows(current: ResolvedItemInstance | undefined, candidate: ResolvedItemInstance | undefined) {
  const currentQuality = current?.instance.quality ?? 0;
  const candidateQuality = candidate?.instance.quality ?? 0;
  const currentUpgrade = current?.instance.upgradeLevel ?? 0;
  const candidateUpgrade = candidate?.instance.upgradeLevel ?? 0;
  const rows: EquipmentItemDifferenceRow[] = [];
  if (currentQuality !== candidateQuality) rows.push({ key: "quality", label: "Quality", current: currentQuality ? `${currentQuality}%` : "—", candidate: candidateQuality ? `${candidateQuality}%` : "—", delta: `${candidateQuality - currentQuality > 0 ? "+" : ""}${candidateQuality - currentQuality}%`, tone: toneForDelta("quality", candidateQuality - currentQuality) });
  if (currentUpgrade !== candidateUpgrade) rows.push({ key: "upgrade", label: "Upgrade", current: currentUpgrade ? `+${currentUpgrade}` : "—", candidate: candidateUpgrade ? `+${candidateUpgrade}` : "—", delta: `${candidateUpgrade - currentUpgrade > 0 ? "+" : ""}${candidateUpgrade - currentUpgrade}`, tone: toneForDelta("upgrade", candidateUpgrade - currentUpgrade) });
  return rows;
}

export function buildEquipmentItemDifferenceRows(current: ResolvedItemInstance | undefined, candidate: ResolvedItemInstance | undefined) {
  if (!candidate) return [];
  return [...addValueRows(current, candidate), ...addModifierValueRows(current, candidate)];
}

export function buildEquipmentItemModifierRows(current: ResolvedItemInstance | undefined, candidate: ResolvedItemInstance | undefined) {
  return [
    ...(current ? itemModifierDisplays(current).map((modifier) => ({ side: "current" as const, itemId: current.instance.id, ...modifier })) : []),
    ...(candidate ? itemModifierDisplays(candidate).map((modifier) => ({ side: "candidate" as const, itemId: candidate.instance.id, ...modifier })) : []),
  ];
}
