import type {
  CombatSourceCategory,
  DamageType,
  ModifiableCombatStatKey,
  ModifierOperation,
  StatModifier,
} from "../combat/combatTypes";

export type EnemyTraitId = `trait.${string}`;
export type EnemyTraitRank = 1 | 2 | 3;
export type EnemyTier = "normal" | "elite" | "boss";

export interface EnemyTraitAssignment {
  traitId: EnemyTraitId;
  rank: EnemyTraitRank;
}

export type EnemyTraitCategory =
  | "offense"
  | "ailment"
  | "defense"
  | "survival"
  | "tempo"
  | "anti-crit"
  | "anti-magic"
  | "anti-melee"
  | "hp-threshold"
  | "action-cooldown"
  | "fight-duration"
  | "elite"
  | "boss";

export type EnemyTraitEvent =
  | "combat-start"
  | "time-step"
  | "enemy-normal-attack-resolved"
  | "player-attack-resolved"
  | "enemy-action-resolved"
  | "enemy-damaged"
  | "enemy-damage-dealt"
  | "player-damaged"
  | "enemy-critical-hit-taken"
  | "enemy-critical-hit-dealt"
  | "enemy-successful-block"
  | "enemy-successful-evade"
  | "enemy-normal-attack-missed"
  | "enemy-hp-threshold-crossed"
  | "before-enemy-lethal"
  | "enemy-phase-entered";

export type EnemyTraitCondition =
  | { type: "always" }
  | { type: "self-hp-below" | "self-hp-at-most"; fraction: number }
  | { type: "self-hp-above" | "self-hp-at-least"; fraction: number }
  | { type: "player-hp-below"; fraction: number }
  | { type: "self-hp-above-player" }
  | { type: "elapsed-at-least"; seconds: number }
  | { type: "state-flag"; key: string; value?: boolean }
  | { type: "state-counter-at-least"; key: string; value: number };

export interface TraitStatModifier extends StatModifier {
  stat: ModifiableCombatStatKey;
}

export interface TraitStatModifierMechanic {
  type: "stat-modifier";
  modifiers: readonly TraitStatModifier[];
}

export interface TraitConditionalStatModifierMechanic {
  type: "conditional-stat-modifier";
  condition: EnemyTraitCondition;
  modifiers: readonly TraitStatModifier[];
}

export interface TraitLinearHpScalingMechanic {
  type: "linear-hp-stat-scaling";
  stat: ModifiableCombatStatKey;
  operation: ModifierOperation;
  maxBonus: number;
  fullEffectAtHpFraction: number;
}

export interface TraitDamageModifierMechanic {
  type: "outgoing-damage-modifier" | "incoming-damage-modifier";
  operation: "increased" | "reduced" | "more" | "less";
  value: number;
  condition?: EnemyTraitCondition;
  sourceCategory?: CombatSourceCategory;
  damageType?: DamageType;
  deliveryKind?: "hit" | "damage-over-time";
  stackKey?: string;
}

export interface TraitCriticalDamageResistanceMechanic {
  type: "critical-damage-resistance";
  perStack: number;
  cap: number;
  stackEvent?: "critical-hit-taken";
}

export interface TraitEffectProcMechanic {
  type: "effect-proc";
  event: EnemyTraitEvent;
  effectId: string;
  chance: number;
  stacks?: number;
  source?: "self" | "player";
  condition?: EnemyTraitCondition;
}

export interface TraitTimedStatModifierMechanic {
  type: "timed-stat-modifier";
  event: EnemyTraitEvent;
  durationSeconds: number;
  modifiers: readonly TraitStatModifier[];
  refresh: "refresh" | "replace";
  condition?: EnemyTraitCondition;
  sourceCategory?: CombatSourceCategory;
}

export interface TraitStackStatModifierMechanic {
  type: "stack-stat-modifier";
  event: EnemyTraitEvent;
  maxStacks: number;
  perStack: readonly TraitStatModifier[];
  counterKey?: string;
  activateAfter?: number;
  sourceCategory?: CombatSourceCategory;
}

export interface TraitNextAttackMechanic {
  type: "next-attack-modifier";
  event: EnemyTraitEvent;
  modifiers: readonly TraitStatModifier[];
  condition?: EnemyTraitCondition;
  sourceCategory?: CombatSourceCategory;
  damageMultiplier?: number;
  consumeOn: "successful-normal-attack";
}

