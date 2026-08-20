import { deepFreeze } from "./freeze";
import type { DamageType } from "../combat/combatTypes";
import type { EnemyCombatAbilityDefinition, EnemyCombatAbilityMechanic, EnemyCombatAbilityDamageMechanic, EnemyCombatAbilityApplyEffectMechanic } from "../enemyAbilities/enemyAbilityTypes";

const general = ["normal", "elite", "boss"] as const;
const elite = ["elite"] as const;
const boss = ["boss"] as const;
const preparationSeconds: Record<string, number> = {
  "heavy-slam": 2.5, "crushing-strike": 2, "savage-bite": 1.2, maul: 1.5, "triple-rend": 2,
  "shield-bash": 1.5, "armour-breaker": 2, "headlong-charge": 3, "execution-blow": 2, groundbreaker: 2.5,
  "charged-shot": 3, "quick-shot": .7, "piercing-shot": 2, "barbed-arrow": 2, "poisoned-arrow": 1.5,
  volley: 2, "sniper-shot": 3, "suppressive-fire": 1.5, "toxic-spit": 1.5, "venom-burst": 2,
  "rending-bite": 1.5, "infectious-wound": 1.8, bloodletting: 1.3, fireball: 2, "flame-burst": 1.7,
  "frost-lance": 1.8, "deep-freeze": 2.5, "lightning-bolt": 1.2, "static-surge": 1.5, "chain-shock": 2,
  "shadow-bolt": 2, "withering-blast": 1.8, "cursed-strike": 1.8, "guard-stance": 1, "evasive-stance": .8,
  "battle-cry": 1, frenzy: .8, "stone-skin": 1.2, "arcane-ward": 1.5, "elemental-ward": 1,
  "mend-wounds": 2.5, "regenerative-roar": 1.5, "blood-feast": 1.8, "desperate-recovery": 2.5,
  "desperate-lunge": 1.8, "blood-frenzy": 1, finisher: 2, "elite-overpower": 3, "elite-rally": 1.2,
  "elite-recovery": 2.5, "elite-barrage": 2.2, "devastating-blow": 4, enrage: 2, "mass-barrier": 2,
  "life-drain": 3, cataclysm: 5, "doom-mark": 2.5, "phase-shift": 0, "berserk-assault": 2,
  "execution-protocol": 3,
};
const damage = (sourceCategory: "melee" | "ranged" | "magic", damageType: DamageType, attackDamageMultiplier: number, extra: Partial<Omit<EnemyCombatAbilityDamageMechanic, "type" | "sourceCategory" | "damageType" | "attackDamageMultiplier">> = {}): EnemyCombatAbilityDamageMechanic => ({ type: "damage", sourceCategory, damageType, attackDamageMultiplier, canCrit: true, ...extra });
const effect = (effectId: string, chance = 1, stacks?: number, target: "player" | "self" = "player", extra: Partial<Omit<EnemyCombatAbilityApplyEffectMechanic, "type" | "effectId" | "chance" | "target" | "stacks">> = {}): EnemyCombatAbilityApplyEffectMechanic => ({ type: "apply-effect", effectId, chance, target, ...(stacks === undefined ? {} : { stacks }), ...extra });
const ability = (id: string, name: string, description: string, category: EnemyCombatAbilityDefinition["category"], target: "player" | "self", cooldownSeconds: number, mechanics: readonly EnemyCombatAbilityMechanic[], options: Partial<Pick<EnemyCombatAbilityDefinition, "conditions" | "weight" | "usageLimitPerFight" | "allowedEnemyTiers" | "tags" | "draft">> = {}): EnemyCombatAbilityDefinition => ({ id: id as `enemy-ability.${string}`, name, description, category, tags: options.tags ?? [category], allowedEnemyTiers: options.allowedEnemyTiers ?? general, target, preparationSeconds: preparationSeconds[id.replace(/^enemy-ability\./, "")] ?? 0, cooldownSeconds, mechanics, ...options });
const multi = (hits: number, hit: EnemyCombatAbilityDamageMechanic, perHitEffects?: readonly EnemyCombatAbilityApplyEffectMechanic[]): EnemyCombatAbilityMechanic => ({ type: "multi-hit", hits, hit, ...(perHitEffects ? { perHitEffects } : {}) });
const hp = (type: "self-hp-below" | "player-hp-below", fraction: number) => ({ type, fraction } as const);

