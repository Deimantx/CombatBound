import type { ItemCategory } from "../items";
import { EQUIPMENT_SLOT_IDS } from "../../equipment/equipmentTypes";
import type { ItemAffixDefinition, GlobalItemStatKey, LocalItemModifierTarget } from "../../items/itemModifierTypes";
import type { ItemStats } from "../../items/itemTypes";

export interface ItemAffixValidationResult {
  errors: string[];
  warnings: string[];
}

const validCategories = new Set<ItemCategory>(["weapon", "armor", "accessory", "material", "consumable", "currency"]);
const validKinds = new Set(["prefix", "suffix"]);
const validLocalTargets = new Set<LocalItemModifierTarget>(["physicalDamage", "attackSpeed", "criticalChance", "armour", "evasion"]);
const derivedStatKeys = new Set(["baseDamageMin", "baseDamageMax", "baseAttackTime", "attackInterval", "attacksPerSecond", "castTime", "castsPerSecond"]);
const validGlobalTargets = new Set<GlobalItemStatKey>(Object.keys({
  maxLife: 0, lifeRegenFlat: 0, accuracyRating: 0, evasionRating: 0, armour: 0, attackBlockChance: 0,
  maxAttackBlockChance: 0, additionalPhysicalDamageReduction: 0, spellBlockChance: 0, maxSpellBlockChance: 0,
  spellSuppressionChance: 0, manaRegenFlat: 0, ailmentDurationReduction: 0, elementalAilmentAvoidance: 0,
  physicalAilmentAvoidance: 0, nonDamagingAilmentEffectReduction: 0, increasedDamageTaken: 0, actionSpeed: 0,
  increasedAttackSpeed: 0, increasedCastSpeed: 0, baseCritChance: 0, additionalBaseCritChance: 0,
  criticalStrikeMultiplier: 0, maxStamina: 0, staminaRegen: 0, maxMana: 0, fireResistance: 0,
  coldResistance: 0, lightningResistance: 0, chaosResistance: 0, maxFireResistance: 0, maxColdResistance: 0,
  maxLightningResistance: 0, maxChaosResistance: 0,
} as ItemStats) as GlobalItemStatKey[]);

export function validateItemAffixDefinitions(affixes: readonly ItemAffixDefinition[]): ItemAffixValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  for (const affix of affixes) {
    const affixId = typeof affix?.id === "string" ? affix.id : "<missing>";
    if (!affixId.trim()) errors.push(`${affixId}: affix id must be nonempty`);
    if (ids.has(affixId)) errors.push(`${affixId}: duplicate affix id`);
    ids.add(affixId);
    if (!validKinds.has(affix?.kind)) errors.push(`${affixId}: kind must be prefix or suffix`);
    const appliesTo = affix?.appliesTo;
    const categories = Array.isArray(appliesTo?.categories) ? appliesTo.categories : [];
    const slotKinds = Array.isArray(appliesTo?.slotKinds) ? appliesTo.slotKinds : [];
    if (!categories.length && !slotKinds.length) errors.push(`${affixId}: must define at least one applicability rule`);
    for (const category of categories) if (!validCategories.has(category)) errors.push(`${affixId}: invalid category applicability ${String(category)}`);
    for (const slotKind of slotKinds) if (!EQUIPMENT_SLOT_IDS.some((slot) => slot.replace(/1|2$/, "") === slotKind) && !["ring", "earring"].includes(slotKind)) errors.push(`${affixId}: invalid slot applicability ${String(slotKind)}`);
    if (!Array.isArray(affix?.tiers) || !affix.tiers.length) errors.push(`${affixId}: must define at least one tier`);
    const tierIds = new Set<string>();
    const tierNumbers = new Set<number>();
    for (const tier of Array.isArray(affix?.tiers) ? affix.tiers : []) {
      if (!tier.id?.trim()) errors.push(`${affixId}: tier id must be nonempty`);
      if (tierIds.has(tier.id)) errors.push(`${affix.id}: duplicate tier id ${tier.id}`);
      tierIds.add(tier.id);
      if (!Number.isInteger(tier.tier) || tier.tier <= 0) errors.push(`${affixId}/${tier.id}: tier number must be a positive integer`);
      if (tierNumbers.has(tier.tier)) errors.push(`${affixId}: duplicate tier number ${tier.tier}`);
      tierNumbers.add(tier.tier);
      if (tier.requiredMasteryLevel !== undefined && (!Number.isInteger(tier.requiredMasteryLevel) || tier.requiredMasteryLevel <= 0)) errors.push(`${affixId}/${tier.id}: required mastery must be a positive integer`);
      if (!Array.isArray(tier.modifiers) || !tier.modifiers.length) errors.push(`${affixId}/${tier.id}: must define at least one modifier`);
      const modifierIds = new Set<string>();
      for (const modifier of Array.isArray(tier.modifiers) ? tier.modifiers : []) {
        if (!modifier.id?.trim()) errors.push(`${affixId}/${tier.id}: modifier id must be nonempty`);
        if (modifierIds.has(modifier.id)) errors.push(`${affix.id}/${tier.id}: duplicate modifier id ${modifier.id}`);
        modifierIds.add(modifier.id);
        if (modifier.scope === "local") {
          if (!validLocalTargets.has(modifier.target)) errors.push(`${affixId}/${tier.id}/${modifier.id}: invalid local target`);
          if (modifier.target === "criticalChance") warnings.push(`${affixId}/${tier.id}/${modifier.id}: local critical chance is deferred until weapon crit applicability is canonical`);
        } else if (modifier.scope === "global") {
          if (!validGlobalTargets.has(modifier.stat) || derivedStatKeys.has(modifier.stat)) errors.push(`${affixId}/${tier.id}/${modifier.id}: invalid or derived global target`);
        } else errors.push(`${affixId}/${tier.id}: modifier scope is invalid`);
        const roll = modifier.roll;
        if (!roll || !["integer", "decimal"].includes(roll.valueType)) errors.push(`${affixId}/${tier.id}/${modifier.id}: roll value type is invalid`);
        if (!roll || !Number.isFinite(roll.min) || !Number.isFinite(roll.max) || roll.min > roll.max)
          errors.push(`${affixId}/${tier.id}/${modifier.id}: invalid roll range`);
        if (roll?.valueType === "integer" && (!Number.isInteger(roll.min) || !Number.isInteger(roll.max))) errors.push(`${affixId}/${tier.id}/${modifier.id}: integer rolls require integer bounds`);
        if (roll?.step !== undefined && (!Number.isFinite(roll.step) || roll.step <= 0)) errors.push(`${affixId}/${tier.id}/${modifier.id}: roll step must be positive`);
        if (roll?.step && roll.step > 0 && Number.isFinite(roll.min) && Number.isFinite(roll.max)) {
          const intervals = (roll.max - roll.min) / roll.step;
          if (roll.step > roll.max - roll.min + 1e-9 || Math.abs(intervals - Math.round(intervals)) > 1e-8) errors.push(`${affixId}/${tier.id}/${modifier.id}: roll step does not produce legal values across the range`);
        }
      }
    }
  }
  return { errors, warnings };
}
