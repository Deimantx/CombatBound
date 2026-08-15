export type CombatPhase =
  "inactive" | "active" | "recovery" | "defeat" | "stopped";
export type CombatStopReason =
  | "manual"
  | "defeat"
  | "safety"
  | "consumablesDepleted"
  | "victoryLimit"
  | "completed";
export type StanceId = "high" | "mid" | "low";
export type TechniqueId = "careful-positioning" | "heightened-reflexes";
export type SpellTargetMode = "self" | "selectedEnemy" | "allEnemies";
export type DamageType =
  | "physical"
  | "fire"
  | "water"
  | "air"
  | "earth"
  | "light"
  | "darkness"
  | "nature"
  | "mystic"
  | "true";
export type PlayerActionKind =
  "basic-attack" | "spell" | "defensive" | "consumable" | "weapon-skill";
export type PlayerActionTargetMode = "self" | "selected-enemy";
export type GlobalCooldownMode = "standard" | "none" | number;
import type { ItemDefinition } from "../data/items";

export type CombatantRef =
  { kind: "player" } | { kind: "enemy"; instanceId: string };

export type CombatStatKey =
  | "maxHealth"
  | "attackPower"
  | "accuracy"
  | "attackInterval"
  | "armor"
  | "evasion"
  | "critChance"
  | "critDamage"
  | "dodgeChance"
  | "parryChance"
  | "blockChance"
  | "blockPower"
  | "maxStamina"
  | "staminaRegen"
  | "maxMana"
  | "manaRegen"
  | "statusResistance"
  | "healthRegen";

export interface CombatStats {
  maxHealth: number;
  attackPower: number;
  accuracy: number;
  attackInterval: number;
  armor: number;
  evasion: number;
  critChance: number;
  critDamage: number;
  dodgeChance: number;
  parryChance: number;
  blockChance: number;
  blockPower: number;
  maxStamina: number;
  staminaRegen: number;
  maxMana: number;
  manaRegen: number;
  statusResistance: number;
  healthRegen?: number;
  resistances: Partial<Record<DamageType, number>>;
}

export interface StatModifier {
  stat: CombatStatKey;
  operation: "flat" | "addPercent" | "multiply";
  value: number;
}

export interface CombatStatContribution {
  stat: CombatStatKey | `resistance:${Exclude<DamageType, "true">}`;
  sourceType: "base" | "equipment" | "perk" | "stance" | "technique" | "effect" | "other";
  sourceId: string;
  sourceLabel: string;
  operation: "flat" | "addPercent" | "multiply";
  value: number;
  before: number;
  after: number;
}

export interface CombatStatContributionCollector {
  record: (contribution: CombatStatContribution) => void;
}

export interface DefensiveEligibility {
  canMiss?: boolean;
  dodgeable: boolean;
  parryable: boolean;
  blockable: boolean;
}

export interface DamageComponent {
  damageType: DamageType;
  scaling?: { sourceStat: "attackPower"; multiplier: number };
  flatDamage?: number;
  minMultiplier?: number;
  maxMultiplier?: number;
  minDamage?: number;
  maxDamage?: number;
  canCrit: boolean;
  ignoresArmor?: boolean;
  ignoresResistance?: boolean;
  ignoresBarrier?: boolean;
}

export interface PlayerActionDefinition {
  id: string;
  kind: PlayerActionKind;
  name: string;
  description: string;
  icon?: string;
  targetMode: PlayerActionTargetMode;
  cooldown: number;
  globalCooldown: GlobalCooldownMode;
  resourceCost?: { mana?: number; stamina?: number };
  requirements?: {
    requiresShield?: boolean;
    minimumLightMediumArmorPieces?: number;
    minimumHeavyArmorPieces?: number;
  };
  sourceSpellId?: string;
  sourceItemId?: string;
  sourceWeaponSkillId?: string;
}

