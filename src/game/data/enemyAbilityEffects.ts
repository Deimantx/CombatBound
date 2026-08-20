import type { EffectDefinition } from "../combat/combatEffectTypes";

const buff = (id: string, name: string, description: string, statModifiers: EffectDefinition["statModifiers"], durationSeconds: number | null): EffectDefinition => ({ id, name, description, icon: "sparkles", kind: "buff", tags: ["beneficial", "enemy-ability"], durationSeconds, stacking: { mode: "refresh", maxStacks: 1 }, statModifiers, persistence: "enemy-life", beneficial: true });
const debuff = (id: string, name: string, description: string, statModifiers: EffectDefinition["statModifiers"], durationSeconds: number): EffectDefinition => ({ id, name, description, icon: "skull", kind: "debuff", tags: ["harmful", "enemy-ability"], durationSeconds, stacking: { mode: "refresh", maxStacks: 1 }, statModifiers, persistence: "enemy-life" });

export const enemyAbilityEffectDefinitions: EffectDefinition[] = [
  { id: "effect.enemy-ability-barrier", name: "Barrier", description: "Absorbs incoming damage.", icon: "shield", kind: "barrier", tags: ["beneficial", "barrier", "enemy-ability"], durationSeconds: 30, stacking: { mode: "refresh", maxStacks: 1 }, persistence: "enemy-life", beneficial: true },
  debuff("effect.stunned", "Stunned", "Cannot use combat actions while stunned.", [], 1),
  debuff("effect.enemy-armour-break", "Armour Break", "Armour is reduced.", [{ stat: "armour", operation: "reduced", value: .25 }], 10),
  debuff("effect.enemy-accuracy-break", "Accuracy Break", "Accuracy is reduced.", [{ stat: "accuracyRating", operation: "reduced", value: .25 }], 10),
  debuff("effect.enemy-healing-reduction", "Healing Reduction", "Healing Received is reduced.", [], 10),
  buff("effect.enemy-guard-stance", "Guard Stance", "Armour and Block Chance are increased.", [{ stat: "armour", operation: "increased", value: .5 }, { stat: "blockChance", operation: "flat", value: .1 }], 10),
  buff("effect.enemy-evasive-stance", "Evasive Stance", "Evasion is increased.", [{ stat: "evasionRating", operation: "increased", value: .45 }], 10),
  buff("effect.enemy-battle-cry", "Battle Cry", "Attack damage and accuracy are increased.", [{ stat: "attackDamage", operation: "increased", value: .35 }, { stat: "accuracyRating", operation: "flat", value: 25 }], 12),
  buff("effect.enemy-frenzy", "Frenzy", "Attack speed rises at the cost of Armour.", [{ stat: "increasedAttackSpeed", operation: "increased", value: .4 }, { stat: "armour", operation: "reduced", value: .2 }], 12),
  buff("effect.enemy-stone-skin", "Stone Skin", "Armour is greatly increased.", [{ stat: "armour", operation: "increased", value: 1 }], 10),
  buff("effect.enemy-blood-frenzy", "Blood Frenzy", "Damage and attack speed are increased.", [{ stat: "attackDamage", operation: "increased", value: .5 }, { stat: "increasedAttackSpeed", operation: "increased", value: .3 }], 12),
  buff("effect.enemy-elite-rally", "Elite Rally", "Elite damage and Armour are increased.", [{ stat: "attackDamage", operation: "increased", value: .4 }, { stat: "armour", operation: "increased", value: .4 }], 12),
  buff("effect.enemy-enrage", "Enrage", "Damage and attack speed are increased for the fight.", [{ stat: "attackDamage", operation: "increased", value: .5 }, { stat: "increasedAttackSpeed", operation: "increased", value: .25 }], null),
  buff("effect.enemy-berserk-assault", "Berserk Assault", "Attack speed and damage are increased.", [{ stat: "increasedAttackSpeed", operation: "increased", value: .75 }, { stat: "attackDamage", operation: "increased", value: .25 }], 10),
  { id: "effect.enemy-regeneration", name: "Regeneration", description: "Regenerates health over time.", icon: "heart", kind: "buff", tags: ["beneficial", "enemy-ability", "regeneration"], durationSeconds: 6, stacking: { mode: "refresh", maxStacks: 1 }, periodic: { intervalSeconds: 1, operation: { type: "heal", baseAmount: 0, maxLifeFraction: .03 } }, persistence: "enemy-life", beneficial: true },
  { id: "effect.enemy-elemental-ward", name: "Elemental Ward", description: "Elemental resistances are increased.", icon: "shield", kind: "buff", tags: ["beneficial", "enemy-ability"], durationSeconds: 12, stacking: { mode: "refresh", maxStacks: 1 }, resistanceModifiers: [{ damageType: "fire", operation: "flat", value: .25 }, { damageType: "cold", operation: "flat", value: .25 }, { damageType: "lightning", operation: "flat", value: .25 }, { damageType: "chaos", operation: "flat", value: .25 }], persistence: "enemy-life", beneficial: true },
];

export const enemyAbilityEffectById = Object.fromEntries(enemyAbilityEffectDefinitions.map((effect) => [effect.id, effect]));