const definitions: EnemyCombatAbilityDefinition[] = [
  ability("enemy-ability.heavy-slam", "Heavy Slam", "A heavy physical blow.", "melee", "player", 10, [damage("melee", "physical", 2)]),
  ability("enemy-ability.crushing-strike", "Crushing Strike", "A physical strike that can Crushed the player.", "melee", "player", 10, [damage("melee", "physical", 1.6), effect("effect.crushed", .5)]),
  ability("enemy-ability.savage-bite", "Savage Bite", "A fast attack with Bleed chance.", "melee", "player", 10, [damage("melee", "physical", 1.4), effect("effect.bleed", .5)]),
  ability("enemy-ability.maul", "Maul", "Two independent physical hits.", "melee", "player", 9, [multi(2, damage("melee", "physical", .85))]),
  ability("enemy-ability.triple-rend", "Triple Rend", "Three physical hits that can each cause Bleed.", "melee", "player", 12, [multi(3, damage("melee", "physical", .55), [effect("effect.bleed", .2)])]),
  ability("enemy-ability.shield-bash", "Shield Bash", "A physical strike that disrupts the player.", "melee", "player", 10, [damage("melee", "physical", 1.2), effect("effect.off-balance")]),
  ability("enemy-ability.armour-breaker", "Armour Breaker", "A strike that temporarily reduces player Armour.", "melee", "player", 11, [damage("melee", "physical", 1.3), effect("effect.enemy-armour-break", 1)]),
  ability("enemy-ability.headlong-charge", "Headlong Charge", "An immediate charge that can Stun.", "melee", "player", 12, [damage("melee", "physical", 2.4), effect("effect.stunned", 1, undefined, "player", { durationOverrideSeconds: 1 })]),
  ability("enemy-ability.execution-blow", "Execution Blow", "A stronger blow against a low-health player.", "conditional", "player", 12, [damage("melee", "physical", 1.5, { conditionalMultiplierOverride: { condition: hp("player-hp-below", .3), attackDamageMultiplier: 2.5 } })]),
  ability("enemy-ability.groundbreaker", "Groundbreaker", "A heavy attack that is less affected by Block Effect.", "melee", "player", 11, [damage("melee", "physical", 1.8, { targetBlockEffectMultiplier: .5 })]),
  ability("enemy-ability.charged-shot", "Charged Shot", "A ranged shot with high damage.", "ranged", "player", 10, [damage("ranged", "physical", 2.2)]),
  ability("enemy-ability.quick-shot", "Quick Shot", "A fast ranged attack.", "ranged", "player", 6, [damage("ranged", "physical", 1.2)]),
  ability("enemy-ability.piercing-shot", "Piercing Shot", "A ranged attack that penetrates Armour.", "ranged", "player", 9, [damage("ranged", "physical", 1.7, { armourPenetrationPercent: .35 })]),
  ability("enemy-ability.barbed-arrow", "Barbed Arrow", "A ranged attack with Bleed.", "ranged", "player", 8, [damage("ranged", "physical", 1.3), effect("effect.bleed", .6)]),
  ability("enemy-ability.poisoned-arrow", "Poisoned Arrow", "A ranged attack with Poison.", "ranged", "player", 8, [damage("ranged", "physical", 1.2), effect("effect.poison", .75)]),
  ability("enemy-ability.volley", "Volley", "Four independent ranged hits.", "ranged", "player", 11, [multi(4, damage("ranged", "physical", .45))]),
  ability("enemy-ability.sniper-shot", "Sniper Shot", "A precise ranged burst.", "ranged", "player", 13, [damage("ranged", "physical", 2.2, { accuracyMultiplier: 1.75, flatCriticalChanceBonus: .25 })]),
  ability("enemy-ability.suppressive-fire", "Suppressive Fire", "A ranged attack that reduces player Accuracy.", "ranged", "player", 10, [damage("ranged", "physical", 1.1), effect("effect.enemy-accuracy-break", 1)]),
  ability("enemy-ability.toxic-spit", "Toxic Spit", "A Chaos attack with Poison.", "chaos", "player", 8, [damage("magic", "chaos", 1.3), effect("effect.poison", .8)]),
  ability("enemy-ability.venom-burst", "Venom Burst", "A Chaos hit that applies two Poison stacks.", "chaos", "player", 11, [damage("magic", "chaos", .9), effect("effect.poison", 1, 2)]),
  ability("enemy-ability.rending-bite", "Rending Bite", "Deals more damage to Bleeding players.", "ailment", "player", 9, [damage("melee", "physical", 1.4, { conditionalMultiplierOverride: { condition: { type: "player-has-effect-tag", tag: "bleed" }, attackDamageMultiplier: 2.1 } })]),
  ability("enemy-ability.infectious-wound", "Infectious Wound", "A hit that reduces Healing Received.", "ailment", "player", 12, [damage("melee", "physical", 1.2), effect("effect.enemy-healing-reduction", 1)]),
  ability("enemy-ability.bloodletting", "Bloodletting", "A smaller hit with guaranteed Bleed.", "ailment", "player", 7, [damage("melee", "physical", 1), effect("effect.bleed")]),
  ability("enemy-ability.fireball", "Fireball", "A Fire attack.", "fire", "player", 9, [damage("magic", "fire", 1.7)]),
  ability("enemy-ability.flame-burst", "Flame Burst", "A Fire hit with Ignite.", "fire", "player", 9, [damage("magic", "fire", 1.4), effect("effect.ignite", .6)]),
  ability("enemy-ability.frost-lance", "Frost Lance", "A Cold attack with Chill.", "cold", "player", 8, [damage("magic", "cold", 1.5), effect("effect.chilled", .75)]),
  ability("enemy-ability.deep-freeze", "Deep Freeze", "A Cold attack with canonical Chill; stronger Chill magnitude remains content-open.", "cold", "player", 12, [damage("magic", "cold", .9), effect("effect.chilled", 1, undefined, "player", { durationOverrideSeconds: 5 })], { tags: ["cold", "content-open"] }),
  ability("enemy-ability.lightning-bolt", "Lightning Bolt", "A precise Lightning attack.", "lightning", "player", 8, [damage("magic", "lightning", 1.6, { accuracyMultiplier: 1.35 })]),
  ability("enemy-ability.static-surge", "Static Surge", "A Lightning hit with Shock.", "lightning", "player", 9, [damage("magic", "lightning", 1.3), effect("effect.shocked", .7)]),
  ability("enemy-ability.chain-shock", "Chain Shock", "Three independent Lightning hits.", "lightning", "player", 11, [multi(3, damage("magic", "lightning", .65))]),
  ability("enemy-ability.shadow-bolt", "Shadow Bolt", "A Chaos projectile.", "chaos", "player", 9, [damage("magic", "chaos", 1.7)]),
  ability("enemy-ability.withering-blast", "Withering Blast", "A Chaos hit with Withered.", "chaos", "player", 10, [damage("magic", "chaos", 1.3), effect("effect.withered", .75)]),
  ability("enemy-ability.cursed-strike", "Cursed Strike", "A hit with Cursed.", "ailment", "player", 10, [damage("melee", "physical", 1.4), effect("effect.cursed", 1, undefined, "player", { durationOverrideSeconds: 6 })]),
  ability("enemy-ability.guard-stance", "Guard Stance", "Temporarily increases Armour and Block Chance.", "defensive", "self", 20, [{ type: "ability-stat-effect", effectId: "effect.enemy-guard-stance" }]),
  ability("enemy-ability.evasive-stance", "Evasive Stance", "Temporarily increases Evasion.", "defensive", "self", 20, [{ type: "ability-stat-effect", effectId: "effect.enemy-evasive-stance" }]),
  ability("enemy-ability.battle-cry", "Battle Cry", "Temporarily increases Damage and Accuracy.", "defensive", "self", 18, [{ type: "ability-stat-effect", effectId: "effect.enemy-battle-cry" }]),
  ability("enemy-ability.frenzy", "Frenzy", "Temporarily increases Attack Speed at the cost of Armour.", "defensive", "self", 18, [{ type: "ability-stat-effect", effectId: "effect.enemy-frenzy" }]),
  ability("enemy-ability.stone-skin", "Stone Skin", "Temporarily increases Armour.", "defensive", "self", 18, [{ type: "ability-stat-effect", effectId: "effect.enemy-stone-skin" }]),
  ability("enemy-ability.arcane-ward", "Arcane Ward", "Gains a Barrier based on Max HP.", "defensive", "self", 18, [{ type: "barrier", target: "self", maxHpFraction: .25 }]),
  ability("enemy-ability.elemental-ward", "Elemental Ward", "Temporarily increases elemental Resistances.", "defensive", "self", 18, [{ type: "ability-stat-effect", effectId: "effect.enemy-elemental-ward" }]),
  ability("enemy-ability.mend-wounds", "Mend Wounds", "Restores 20% Max HP.", "healing", "self", 18, [{ type: "heal-self", maxHpFraction: .2 }]),
  ability("enemy-ability.regenerative-roar", "Regenerative Roar", "Regenerates 3% Max HP per second for 6 seconds.", "healing", "self", 20, [effect("effect.enemy-regeneration", 1, undefined, "self")]),
  ability("enemy-ability.blood-feast", "Blood Feast", "Deals damage and heals for 50% of actual HP damage.", "healing", "player", 12, [damage("melee", "physical", 1.7), { type: "damage-based-heal", fraction: .5 }]),
  ability("enemy-ability.desperate-recovery", "Desperate Recovery", "Restores 25% Max HP while below 35% HP.", "conditional", "self", 24, [{ type: "heal-self", maxHpFraction: .25 }], { conditions: [hp("self-hp-below", .35)] }),
  ability("enemy-ability.desperate-lunge", "Desperate Lunge", "A powerful attack available below 40% HP.", "conditional", "player", 10, [damage("melee", "physical", 2.5)], { conditions: [hp("self-hp-below", .4)] }),
  ability("enemy-ability.blood-frenzy", "Blood Frenzy", "A low-health aggressive self-buff.", "conditional", "self", 20, [{ type: "ability-stat-effect", effectId: "effect.enemy-blood-frenzy" }], { conditions: [hp("self-hp-below", .35)] }),
  ability("enemy-ability.finisher", "Finisher", "A powerful attack against a low-health player.", "conditional", "player", 12, [damage("melee", "physical", 2.8)], { conditions: [hp("player-hp-below", .35)] }),
  ability("enemy-ability.elite-overpower", "Elite Overpower", "A powerful Elite burst attack.", "elite", "player", 14, [damage("melee", "physical", 3)], { allowedEnemyTiers: elite }),
  ability("enemy-ability.elite-rally", "Elite Rally", "An Elite self-buff.", "elite", "self", 20, [{ type: "ability-stat-effect", effectId: "effect.enemy-elite-rally" }], { allowedEnemyTiers: elite }),
  ability("enemy-ability.elite-recovery", "Elite Recovery", "Restores 30% Max HP.", "elite", "self", 25, [{ type: "heal-self", maxHpFraction: .3 }], { allowedEnemyTiers: elite }),
  ability("enemy-ability.elite-barrage", "Elite Barrage", "Four powerful independent hits.", "elite", "player", 14, [multi(4, damage("ranged", "physical", .75))], { allowedEnemyTiers: elite }),
  ability("enemy-ability.devastating-blow", "Devastating Blow", "A devastating Boss attack.", "boss", "player", 15, [damage("melee", "physical", 4)], { allowedEnemyTiers: boss }),
  ability("enemy-ability.enrage", "Enrage", "A Boss self-buff lasting for the fight.", "boss", "self", 0, [{ type: "ability-stat-effect", effectId: "effect.enemy-enrage" }], { allowedEnemyTiers: boss, usageLimitPerFight: 1 }),
  ability("enemy-ability.mass-barrier", "Mass Barrier", "Gains a Barrier based on Max HP.", "boss", "self", 25, [{ type: "barrier", target: "self", maxHpFraction: .3 }], { allowedEnemyTiers: boss }),
  ability("enemy-ability.life-drain", "Life Drain", "A Chaos hit that heals for 50% of actual HP damage.", "boss", "player", 15, [damage("magic", "chaos", 2.5), { type: "damage-based-heal", fraction: .5 }], { allowedEnemyTiers: general }),
  ability("enemy-ability.cataclysm", "Cataclysm", "Elemental damage type is intentionally unresolved by the authored content.", "boss", "player", 25, [], { allowedEnemyTiers: boss, draft: true, tags: ["boss", "content-open"] }),
  ability("enemy-ability.doom-mark", "Doom Mark", "Doom effect mechanics are intentionally unresolved by the authored content.", "boss", "player", 20, [], { allowedEnemyTiers: boss, draft: true, tags: ["boss", "content-open"] }),
  ability("enemy-ability.phase-shift", "Phase Shift", "Advances to the next authored enemy phase.", "boss", "self", 0, [{ type: "advance-phase" }], { allowedEnemyTiers: boss, conditions: [{ type: "has-next-phase" }] }),
  ability("enemy-ability.berserk-assault", "Berserk Assault", "A short aggressive Boss buff.", "boss", "self", 25, [{ type: "ability-stat-effect", effectId: "effect.enemy-berserk-assault" }], { allowedEnemyTiers: boss }),
  ability("enemy-ability.execution-protocol", "Execution Protocol", "A Boss finisher against a low-health player.", "boss", "player", 18, [damage("melee", "physical", 4)], { allowedEnemyTiers: boss, conditions: [hp("player-hp-below", .25)] }),
];

export const enemyCombatAbilityDefinitions = deepFreeze<EnemyCombatAbilityDefinition[]>(definitions);
export const enemyCombatAbilityById = Object.fromEntries(definitions.map((definition) => [definition.id, definition])) as Record<`enemy-ability.${string}`, EnemyCombatAbilityDefinition>;
