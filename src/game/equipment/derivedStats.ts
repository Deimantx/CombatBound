import { combatBalance } from "../combat/combatBalance";
import { stanceDefinitions } from "../data/stances";
import { techniqueDefinitions } from "../data/techniques";
import { itemById } from "../data/items";
import { normalizeCombatStats } from "../combat/combatStats";
import { applyProficiencyStatModifiers, getActiveGlobalMagicStatModifiers, getActiveProficiencyStatModifiers, getActiveDefensiveEquipmentModifiers } from "../progression/perkProgression";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { perkById } from "../data/proficiencyPerks";
import { getDefensiveEquipmentContext, getEquippedItems } from "./defensiveEquipment";
import type { CombatStats, StanceId, TechniqueId, StatModifier, CombatStatContributionCollector, CombatStatKey } from "../combat/combatTypes";
import type { EquipmentState } from "./equipmentTypes";
import type { ItemDefinition } from "../data/items";
import type { ProgressionState, WeaponProficiencyId } from "../progression/progressionTypes";

export interface HunterCombatStats extends CombatStats {
  weaponProficiencyId?: WeaponProficiencyId | null;
}

export function calculateHunterCombatStats(
  equipment: EquipmentState,
  progression: ProgressionState,
  stance: StanceId,
  techniques: Record<TechniqueId, boolean>,
  items: Record<string, ItemDefinition> = itemById,
  collector?: CombatStatContributionCollector,
): HunterCombatStats {
  const stanceData = stanceDefinitions[stance];
  const weapon = items[equipment.slots.weapon ?? ""];
  const weaponStats = weapon?.stats ?? {};
  const equippedItems = getEquippedItems(equipment, items);
  const equipmentStats = equippedItems.map((item) => item.stats ?? {});
  const total = (key: keyof NonNullable<ItemDefinition["stats"]>) => equipmentStats.reduce((sum, stats) => sum + (stats[key] ?? 0), 0);
  const weaponDamageMin = weaponStats.baseDamageMin ?? combatBalance.baseAttackDamage;
  const weaponDamageMax = weaponStats.baseDamageMax ?? combatBalance.baseAttackDamage;
  const carefulEvasion = techniques["careful-positioning"] ? techniqueDefinitions["careful-positioning"].evasionRating : 0;
  const base = normalizeCombatStats({
    maxLife: combatBalance.baseMaxLife + total("maxLife"),
    attackDamage: (weaponDamageMin + weaponDamageMax) / 2,
    accuracyRating: combatBalance.baseAccuracy + total("accuracyRating") + (techniques["heightened-reflexes"] ? techniqueDefinitions["heightened-reflexes"].accuracyRating : 0),
    armour: combatBalance.baseArmour + total("armour"),
    additionalPhysicalDamageReduction: total("additionalPhysicalDamageReduction"),
    evasionRating: combatBalance.baseEvasion + total("evasionRating") + carefulEvasion,
    baseAttackTime: weaponStats.baseAttackTime ?? combatBalance.baseAttackInterval,
    baseCritChance: combatBalance.baseCritChance + total("baseCritChance"),
    criticalStrikeMultiplier: combatBalance.baseCritDamage + total("criticalStrikeMultiplier"),
    attackBlockChance: combatBalance.baseAttackBlockChance + total("attackBlockChance"),
    maxStamina: combatBalance.baseMaxStamina + total("maxStamina"),
    staminaRegen: (combatBalance.baseStaminaRegen + total("staminaRegen")) * stanceData.staminaRegenMultiplier,
    maxMana: combatBalance.baseMaxMana + total("maxMana"),
    manaRegenFlat: combatBalance.baseManaRegen + total("manaRegenFlat"),
    lifeRegenFlat: total("lifeRegenFlat"),
    ailmentDurationReduction: total("ailmentDurationReduction"),
    spellSuppressionChance: total("spellSuppressionChance"),
    resistances: {
      fire: total("fireResistance"),
      cold: total("coldResistance"),
      lightning: total("lightningResistance"),
      chaos: total("chaosResistance"),
    },
  });

  const canonical = normalizeCombatStats({
    ...base,
    attackDamage: base.attackDamage * stanceData.damageMultiplier,
    armour: (base.armour ?? 0) * stanceData.armourMultiplier,
    accuracyRating: (base.accuracyRating ?? 0) * stanceData.accuracyMultiplier,
    baseAttackTime: (base.baseAttackTime ?? combatBalance.baseAttackInterval) * stanceData.attackIntervalMultiplier,
    evasionRating: (base.evasionRating ?? 0) + stanceData.evasionRating,
  });
  const activeTechniqueCount = Object.values(techniques).filter(Boolean).length;
  const weaponProficiencyId = getEquippedWeaponProficiency(equipment);
  const defensivePerks = getActiveDefensiveEquipmentModifiers(progression, getDefensiveEquipmentContext(equipment, items), perkById);
  const weaponScopedStats: StatModifier[] = [];
  for (const modifier of defensivePerks.weaponModifiers) {
    if (modifier.modifier === "accuracy") weaponScopedStats.push({ stat: "accuracyRating", operation: "flat", value: modifier.value });
    if (modifier.modifier === "attackInterval") weaponScopedStats.push({ stat: "attackInterval", operation: "increased", value: modifier.value });
  }
  const withPerks = applyProficiencyStatModifiers(canonical, [
    ...getActiveProficiencyStatModifiers(progression, weaponProficiencyId, perkById, { stance, activeTechniqueCount }),
    ...getActiveGlobalMagicStatModifiers(progression, perkById),
    ...defensivePerks.statModifiers,
    ...weaponScopedStats,
  ]);
  for (const modifier of defensivePerks.resistanceModifiers) {
    const resistance = modifier.damageType;
    if (resistance !== "physical" && resistance in withPerks.resistances) withPerks.resistances[resistance as keyof typeof withPerks.resistances] = (withPerks.resistances[resistance as keyof typeof withPerks.resistances] ?? 0) + modifier.value;
  }
  const stats: HunterCombatStats = {
    ...normalizeCombatStats(withPerks as CombatStats & Record<string, unknown>),
    weaponProficiencyId,
  };
  if (collector) {
    const keys: CombatStatKey[] = ["maxLife", "attackDamage", "accuracyRating", "attackInterval", "armour", "evasionRating", "baseCritChance", "criticalStrikeMultiplier", "attackBlockChance", "spellBlockChance", "spellSuppressionChance", "maxStamina", "staminaRegen", "maxMana", "manaRegenFlat", "lifeRegenFlat"];
    for (const key of keys) {
      const before = Number((base as unknown as Record<string, unknown>)[key] ?? 0);
      const after = Number((stats as unknown as Record<string, unknown>)[key] ?? 0);
      if (before !== 0) collector.record({ stat: key, sourceType: "base", sourceId: "combat-derived-base", sourceLabel: "Base + equipment", operation: "flat", value: before, before: 0, after: before });
      if (after !== before) collector.record({ stat: key, sourceType: "perk", sourceId: "active-combat-modifiers", sourceLabel: "Stance and active modifiers", operation: "flat", value: after - before, before, after });
    }
  }
  return stats;
}
