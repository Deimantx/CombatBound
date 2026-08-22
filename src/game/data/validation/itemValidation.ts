import { equipmentDefinitions, type ItemDefinition } from "../items";
import { COMBAT_ITEM_STAT_KEYS, isKnownCombatItemStatKey } from "../../presentation/statFormatting";
import { EQUIPMENT_SLOT_DEFINITIONS } from "../../equipment/equipmentTypes";

const percentageStatKeys = new Set([
  "criticalStrikeChance", "criticalStrikeMultiplier", "blockChance", "blockEffect", "increasedAttackSpeed", "increasedCastSpeed", "moreAttackSpeed", "moreCastSpeed",
  "fireResistance", "coldResistance", "lightningResistance", "chaosResistance",
]);

export interface ItemValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateItemDefinition(item: ItemDefinition): ItemValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = item.stats ?? {};

  if (item.inventoryMode !== "instance" && item.inventoryMode !== "stackable")
    errors.push(`${item.id}: inventoryMode must be explicitly stackable or instance`);
  if (item.equipmentSlotKind && item.inventoryMode !== "instance")
    errors.push(`${item.id}: equipable items must use instance inventoryMode`);
  if (!item.equipmentSlotKind && item.inventoryMode === "stackable") {
    // Stackables are intentionally non-equipable. Instance-owned non-equipment
    // definitions remain valid for future quest/relic content.
  }

  if (item.equipmentSlotKind && !EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.kind === item.equipmentSlotKind))
    errors.push(`${item.id}: invalid equipment slot kind ${item.equipmentSlotKind}`);
  if (item.equipmentSlotKind && item.requiredHunterRank !== undefined && (!Number.isInteger(item.requiredHunterRank) || item.requiredHunterRank < 1))
    errors.push(`${item.id}: requiredHunterRank must be an integer >= 1`);
  if (item.equipmentSlotKind && item.stats === undefined)
    warnings.push(`${item.id}: equipment item has no stats`);
  if (item.weaponProficiencyId && item.defensiveProficiencyId)
    errors.push(`${item.id}: an item cannot define both weapon and defensive proficiency requirements`);
  if (item.lootContainerId && item.inventoryMode !== "stackable")
    errors.push(`${item.id}: loot containers must be stackable`);
  if (item.lootContainerId && item.purpose !== "loot-container")
    errors.push(`${item.id}: loot containers must use purpose loot-container`);
  if (item.purpose === "loot-container" && !item.lootContainerId)
    errors.push(`${item.id}: loot-container purpose requires lootContainerId`);
  if (item.purpose === "sell-only" && item.lootContainerId)
    errors.push(`${item.id}: sell-only items cannot also be loot containers`);

  const hasDamageMin = stats.baseDamageMin !== undefined;
  const hasDamageMax = stats.baseDamageMax !== undefined;
  if (item.category === "weapon") {
    if (!hasDamageMin || !hasDamageMax)
      errors.push(`${item.id}: weapons must define both baseDamageMin and baseDamageMax`);
    if (stats.baseAttackTime === undefined || !(stats.baseAttackTime > 0))
      errors.push(`${item.id}: weapons must define a positive baseAttackTime`);
  } else if (hasDamageMin || hasDamageMax || stats.baseAttackTime !== undefined) {
    errors.push(`${item.id}: non-weapons cannot define weapon base damage or baseAttackTime`);
  }
  if (hasDamageMin !== hasDamageMax)
    errors.push(`${item.id}: baseDamageMin and baseDamageMax must be authored together`);
  if (hasDamageMin && (!Number.isFinite(stats.baseDamageMin) || stats.baseDamageMin! < 0))
    errors.push(`${item.id}: baseDamageMin must be finite and non-negative`);
  if (hasDamageMax && (!Number.isFinite(stats.baseDamageMax) || stats.baseDamageMax! < 0))
    errors.push(`${item.id}: baseDamageMax must be finite and non-negative`);
  if (hasDamageMin && hasDamageMax && Number.isFinite(stats.baseDamageMin) && Number.isFinite(stats.baseDamageMax) && stats.baseDamageMin! > stats.baseDamageMax!)
    errors.push(`${item.id}: baseDamageMin must be less than or equal to baseDamageMax`);
  if (item.category === "weapon" && stats.baseDamageMin === 0 && stats.baseDamageMax === 0)
    warnings.push(`${item.id}: zero-zero weapon damage should be intentional`);

  for (const [key, value] of Object.entries(stats)) {
    if (!isKnownCombatItemStatKey(key) || !COMBAT_ITEM_STAT_KEYS.includes(key as (typeof COMBAT_ITEM_STAT_KEYS)[number])) {
      errors.push(`${item.id}: unknown item stat key ${key}`);
      continue;
    }
    if (!Number.isFinite(value)) errors.push(`${item.id}: ${key} must be finite`);
    if (key === "baseAttackTime" && (!(value > 0) || item.category !== "weapon"))
      errors.push(`${item.id}: baseAttackTime must be positive and belong to a weapon`);
    if (percentageStatKeys.has(key) && (value < -1 || value > 1))
      errors.push(`${item.id}: ${key} must be between -1 and 1 for prototype percentage semantics`);
  }
  return { errors, warnings };
}

export function validateEquipmentDefinitions(items: readonly ItemDefinition[] = equipmentDefinitions): ItemValidationResult {
  return items.reduce<ItemValidationResult>((result, item) => {
    const next = validateItemDefinition(item);
    result.errors.push(...next.errors);
    result.warnings.push(...next.warnings);
    return result;
  }, { errors: [], warnings: [] });
}