export interface TraitProcDamageMechanic {
  type: "proc-damage-modifier";
  event: "enemy-normal-attack-resolved";
  chance: number;
  damageMultiplier: number;
}

export interface TraitThresholdMechanic {
  type: "threshold-heal" | "threshold-barrier" | "threshold-timed-stat-modifier" | "lethal-intercept";
  threshold: number;
  oncePerFight?: boolean;
  healFraction?: number;
  barrierFraction?: number;
  durationSeconds?: number;
  modifiers?: readonly TraitStatModifier[];
  damageBonus?: number;
}

export interface TraitPeriodicHealMechanic {
  type: "periodic-heal";
  maxLifeFractionPerSecond: number;
}

export interface TraitDamageLeechMechanic {
  type: "damage-leech";
  fraction: number;
  sourceEvent: "enemy-damage-dealt";
}

export interface TraitReflectionMechanic {
  type: "damage-reflection";
  sourceCategory: "melee";
  fraction: number;
}

export interface TraitHealingReceivedMechanic {
  type: "healing-received-modifier";
  value: number;
}

export interface TraitActionCooldownMechanic {
  type:
    | "action-cooldown-on-normal-hit"
    | "action-cooldown-on-action-hit"
    | "action-cooldown-on-action-use"
    | "action-cooldown-below-threshold"
    | "action-cooldown-static";
  value: number;
  cap?: number;
  threshold?: number;
}

export interface TraitActionDamageMechanic {
  type: "action-damage-modifier";
  value: number;
}

export interface TraitFightStackMechanic {
  type: "fight-stack";
  intervalSeconds: number;
  maxStacks: number;
  modifiers: readonly TraitStatModifier[];
}

export interface TraitFightStageMechanic {
  type: "fight-stage-damage";
  stages: readonly { afterSeconds: number; value: number }[];
}

export interface TraitEffectPolicyMechanic {
  type: "effect-duration-modifier" | "hard-cc-immunity" | "action-interruption-immunity";
  value?: number;
}

export interface TraitPhaseMechanic {
  type: "phase-stack";
  event: "enemy-phase-entered";
  modifiers: readonly TraitStatModifier[];
}

export type EnemyTraitMechanic =
  | TraitStatModifierMechanic
  | TraitConditionalStatModifierMechanic
  | TraitLinearHpScalingMechanic
  | TraitDamageModifierMechanic
  | TraitCriticalDamageResistanceMechanic
  | TraitEffectProcMechanic
  | TraitTimedStatModifierMechanic
  | TraitStackStatModifierMechanic
  | TraitNextAttackMechanic
  | TraitProcDamageMechanic
  | TraitThresholdMechanic
  | TraitPeriodicHealMechanic
  | TraitDamageLeechMechanic
  | TraitReflectionMechanic
  | TraitHealingReceivedMechanic
  | TraitActionCooldownMechanic
  | TraitActionDamageMechanic
  | TraitFightStackMechanic
  | TraitFightStageMechanic
  | TraitEffectPolicyMechanic
  | TraitPhaseMechanic;

export interface EnemyTraitRankDefinition {
  rank: EnemyTraitRank;
  description: string;
  mechanics: readonly EnemyTraitMechanic[];
}

export interface EnemyTraitDefinition {
  id: EnemyTraitId;
  name: string;
  category: EnemyTraitCategory;
  tags: readonly string[];
  allowedEnemyTiers: readonly EnemyTier[];
  maxRank: EnemyTraitRank;
  ranks: readonly EnemyTraitRankDefinition[];
}

export interface EnemyTraitRuntimeEntry {
  counters: Record<string, number>;
  stacks: Record<string, number>;
  timers: Record<string, number>;
  flags: Record<string, boolean>;
  values: Record<string, number | string | boolean | null>;
}

export interface EnemyTraitRuntimeState {
  elapsedSeconds: number;
  byTraitId: Partial<Record<EnemyTraitId, EnemyTraitRuntimeEntry>>;
}

export const ENEMY_TIERS: readonly EnemyTier[] = ["normal", "elite", "boss"];
export const ENEMY_TRAIT_CATEGORIES: readonly EnemyTraitCategory[] = [
  "offense", "ailment", "defense", "survival", "tempo", "anti-crit",
  "anti-magic", "anti-melee", "hp-threshold", "action-cooldown",
  "fight-duration", "elite", "boss",
];
export const COMBAT_SOURCE_CATEGORIES: readonly CombatSourceCategory[] = [
  "melee", "ranged", "magic", "secondary",
];
