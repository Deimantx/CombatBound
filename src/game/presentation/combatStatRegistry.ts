import type { CombatStatKey } from "../combat/combatTypes";

export type CombatStatRegistryCategory = "offense" | "defense" | "resources" | "resistances";
export type CombatStatRegistryFormat = "number" | "percent" | "seconds" | "per-second";
export type CombatStatSummaryGroup = CombatStatRegistryCategory;

export interface CombatStatRegistryEntry {
  id: CombatStatKey;
  label: string;
  category: CombatStatRegistryCategory;
  format: CombatStatRegistryFormat;
  comparisonDirection: "higher-is-better" | "lower-is-better" | "neutral";
  description: string;
  summaryGroup?: CombatStatSummaryGroup;
}

const stat = (
  id: CombatStatKey,
  label: string,
  category: CombatStatRegistryCategory,
  format: CombatStatRegistryFormat,
  description: string,
  comparisonDirection: CombatStatRegistryEntry["comparisonDirection"] = "higher-is-better",
  summaryGroup?: CombatStatSummaryGroup,
): CombatStatRegistryEntry => ({ id, label, category, format, description, comparisonDirection, summaryGroup });

/** The canonical metadata catalogue for every runtime CombatStatKey. */
export const COMBAT_STAT_REGISTRY: readonly CombatStatRegistryEntry[] = [
  stat("maxLife", "Maximum Life", "resources", "number", "Maximum Life before damage defeats the combatant.", "higher-is-better", "resources"),
  stat("lifeRegenFlat", "Life Regen", "resources", "per-second", "Life recovered per second.", "higher-is-better", "resources"),
  stat("lifeRegenPercent", "Life Regen Percent", "resources", "percent", "Percentage Life recovery per second."),
  stat("lifeRecoveryRate", "Life Recovery Rate", "resources", "percent", "Multiplier applied to Life recovery."),
  stat("maxMana", "Maximum Mana", "resources", "number", "Maximum Mana available for Spells.", "higher-is-better", "resources"),
  stat("manaRegenFlat", "Mana Regen", "resources", "per-second", "Mana recovered per second.", "higher-is-better", "resources"),
  stat("manaRegenPercent", "Mana Regen Percent", "resources", "percent", "Percentage Mana recovery per second."),
  stat("manaRecoveryRate", "Mana Recovery Rate", "resources", "percent", "Multiplier applied to Mana recovery."),
  stat("maxStamina", "Maximum Stamina", "resources", "number", "Maximum Stamina available for combat actions.", "higher-is-better", "resources"),
  stat("staminaRegen", "Stamina Regen", "resources", "per-second", "Stamina recovered per second.", "higher-is-better", "resources"),
  stat("accuracyRating", "Accuracy Rating", "offense", "number", "Accuracy Rating determines Attack hit chance against target Evasion.", "higher-is-better", "offense"),
  stat("baseAttackTime", "Base Attack Time", "offense", "seconds", "Weapon base time before Attack Speed modifiers."),
  stat("increasedAttackSpeed", "Increased Attack Speed", "offense", "percent", "Additive Attack Speed modifier."),
  stat("moreAttackSpeed", "More Attack Speed", "offense", "percent", "Multiplicative Attack Speed modifier."),
  stat("baseCastTime", "Base Cast Time", "offense", "seconds", "Spell base cast time before Cast Speed modifiers."),
  stat("increasedCastSpeed", "Increased Cast Speed", "offense", "percent", "Additive Cast Speed modifier."),
  stat("moreCastSpeed", "More Cast Speed", "offense", "percent", "Multiplicative Cast Speed modifier."),
  stat("actionSpeed", "Action Speed", "offense", "percent", "Shared multiplier for Attack and Cast timing."),
  stat("attackInterval", "Attack Interval", "offense", "seconds", "Seconds between automatic weapon Attacks.", "lower-is-better", "offense"),
  stat("attacksPerSecond", "Attacks per Second", "offense", "number", "Derived automatic Attack rate.", "higher-is-better", "offense"),
  stat("castTime", "Cast Time", "offense", "seconds", "Derived Spell cast time.", "lower-is-better"),
  stat("castsPerSecond", "Casts per Second", "offense", "number", "Derived Spell cast rate.", "higher-is-better"),
  stat("attackDamage", "Attack Damage", "offense", "number", "Average damage used by weapon Attacks.", "higher-is-better", "offense"),
  stat("attackDamageMin", "Minimum Attack Damage", "offense", "number", "Minimum damage in the weapon Attack range."),
  stat("attackDamageMax", "Maximum Attack Damage", "offense", "number", "Maximum damage in the weapon Attack range."),
  stat("baseCritChance", "Base Critical Chance", "offense", "percent", "Intrinsic base chance for an eligible hit to Critically Strike.", "higher-is-better", "offense"),
  stat("additionalBaseCritChance", "Additional Base Critical Chance", "offense", "percent", "Flat Critical Chance added to the weapon or Spell base.", "higher-is-better"),
  stat("increasedCritChance", "Increased Critical Chance", "offense", "percent", "Additive Critical Chance modifier."),
  stat("moreCritChance", "More Critical Chance", "offense", "percent", "Multiplicative Critical Chance modifier."),
  stat("criticalStrikeMultiplier", "Critical Strike Multiplier", "offense", "percent", "Damage multiplier applied by a Critical Strike.", "higher-is-better", "offense"),
  stat("reducedExtraDamageTakenFromCriticalStrikes", "Reduced Extra Critical Damage Taken", "defense", "percent", "Reduces only the bonus portion above a normal hit."),
  stat("armour", "Armour", "defense", "number", "Armour mitigates Physical hit damage based on hit size.", "higher-is-better", "defense"),
  stat("additionalPhysicalDamageReduction", "Additional Physical Damage Reduction", "defense", "percent", "Flat percentage reduction applied to eligible Physical damage.", "higher-is-better", "defense"),
  stat("evasionRating", "Evasion Rating", "defense", "number", "Evasion Rating is opposed by incoming Attack Accuracy.", "higher-is-better", "defense"),
  stat("maxPhysicalDamageReduction", "Maximum Physical Damage Reduction", "defense", "percent", "Maximum combined Armour and Physical reduction."),
  stat("attackBlockChance", "Attack Block Chance", "defense", "percent", "Chance to fully prevent an eligible Attack hit.", "higher-is-better", "defense"),
  stat("spellBlockChance", "Spell Block Chance", "defense", "percent", "Chance to fully prevent an eligible Spell hit.", "higher-is-better", "defense"),
  stat("maxAttackBlockChance", "Maximum Attack Block Chance", "defense", "percent", "Per-stat ceiling for Attack Block Chance.", "higher-is-better"),
  stat("maxSpellBlockChance", "Maximum Spell Block Chance", "defense", "percent", "Per-stat ceiling for Spell Block Chance.", "higher-is-better"),
  stat("spellSuppressionChance", "Spell Suppression Chance", "defense", "percent", "Chance to prevent a portion of eligible Spell hit damage.", "higher-is-better", "defense"),
  stat("suppressedSpellDamagePrevented", "Suppressed Spell Damage Prevented", "defense", "percent", "Damage prevented when Spell Suppression succeeds.", "higher-is-better", "defense"),
  stat("fireResistance", "Fire Resistance", "resistances", "percent", "Reduces Fire damage.", "higher-is-better", "resistances"),
  stat("coldResistance", "Cold Resistance", "resistances", "percent", "Reduces Cold damage.", "higher-is-better", "resistances"),
  stat("lightningResistance", "Lightning Resistance", "resistances", "percent", "Reduces Lightning damage.", "higher-is-better", "resistances"),
  stat("chaosResistance", "Chaos Resistance", "resistances", "percent", "Reduces Chaos damage.", "higher-is-better", "resistances"),
  stat("maxFireResistance", "Maximum Fire Resistance", "resistances", "percent", "Maximum effective Fire Resistance.", "higher-is-better"),
  stat("maxColdResistance", "Maximum Cold Resistance", "resistances", "percent", "Maximum effective Cold Resistance.", "higher-is-better"),
  stat("maxLightningResistance", "Maximum Lightning Resistance", "resistances", "percent", "Maximum effective Lightning Resistance.", "higher-is-better"),
  stat("maxChaosResistance", "Maximum Chaos Resistance", "resistances", "percent", "Maximum effective Chaos Resistance.", "higher-is-better"),
  stat("elementalAilmentAvoidance", "Elemental Ailment Avoidance", "defense", "percent", "Chance to avoid an Elemental Ailment."),
  stat("physicalAilmentAvoidance", "Physical Ailment Avoidance", "defense", "percent", "Chance to avoid a Physical Ailment."),
  stat("ailmentDurationReduction", "Ailment Duration Reduction", "defense", "percent", "Reduces the duration of effects tagged as Ailments."),
  stat("nonDamagingAilmentEffectReduction", "Non-Damaging Ailment Effect Reduction", "defense", "percent", "Reduces the magnitude of snapshot Non-Damaging Ailments."),
  stat("increasedDamageTaken", "Increased Damage Taken", "defense", "percent", "Multiplier applied to damage after normal mitigation.", "lower-is-better"),
];

export const COMBAT_STAT_DEFINITION_BY_ID = Object.fromEntries(
  COMBAT_STAT_REGISTRY.map((entry) => [entry.id, entry]),
) as Record<CombatStatKey, CombatStatRegistryEntry>;
