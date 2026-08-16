import { prototypeEquipmentDefinitions, type ItemDefinition } from "../items";
import { COMBAT_ITEM_STAT_KEYS, isKnownCombatItemStatKey } from "../../presentation/statFormatting";
import { EQUIPMENT_SLOT_DEFINITIONS } from "../../equipment/equipmentTypes";

const percentageStatKeys = new Set([
  "baseCritChance", "additionalBaseCritChance", "criticalStrikeMultiplier", "attackBlockChance", "maxAttackBlockChance", "spellBlockChance", "maxSpellBlockChance", "spellSuppressionChance", "ailmentDurationReduction", "elementalAilmentAvoidance", "physicalAilmentAvoidance", "nonDamagingAilmentEffectReduction", "increasedDamageTaken", "actionSpeed", "increasedAttackSpeed", "increasedCastSpeed",
  "fireResistance", "coldResistance", "lightningResistance", "chaosResistance", "maxFireResistance", "maxColdResistance", "maxLightningResistance", "maxChaosResistance", "additionalPhysicalDamageReduction",
]);

export interface ItemValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateItemDefinition(item: ItemDefinition): ItemValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = item.stats ?? {};

  if (item.equipmentSlotKind && !EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.kind === item.equipmentSlotKind))
    errors.push(`${item.id}: invalid equipment slot kind ${item.equipmentSlotKind}`);
  if (item.equipmentSlotKind && item.requiredMasteryLevel !== undefined && (!Number.isInteger(item.requiredMasteryLevel) || item.requiredMasteryLevel < 1))
    errors.push(`${item.id}: requiredMasteryLevel must be an integer >= 1`);
  if (item.equipmentSlotKind && item.stats === undefined)
    warnings.push(`${item.id}: equipment item has no stats`);

  for (const [key, value] of Object.entries(stats)) {
    if (!isKnownCombatItemStatKey(key) || !COMBAT_ITEM_STAT_KEYS.includes(key as (typeof COMBAT_ITEM_STAT_KEYS)[number])) {
      errors.push(`${item.id}: unknown item stat key ${key}`);
      continue;
    }
    if (!Number.isFinite(value)) errors.push(`${item.id}: ${key} must be finite`);
    if (key === "baseAttackTime" && (!(value > 0) || item.equipmentSlotKind !== "weapon"))
      errors.push(`${item.id}: baseAttackTime must be positive and belong to a weapon`);
    if (percentageStatKeys.has(key) && (value < -1 || value > 1))
      errors.push(`${item.id}: ${key} must be between -1 and 1 for prototype percentage semantics`);
  }
  return { errors, warnings };
}

export function validateEquipmentDefinitions(items: readonly ItemDefinition[] = prototypeEquipmentDefinitions): ItemValidationResult {
  return items.reduce<ItemValidationResult>((result, item) => {
    const next = validateItemDefinition(item);
    result.errors.push(...next.errors);
    result.warnings.push(...next.warnings);
    return result;
  }, { errors: [], warnings: [] });
}