export type ActionValidationReason =
  | "combat-inactive"
  | "global-cooldown"
  | "action-cooldown"
  | "insufficient-mana"
  | "insufficient-stamina"
  | "no-target"
  | "target-defeated"
  | "spell-not-known"
  | "spell-not-equipped"
  | "ability-not-equipped"
  | "weapon-requirement"
  | "proficiency-level-requirement"
  | "equipment-requirement"
  | "no-interruptible-action"
  | "full-health"
  | "consumable-missing";

import type {
  CombatProficiencyId,
  MagicProficiencyId,
} from "../progression/progressionTypes";

export type DamageProgressionSource =
  | { type: "equippedWeapon"; proficiencyEligible: boolean }
  | {
      type: "spell";
      proficiencyId: MagicProficiencyId;
      proficiencyEligible: boolean;
    };

export interface CombatActionDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  sourceType: "player" | "enemy";
  targetMode: "self" | "selectedEnemy" | "player";
  preparationSeconds: number;
  cooldownSeconds: number;
  interruptible: boolean;
  danger?: "low" | "medium" | "high" | "critical";
  weight?: number;
  accuracyModifier?: number;
  guaranteedHit?: boolean;
  defensiveEligibility: Omit<DefensiveEligibility, "canMiss">;
  damage?: DamageComponent[];
  applyEffects?: Array<{ effectId: string; chance: number }>;
}

export interface EnemyActionDefinition extends DefensiveEligibility {
  id: string;
  name: string;
  description: string;
  preparationSeconds: number;
  cooldownSeconds: number;
  damageMultiplier: number;
  danger: "low" | "medium" | "high" | "critical";
  interruptible: boolean;
  weight?: number;
  damage?: DamageComponent[];
  applyEffects?: Array<{ effectId: string; chance: number }>;
  targetMode?:
    | "player"
    | "self"
    | "lowest-health-ally"
    | "random-living-ally"
    | "all-living-allies";
  conditions?: Array<{
    type:
      | "player-hp-below"
      | "self-hp-below"
      | "has-effect"
      | "missing-effect"
      | "allies-at-least"
      | "phase";
    value?: number | string;
  }>;
  healing?: number;
  effects?: Array<{
    effectId: string;
    chance: number;
    targetMode?:
      | "player"
      | "self"
      | "lowest-health-ally"
      | "random-living-ally"
      | "all-living-allies";
  }>;
}

export interface EnemyActionRuntime {
  actionId: string;
  remainingSeconds: number;
  totalSeconds: number;
  source?: CombatantRef;
  target?: CombatantRef;
  startedSequence?: number;
}

export interface EnemyTraitDefinition {
  id: string;
  name: string;
  description: string;
}

export interface LootEntry {
  itemId: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  family: string;
  familyId?: string;
  maxHealth: number;
  attackPower: number;
  accuracy: number;
  armor: number;
  evasion: number;
  attackInterval: number;
  dodgeChance: number;
  parryChance: number;
  blockChance: number;
  blockPower: number;
  resistances: Partial<Record<DamageType, number>>;
  traits: EnemyTraitDefinition[];
  actions: EnemyActionDefinition[];
  phases?: Array<{
    phaseId: string;
    hpThreshold: number;
    onEnterEffectIds?: string[];
    statModifiers?: StatModifier[];
    actionIds?: string[];
  }>;
  loot: LootEntry[];
  icon: string;
  accent: "red" | "blue" | "gold";
  /** Compatibility labels for older collection/UI data. Combat math uses resistances. */
  weaknesses?: string[];
  /** Compatibility labels for older collection/UI data. Combat math uses resistances. */
  resistanceLabels?: string[];
}

export interface EnemyCombatInstance {
  instanceId: string;
  enemyId: string;
  displayName: string;
  currentHealth: number;
  maxHealth: number;
  attackTimer: number;
  attackInterval: number;
  actionCooldowns: Record<string, number>;
  phaseId: string | null;
  phaseStatModifiers?: StatModifier[];
  currentAction: EnemyActionRuntime | null;
  effects: import("./combatEffectTypes").ActiveEffectInstance[];
  defeated: boolean;
  rewardResolved: boolean;
}

