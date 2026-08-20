import type { CombatSourceCategory, DamageType } from "../combat/combatTypes";
import type { ActiveEffectInstance } from "../combat/combatEffectTypes";
import type { EnemyTier } from "../enemyTraits/enemyTraitTypes";

export type EnemyCombatAbilityId = `enemy-ability.${string}`;
export type EnemyCombatAbilityTarget = "player" | "self";
export type EnemyCombatAbilityCategory =
  | "melee" | "ranged" | "fire" | "cold" | "lightning" | "chaos"
  | "ailment" | "defensive" | "healing" | "conditional" | "elite" | "boss";

export type EnemyCombatAbilityCondition =
  | { type: "self-hp-below"; fraction: number }
  | { type: "player-hp-below"; fraction: number }
  | { type: "player-has-effect-tag"; tag: string }
  | { type: "player-has-effect-id"; effectId: string }
  | { type: "self-has-effect-id"; effectId: string }
  | { type: "self-missing-effect-id"; effectId: string }
  | { type: "phase"; phaseId: string }
  | { type: "has-next-phase" }
  | { type: "once-per-fight-not-used"; abilityId?: EnemyCombatAbilityId };

export interface EnemyCombatAbilityDamageMechanic {
  type: "damage";
  sourceCategory: Exclude<CombatSourceCategory, "secondary">;
  damageType: DamageType;
  attackDamageMultiplier: number;
  canCrit: boolean;
  accuracyMultiplier?: number;
  flatCriticalChanceBonus?: number;
  armourPenetrationPercent?: number;
  targetBlockEffectMultiplier?: number;
  conditionalMultiplierOverride?: { condition: EnemyCombatAbilityCondition; attackDamageMultiplier: number };
  /** Effects resolved immediately after this hit, and only when this hit lands. */
  onHitEffects?: readonly EnemyCombatAbilityApplyEffectMechanic[];
}

export interface EnemyCombatAbilityApplyEffectMechanic {
  type: "apply-effect";
  effectId: string;
  target: EnemyCombatAbilityTarget;
  chance: number;
  stacks?: number;
  durationMultiplier?: number;
  durationOverrideSeconds?: number;
  magnitudeMultiplier?: number;
  requireSuccessfulHit?: boolean;
}

export interface EnemyCombatAbilityMultiHitMechanic {
  type: "multi-hit";
  hits: number;
  hit: EnemyCombatAbilityDamageMechanic;
  perHitEffects?: readonly EnemyCombatAbilityApplyEffectMechanic[];
}

export type EnemyCombatAbilityMechanic =
  | EnemyCombatAbilityDamageMechanic
  | EnemyCombatAbilityMultiHitMechanic
  | EnemyCombatAbilityApplyEffectMechanic
  | { type: "barrier"; target: "self"; maxHpFraction: number }
  | { type: "heal-self"; maxHpFraction: number }
  | { type: "damage-based-heal"; fraction: number }
  | { type: "advance-phase" }
  | { type: "ability-stat-effect"; effectId: string };

export interface EnemyCombatAbilityDefinition {
  id: EnemyCombatAbilityId;
  name: string;
  description: string;
  category: EnemyCombatAbilityCategory;
  tags: readonly string[];
  allowedEnemyTiers: readonly EnemyTier[];
  target: EnemyCombatAbilityTarget;
  cooldownSeconds: number;
  weight?: number;
  conditions?: readonly EnemyCombatAbilityCondition[];
  mechanics: readonly EnemyCombatAbilityMechanic[];
  usageLimitPerFight?: number;
  draft?: boolean;
}

export interface EnemyAbilityRuntimeState {
  usedThisFight: Partial<Record<EnemyCombatAbilityId, number>>;
}

export interface EnemyCombatAbilityResolution {
  abilityId: EnemyCombatAbilityId;
  sourceEnemyInstanceId: string;
  target: EnemyCombatAbilityTarget;
  successfulHits: number;
  totalHits: number;
  hpDamageDealt: number;
  barrierDamageAbsorbed: number;
  healingDone: number;
  effectsApplied: string[];
}

export interface EnemyAbilityEffectApplication {
  instance: ActiveEffectInstance;
  effectId: string;
}
