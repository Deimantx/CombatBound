import { itemById, type ItemDefinition } from "../data/items";
import { itemAffixById, itemAffixDefinitions } from "../data/itemAffixes";
import type {
  ItemAffixDefinition,
  ItemAffixInstance,
  ItemAffixTierDefinition,
  ItemInstanceValidationResult,
} from "./itemModifierTypes";
import { isItemInstanceId, type ItemInstance } from "./itemTypes";
import { isValidItemQuality, MAX_ITEM_QUALITY } from "./itemQuality";
import { isValidItemUpgradeLevel, MAX_ITEM_UPGRADE_LEVEL } from "./itemUpgradeRules";

export const DEFAULT_MAX_PREFIXES = 3; // [TUNING]
export const DEFAULT_MAX_SUFFIXES = 3; // [TUNING]

function hasApplicableCategory(definition: ItemDefinition, affix: ItemAffixDefinition) {
  return !affix.appliesTo.categories?.length || affix.appliesTo.categories.includes(definition.category);
}

function hasApplicableSlot(definition: ItemDefinition, affix: ItemAffixDefinition) {
  return !affix.appliesTo.slotKinds?.length || (definition.equipmentSlotKind !== undefined && affix.appliesTo.slotKinds.includes(definition.equipmentSlotKind));
}

function modifierAppliesToDefinition(definition: ItemDefinition, modifier: ItemAffixTierDefinition["modifiers"][number]) {
  if (modifier.scope === "global") return true;
  if (modifier.target === "physicalDamage") return definition.stats?.baseDamageMin !== undefined && definition.stats.baseDamageMax !== undefined;
  if (modifier.target === "attackSpeed") return definition.stats?.baseAttackTime !== undefined;
  if (modifier.target === "criticalChance") return definition.stats?.baseCritChance !== undefined;
  if (modifier.target === "armour") return definition.stats?.armour !== undefined;
  if (modifier.target === "evasion") return definition.stats?.evasionRating !== undefined;
  return false;
}

export function isAffixTierApplicable(definition: ItemDefinition, affix: ItemAffixDefinition, tier: ItemAffixTierDefinition) {
  if (!affix.tiers.some((candidate) => candidate.id === tier.id)) return false;
  if (!hasApplicableCategory(definition, affix) || !hasApplicableSlot(definition, affix)) return false;
  return tier.modifiers.every((modifier) => modifierAppliesToDefinition(definition, modifier));
}

/** Catalogue/UI helper: true when at least one authored tier is usable. */
export function isAffixApplicable(definition: ItemDefinition, affix: ItemAffixDefinition) {
  return affix.tiers.some((tier) => isAffixTierApplicable(definition, affix, tier));
}

function validRoll(value: unknown, range: { min: number; max: number; step?: number; valueType: "integer" | "decimal" }) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < range.min - 1e-9 || value > range.max + 1e-9) return false;
  if (range.valueType === "integer" && !Number.isInteger(value)) return false;
  if (range.step && range.step > 0) {
    const steps = (value - range.min) / range.step;
    if (Math.abs(steps - Math.round(steps)) > 1e-8) return false;
  }
  return true;
}

function findTier(affix: ItemAffixDefinition, tierId: string) {
  return affix.tiers.find((tier) => tier.id === tierId);
}

export function validateItemAffixInstance(
  definition: ItemDefinition,
  affixInstance: ItemAffixInstance,
  existingAffixes: ItemAffixInstance[] = [],
  affixes: Record<string, ItemAffixDefinition> = itemAffixById,
): string[] {
  const errors: string[] = [];
  const affix = affixes[affixInstance.affixId];
  if (!affix) return [`Unknown affix ${affixInstance.affixId}`];
  const tier = findTier(affix, affixInstance.tierId);
  if (!tier) return [...errors, `Unknown tier ${affixInstance.tierId} for ${affix.id}`];
  if (!isAffixTierApplicable(definition, affix, tier)) errors.push(`Affix ${affix.id} tier ${tier.id} is not applicable to ${definition.id}`);
  if (existingAffixes.some((entry) => entry.affixId === affix.id)) errors.push(`Duplicate affix ${affix.id}`);
  const modifierIds = new Set(tier.modifiers.map((modifier) => modifier.id));
  for (const key of Object.keys(affixInstance.rolls ?? {})) if (!modifierIds.has(key)) errors.push(`Unknown roll key ${key} for ${affix.id}`);
  for (const modifier of tier.modifiers) {
    const value = affixInstance.rolls?.[modifier.id];
    if (!validRoll(value, modifier.roll)) errors.push(`Invalid roll ${modifier.id} for ${affix.id}`);
  }
  return errors;
}

export function validateItemInstance(
  value: unknown,
  items: Record<string, ItemDefinition> = itemById,
  affixes: Record<string, ItemAffixDefinition> = itemAffixById,
): ItemInstanceValidationResult {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["Instance record is malformed"] };
  const instance = value as Partial<ItemInstance>;
  if (!isItemInstanceId(instance.id) || instance.id !== (value as { id?: unknown }).id) errors.push("Instance id is invalid");
  if (typeof instance.definitionId !== "string") errors.push("Instance definitionId is invalid");
  const definition = typeof instance.definitionId === "string" ? items[instance.definitionId] : undefined;
  if (!definition) errors.push(`Unknown instance definition ${String(instance.definitionId)}`);
  else if (definition.inventoryMode !== "instance") errors.push(`Instance definition ${definition.id} is not instance-owned`);
  if (instance.version !== 2) errors.push("Instance version must be 2");
  if (typeof instance.quality !== "number" || !isValidItemQuality(instance.quality)) errors.push(`Quality must be an integer from ${0} to ${MAX_ITEM_QUALITY}`);
  if (typeof instance.upgradeLevel !== "number" || !isValidItemUpgradeLevel(instance.upgradeLevel)) errors.push(`Upgrade level must be an integer from ${0} to ${MAX_ITEM_UPGRADE_LEVEL}`);
  if (!Array.isArray(instance.affixes)) errors.push("Affixes must be an array");
  if (definition && Array.isArray(instance.affixes)) {
    const prefixes = instance.affixes.filter((affix) => Boolean(affix) && typeof affix === "object" && affixes[(affix as ItemAffixInstance).affixId]?.kind === "prefix").length;
    const suffixes = instance.affixes.filter((affix) => Boolean(affix) && typeof affix === "object" && affixes[(affix as ItemAffixInstance).affixId]?.kind === "suffix").length;
    if (prefixes > DEFAULT_MAX_PREFIXES) errors.push("Prefix capacity exceeded");
    if (suffixes > DEFAULT_MAX_SUFFIXES) errors.push("Suffix capacity exceeded");
    for (let index = 0; index < instance.affixes.length; index += 1) {
      const affix = instance.affixes[index];
      if (!affix || typeof affix !== "object" || Array.isArray(affix) || !affix.rolls || typeof affix.rolls !== "object" || Array.isArray(affix.rolls)) errors.push(`Affix ${index} is malformed`);
      else errors.push(...validateItemAffixInstance(definition, affix, instance.affixes.slice(0, index), affixes));
    }
  }
  return { valid: errors.length === 0, errors };
}

export function getItemAffixTier(affix: ItemAffixDefinition, tierId: string): ItemAffixTierDefinition | undefined {
  return affix.tiers.find((tier) => tier.id === tierId);
}

export { itemAffixDefinitions };
