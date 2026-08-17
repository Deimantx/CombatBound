import type { EffectDefinition } from "../combat/combatEffectTypes";

export const effectCatalogueCategories = [
  { id: "all", label: "All" },
  { id: "dot", label: "Damage over Time" },
  { id: "harmful", label: "Debuffs & Harmful Status" },
  { id: "offense", label: "Offensive Buffs" },
  { id: "defense", label: "Defensive Buffs" },
  { id: "barriers", label: "Barriers & Wards" },
  { id: "recovery", label: "Recovery / Regeneration" },
  { id: "utility", label: "Utility & Proc Effects" },
] as const;

export type EffectCatalogueCategory = (typeof effectCatalogueCategories)[number]["id"];
export type EffectCategoryNode = { id: Exclude<EffectCatalogueCategory, "all">; label: string; icon: string; effects: EffectDefinition[] };
const effectCategoryDefinitions = effectCatalogueCategories.slice(1) as ReadonlyArray<{ id: Exclude<EffectCatalogueCategory, "all">; label: string }>;

const offensiveStats = new Set(["attackDamage", "accuracyRating", "attackInterval", "criticalStrikeChance", "criticalStrikeMultiplier"]);
const defensiveStats = new Set(["armour", "evasionRating", "blockChance", "blockEffect", "maxLife", "lifeRegenFlat"]);

export function classifyEffect(definition: EffectDefinition): Exclude<EffectCatalogueCategory, "all"> {
  if (definition.kind === "barrier") return "barriers";
  if (definition.periodic?.operation.type === "damage") return "dot";
  if (definition.periodic?.operation.type === "heal") return "recovery";
  if (definition.kind === "debuff" || definition.kind === "status") return "harmful";
  if (definition.kind === "buff" && definition.statModifiers?.some((modifier) => offensiveStats.has(modifier.stat))) return "offense";
  if (definition.kind === "buff" && definition.statModifiers?.some((modifier) => defensiveStats.has(modifier.stat))) return "defense";
  return "utility";
}

export function effectSearchText(definition: EffectDefinition): string {
  return [definition.id, definition.name, definition.description, definition.kind, ...definition.tags, definition.persistence, ...(definition.cleanseTags ?? []), ...(definition.statModifiers ?? []).map((modifier) => modifier.stat), definition.periodic?.operation.type, definition.periodic?.operation.type === "damage" ? definition.periodic.operation.damageType : "", definition.durationSeconds, definition.barrierAmount].join(" ").toLowerCase();
}

export function buildEffectCatalogue(effects: EffectDefinition[]): EffectCategoryNode[] {
  return effectCategoryDefinitions.map((category) => ({ id: category.id, label: category.label, icon: category.id === "dot" ? "spark" : category.id === "barriers" ? "shield" : category.id === "harmful" ? "target" : category.id === "recovery" ? "cross" : category.id === "offense" ? "sword" : category.id === "defense" ? "shield-check" : "rune", effects: effects.filter((effect) => classifyEffect(effect) === category.id) })).filter((category) => category.effects.length > 0);
}
