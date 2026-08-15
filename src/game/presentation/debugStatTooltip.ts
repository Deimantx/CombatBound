import type { DebugStatDefinition } from "./debugStatRegistry";
import { formatCombatStatValue } from "./statFormatting";
import type { StatBreakdown, StatContribution } from "./statBreakdown";
import type { TooltipModel } from "./tooltipTypes";

function valueFor(definition: DebugStatDefinition, value: number) {
  if (definition.format === "percent") return `${(value * 100).toFixed(1)}%`;
  return formatCombatStatValue(definition.id, value);
}

export function formatStatContribution(definition: DebugStatDefinition, contribution: StatContribution) {
  if (contribution.operation === "multiply") {
    const multiplier = Math.abs(contribution.before) > 1e-9 ? contribution.after / contribution.before : 1;
    return `×${multiplier.toFixed(2)}`;
  }
  const value = valueFor(definition, Math.abs(contribution.value));
  return contribution.value > 0 ? `+${value}` : `-${value}`;
}

export function buildStatBreakdownTooltip(definition: DebugStatDefinition, breakdown: StatBreakdown): TooltipModel {
  const limit = 9;
  const modifying = breakdown.contributions.filter((entry) => Math.abs(entry.value) > 1e-9);
  const visible = modifying.slice(0, limit);
  const omitted = Math.max(0, modifying.length - visible.length);
  const rows = [{ label: "Final", value: valueFor(definition, breakdown.finalValue), tone: "gold" as const }, ...visible.map((entry) => ({ label: entry.sourceLabel, value: formatStatContribution(definition, entry), tone: entry.value >= 0 ? "green" as const : "red" as const }))];
  const notes = [definition.description, ...(visible.length === 0 ? ["No current modifying sources."] : []), ...(omitted ? [`+ ${omitted} more sources`] : []), "Click for full breakdown."];
  return { id: `debug-stat-tooltip-${definition.id}-${breakdown.mode}`, title: definition.label.toUpperCase(), subtitle: breakdown.mode === "effective" ? "Effective Combat Stat" : "Build Combat Stat", rows, notes };
}
