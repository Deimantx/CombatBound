import type { GlobalCooldownMode } from "../combat/combatTypes";
import type { WeaponProficiencyId } from "../progression/progressionTypes";
import { deepFreeze } from "./freeze";

export interface WeaponSkillDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  proficiencyId: WeaponProficiencyId;
  unlock: {
    proficiencyId: WeaponProficiencyId;
    level: number;
  };
  staminaCost: number;
  cooldownSeconds: number;
  globalCooldown: GlobalCooldownMode;
  targetMode: "selected-enemy";
  damageMultiplier: number;
  accuracyModifier: number;
  canCrit: boolean;
  selfEffectId?: string;
  targetEffectId?: string;
  tags: string[];
}

/**
 * Reference One-Handed Sword kit. These are prototype tuning values; level
 * metadata is authored now but enforcement is controlled centrally by combat
 * balance while the skill set is being tested.
 */
export const weaponSkillDefinitions = deepFreeze<WeaponSkillDefinition[]>([
  {
    id: "weapon-skill.one-handed-sword.swift-cut",
    name: "Swift Cut",
    description:
      "A fast, economical Sword strike with increased Accuracy. Deals 75% weapon damage and gains +15 Accuracy.",
    icon: "sword",
    proficiencyId: "one-handed-sword",
    unlock: { proficiencyId: "one-handed-sword", level: 1 },
    staminaCost: 12,
    cooldownSeconds: 2.5,
    globalCooldown: "standard",
    targetMode: "selected-enemy",
    damageMultiplier: 0.75,
    accuracyModifier: 15,
    canCrit: true,
    tags: ["fast", "accurate", "weapon-skill"],
  },
  {
    id: "weapon-skill.one-handed-sword.precision-thrust",
    name: "Precision Thrust",
    description:
      "A measured thrust aimed at a precise opening. Deals normal weapon damage with a massive +45 Accuracy bonus.",
    icon: "crosshair",
    proficiencyId: "one-handed-sword",
    unlock: { proficiencyId: "one-handed-sword", level: 15 },
    staminaCost: 20,
    cooldownSeconds: 5,
    globalCooldown: "standard",
    targetMode: "selected-enemy",
    damageMultiplier: 1,
    accuracyModifier: 45,
    canCrit: true,
    tags: ["very-high-accuracy", "weapon-skill"],
  },
  {
    id: "weapon-skill.one-handed-sword.flowing-step",
    name: "Flowing Step",
    description:
      "Strike while shifting into a harder-to-read position. Deals 85% weapon damage with +20 Accuracy. A successful hit grants +12 Evasion for 4 seconds.",
    icon: "footprints",
    proficiencyId: "one-handed-sword",
    unlock: { proficiencyId: "one-handed-sword", level: 30 },
    staminaCost: 22,
    cooldownSeconds: 7,
    globalCooldown: "standard",
    targetMode: "selected-enemy",
    damageMultiplier: 0.85,
    accuracyModifier: 20,
    canCrit: true,
    selfEffectId: "effect.flowing-step",
    tags: ["accuracy", "evasion", "weapon-skill"],
  },
  {
    id: "weapon-skill.one-handed-sword.sweeping-cut",
    name: "Sweeping Cut",
    description:
      "Sweep the blade through the selected enemy and nearby opponents. Deals 90% weapon damage to the primary target. Up to two additional enemies take 20% of the primary hit's resolved damage.",
    icon: "swords",
    proficiencyId: "one-handed-sword",
    unlock: { proficiencyId: "one-handed-sword", level: 50 },
    staminaCost: 30,
    cooldownSeconds: 7,
    globalCooldown: "standard",
    targetMode: "selected-enemy",
    damageMultiplier: 0.9,
    accuracyModifier: 10,
    canCrit: true,
    tags: ["weapon-skill"],
  },
  {
    id: "weapon-skill.one-handed-sword.opening-feint",
    name: "Opening Feint",
    description:
      "A deceptive strike that disrupts the target's defensive movement. Deals 70% weapon damage with +30 Accuracy. A successful hit reduces the target's Evasion by 12 for 5 seconds.",
    icon: "target",
    proficiencyId: "one-handed-sword",
    unlock: { proficiencyId: "one-handed-sword", level: 70 },
    staminaCost: 18,
    cooldownSeconds: 6,
    globalCooldown: "standard",
    targetMode: "selected-enemy",
    damageMultiplier: 0.7,
    accuracyModifier: 30,
    canCrit: true,
    targetEffectId: "effect.opening-feint",
    tags: ["setup", "evasion-down", "weapon-skill"],
  },
]);

export const weaponSkillById = Object.fromEntries(
  weaponSkillDefinitions.map((skill) => [skill.id, skill]),
) as Record<string, WeaponSkillDefinition>;
