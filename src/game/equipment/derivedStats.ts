import { combatBalance } from "../combat/combatBalance";
import { techniqueDefinitions } from "../data/techniques";
import { itemById } from "../data/items";
import { normalizeCombatStats } from "../combat/combatStats";
import { applyProficiencyStatModifiers, getActiveGlobalMagicStatModifiers, getActiveProficiencyStatModifiers, getActiveDefensiveEquipmentModifiers } from "../progression/perkProgression";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { perkById } from "../data/proficiencyPerks";
import { getDefensiveEquipmentContext, getResolvedEquippedItems } from "./defensiveEquipment";
import type { CombatStats, TechniqueId, StatModifier, CombatStatContributionCollector, CombatStatKey } from "../combat/combatTypes";
import type { EquipmentState } from "./equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { ItemDefinition } from "../data/items";
import type { ProgressionState, WeaponProficiencyId } from "../progression/progressionTypes";
import type { ItemStats } from "../items/itemTypes";

export interface HunterCombatStats extends CombatStats {
  weaponProficiencyId?: WeaponProficiencyId | null;
}

export function calculateHunterCombatStats(
  equipment: EquipmentState,
  inventory: InventoryState,
  progression: ProgressionState,
  techniques: Record<TechniqueId, boolean>,
  items?: Record<string, ItemDefinition>,
  collector?: CombatStatContributionCollector,
): HunterCombatStats {
  const resolvedItems = items ?? itemById;
  const equippedItems = getResolvedEquippedItems(equipment, inventory, resolvedItems);
  const weapon = equippedItems.find((entry) => entry.definition.equipmentSlotKind === "weapon");
  const weaponStats = weapon?.effectiveStats ?? {};
  const equipmentStats = equippedItems.map((entry) => entry.effectiveStats);
  const total = (key: keyof ItemStats) => equipmentStats.reduce((sum, stats) => sum + (stats[key] ?? 0), 0);
  const weaponDamageMin = weaponStats.baseDamageMin ?? combatBalance.baseAttackDamage;
  const weaponDamageMax = weaponStats.baseDamageMax ?? combatBalance.baseAttackDamage;
  const carefulEvasion = techniques["careful-positioning"] ? techniqueDefinitions["careful-positioning"].evasionRating : 0;
  const base = normalizeCombatStats({
    maxLife: combatBalance.baseMaxLife + total("maxLife"),
    attackDamageMin: weaponDamageMin,
    attackDamageMax: weaponDamageMax,
    accuracyRating: combatBalance.baseAccuracy + total("accuracyRating") + (techniques["heightened-reflexes"] ? techniqueDefinitions["heightened-reflexes"].accuracyRating : 0),
    armour: combatBalance.baseArmour + total("armour"),
    evasionRating: combatBalance.baseEvasion + total("evasionRating") + carefulEvasion,
    baseAttackTime: weaponStats.baseAttackTime ?? combatBalance.baseAttackInterval,
    criticalStrikeChance: combatBalance.baseCriticalStrikeChance + total("criticalStrikeChance") + (weaponStats.criticalStrikeChance ?? 0),
    criticalStrikeMultiplier: combatBalance.baseCriticalStrikeMultiplier + total("criticalStrikeMultiplier"),
    blockChance: combatBalance.baseBlockChance + total("blockChance"),
    blockEffect: combatBalance.baseBlockEffect + total("blockEffect"),
    maxStamina: combatBalance.baseMaxStamina + total("maxStamina"),
    staminaRegen: combatBalance.baseStaminaRegen + total("staminaRegen"),
    maxMana: combatBalance.baseMaxMana + total("maxMana"),
    manaRegenFlat: combatBalance.baseManaRegen + total("manaRegenFlat"),
    lifeRegenFlat: total("lifeRegenFlat"),
    increasedAttackSpeed: total("increasedAttackSpeed"),
    increasedCastSpeed: total("increasedCastSpeed"),
    fireResistance: total("fireResistance"),
    coldResistance: total("coldResistance"),
    lightningResistance: total("lightningResistance"),
    chaosResistance: total("chaosResistance"),
  });

  const canonical = normalizeCombatStats(base as CombatStats & Record<string, unknown>);
  const activeTechniqueCount = Object.values(techniques).filter(Boolean).length;
  const weaponProficiencyId = getEquippedWeaponProficiency(equipment, inventory);
  const defensivePerks = getActiveDefensiveEquipmentModifiers(progression, getDefensiveEquipmentContext(equipment, inventory, resolvedItems), perkById);
  const weaponScopedStats: StatModifier[] = [];
  for (const modifier of defensivePerks.weaponModifiers) {
    if (modifier.modifier === "accuracy") weaponScopedStats.push({ stat: "accuracyRating", operation: "flat", value: modifier.value });
    if (modifier.modifier === "attackSpeed") weaponScopedStats.push({ stat: "moreAttackSpeed", operation: "more", value: modifier.value });
  }
  const withPerks = applyProficiencyStatModifiers(canonical, [
    ...getActiveProficiencyStatModifiers(progression, weaponProficiencyId, perkById, { activeTechniqueCount }),
    ...getActiveGlobalMagicStatModifiers(progression, perkById),
    ...defensivePerks.statModifiers,
    ...weaponScopedStats,
  ]);
  for (const modifier of defensivePerks.resistanceModifiers) {
    const resistance = modifier.damageType;
    if (resistance === "fire") withPerks.fireResistance = (withPerks.fireResistance ?? 0) + modifier.value;
    if (resistance === "cold") withPerks.coldResistance = (withPerks.coldResistance ?? 0) + modifier.value;
    if (resistance === "lightning") withPerks.lightningResistance = (withPerks.lightningResistance ?? 0) + modifier.value;
    if (resistance === "chaos") withPerks.chaosResistance = (withPerks.chaosResistance ?? 0) + modifier.value;
  }
  const stats: HunterCombatStats = {
    ...normalizeCombatStats(withPerks as CombatStats & Record<string, unknown>),
    weaponProficiencyId,
  };
  if (collector) {
    const keys: CombatStatKey[] = ["maxLife", "attackDamage", "accuracyRating", "attackInterval", "armour", "physicalDamageReduction", "evasionRating", "criticalStrikeChance", "criticalStrikeMultiplier", "blockChance", "blockEffect", "maxStamina", "staminaRegen", "maxMana", "manaRegenFlat", "lifeRegenFlat"];
    for (const key of keys) {
      const before = Number((base as unknown as Record<string, unknown>)[key] ?? 0);
      const after = Number((stats as unknown as Record<string, unknown>)[key] ?? 0);
      if (before !== 0) collector.record({ stat: key, sourceType: "base", sourceId: "combat-derived-base", sourceLabel: "Base + equipment", operation: "flat", value: before, before: 0, after: before });
      if (after !== before) collector.record({ stat: key, sourceType: "perk", sourceId: "active-combat-modifiers", sourceLabel: "Perks and active modifiers", operation: "flat", value: after - before, before, after });
    }
  }
  return stats;
}