export type CombatEventType =
  | "actionStarted"
  | "actionInterrupted"
  | "actionResolved"
  | "attackMissed"
  | "attackDodged"
  | "attackParried"
  | "attackBlocked"
  | "criticalHit"
  | "damageDealt"
  | "damageAbsorbed"
  | "healingDone"
  | "effectApplied"
  | "effectRefreshed"
  | "effectStacked"
  | "effectTicked"
  | "effectRemoved"
  | "effectExpired"
  | "effectCleansed"
  | "combatantDefeated"
  | "enemyDefeated"
  | "groupCleared"
  | "recoveryStarted"
  | "huntStopped"
  | "playerActionUsed"
  | "automationActionUsed"
  | "enemyHealed"
  | "enemyPhaseChanged";

export interface CombatLogEntry {
  id: number;
  text: string;
  type: "player" | "enemy" | "system";
  time: string;
}

export interface CombatEventRecord {
  id: number;
  type: CombatEventType;
  source?: CombatantRef;
  target?: CombatantRef;
  data?: Record<string, number | string | boolean | null>;
}

export interface CombatSession {
  elapsedSeconds: number;
  groupClears: number;
  enemiesDefeated: number;
  damageDealt: number;
  damageTaken: number;
  healing: number;
  proficiencyXpGained: Partial<Record<CombatProficiencyId, number>>;
  masteryXpGained: number;
  itemsGained: number;
  lootGained: Record<string, number>;
  goldGained: number;
  highestHit: number;
}

export interface CombatState {
  phase: CombatPhase;
  combatLocationId: string | null;
  groupNumber: number;
  enemies: EnemyCombatInstance[];
  selectedEnemyInstanceId: string | null;
  playerEffects: import("./combatEffectTypes").ActiveEffectInstance[];
  playerHp: number;
  maxPlayerHp: number;
  playerAttackTimer: number;
  playerAttackInterval: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  stance: StanceId;
  stanceCooldownRemaining: number;
  techniques: Record<TechniqueId, boolean>;
  actionCooldowns: Record<string, number>;
  globalCooldownRemaining: number;
  enemyActionsStartedThisStep?: string[];
  potionCooldownRemaining: number;
  recoveryRemaining: number;
  stopReason: CombatStopReason | null;
  lastDamageSource: string | null;
  log: CombatLogEntry[];
  events: CombatEventRecord[];
  session: CombatSession;
  eventSequence: number;
  effectSequence: number;
  lastAutomationAction?: { actionId: string; elapsedSeconds: number };
  lastAutomationFailure?: string;
}

export interface CombatRng {
  next: () => number;
  nextFor?: (kind: string) => number;
}

export interface CombatContext {
  enemies: Record<string, EnemyDefinition>;
  locations: Record<
    string,
    import("../world/worldTypes").CombatLocationDefinition
  >;
  spells: Record<string, import("../data/spells").SpellDefinition>;
  items: Record<string, ItemDefinition>;
  effects: Record<string, import("./combatEffectTypes").EffectDefinition>;
  rng: CombatRng;
  debugHooks?: {
    onAutomationTrace?: (trace: import("../automation/automationTypes").AutomationEvaluationTrace) => void;
  };
}

export interface CombatEvent {
  text: string;
  type: CombatLogEntry["type"];
  eventType?: CombatEventType;
  source?: CombatantRef;
  target?: CombatantRef;
  data?: Record<string, number | string | boolean | null>;
}

export type {
  ActiveEffectInstance,
  EffectDefinition,
  EffectKind,
  EffectPersistence,
  EffectStackingMode,
  PeriodicOperation,
} from "./combatEffectTypes";
