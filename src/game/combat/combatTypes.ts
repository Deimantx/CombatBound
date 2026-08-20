export type CombatPhase =
  "inactive" | "active" | "recovery" | "defeat" | "stopped";
export type CombatStopReason =
  | "manual"
  | "defeat"
  | "consumablesDepleted"
  | "victoryLimit"
  | "completed";
export type DamageType =
  | "physical"
  | "fire"
  | "cold"
  | "lightning"
  | "chaos";
export type DamageSourceKind = "attack" | "magic-art" | "secondary";
/** Historical packet spelling accepted only when decoding old combat fixtures. */
export type LegacyDamageSourceKind = "spell";
export type CombatSourceCategory = "melee" | "ranged" | "magic" | "secondary";
export type DamageDeliveryKind = "hit" | "damage-over-time";
export type ResistanceDamageType = Exclude<DamageType, "physical">;
export type PlayerActionKind =
  "basic-attack" | "magic-art" | "defensive" | "consumable" | "weapon-skill";
export type PlayerActionTargetMode = "self" | "selected-enemy";
export type GlobalCooldownMode = "standard" | "none" | number;
import type { ItemDefinition } from "../data/items";
import type { EnemyTier, EnemyTraitAssignment, EnemyTraitId, EnemyTraitRuntimeState } from "../enemyTraits/enemyTraitTypes";

export type CombatantRef =
  { kind: "player" } | { kind: "enemy"; instanceId: string };

export type CombatStatKey =
  | "maxLife"
  | "lifeRegenFlat"
  | "maxMana"
  | "manaRegenFlat"
  | "maxStamina"
  | "staminaRegen"
  | "accuracyRating"
  | "evasionRating"
  | "baseAttackTime"
  | "increasedAttackSpeed"
  | "moreAttackSpeed"
  | "baseCastTime"
  | "increasedCastSpeed"
  | "moreCastSpeed"
  | "attackInterval"
  | "attacksPerSecond"
  | "castTime"
  | "castsPerSecond"
  | "attackDamage"
  | "attackDamageMin"
  | "attackDamageMax"
  | "criticalStrikeChance"
  | "criticalStrikeMultiplier"
  | "armour"
  | "physicalDamageReduction"
  | "blockChance"
  | "blockEffect"
  | "fireResistance"
  | "coldResistance"
  | "lightningResistance"
  | "chaosResistance";

export type ModifiableCombatStatKey = Exclude<
  CombatStatKey,
  "attackInterval" | "attacksPerSecond" | "castTime" | "castsPerSecond" | "physicalDamageReduction"
>;

export interface CombatStats {
  maxLife?: number;
  attackDamage: number;
  attackDamageMin?: number;
  attackDamageMax?: number;
  lifeRegenFlat?: number;
  manaRegenFlat?: number;
  accuracyRating?: number;
  evasionRating?: number;
  baseAttackTime?: number;
  increasedAttackSpeed?: number;
  moreAttackSpeed?: number;
  baseCastTime?: number;
  increasedCastSpeed?: number;
  moreCastSpeed?: number;
  criticalStrikeChance?: number;
  criticalStrikeMultiplier?: number;
  armour?: number;
  physicalDamageReduction?: number;
  blockChance?: number;
  blockEffect?: number;
  fireResistance?: number;
  coldResistance?: number;
  lightningResistance?: number;
  chaosResistance?: number;
  // Derived values kept explicit for combat and presentation consumers.
  attackInterval: number;
  castTime?: number;
  attacksPerSecond?: number;
  castsPerSecond?: number;
  maxStamina: number;
  staminaRegen: number;
  maxMana: number;
}

export interface StatModifier {
  stat: ModifiableCombatStatKey;
  operation: ModifierOperation;
  value: number;
}

export type ModifierOperation =
  | "flat"
  | "increased"
  | "reduced"
  | "more"
  | "less"
  | "override"
  | "set-minimum"
  | "set-maximum";

export interface CombatStatContribution {
  stat: CombatStatKey | `resistance:${DamageType}`;
  sourceType: "base" | "equipment" | "perk" | "effect" | "other";
  sourceId: string;
  sourceLabel: string;
  operation: ModifierOperation;
  value: number;
  before: number;
  after: number;
}

export interface CombatStatContributionCollector {
  record: (contribution: CombatStatContribution) => void;
}

export interface DefensiveEligibility {
  canMiss?: boolean;
  canBeEvaded?: boolean;
  blockable?: boolean;
}

export interface DamageComponent {
  damageType: DamageType;
  sourceKind?: DamageSourceKind | LegacyDamageSourceKind;
  sourceCategory?: CombatSourceCategory;
  deliveryKind?: DamageDeliveryKind;
  scaling?: { sourceStat: "attackDamage"; multiplier: number };
  flatDamage?: number;
  minMultiplier?: number;
  maxMultiplier?: number;
  minDamage?: number;
  maxDamage?: number;
  canCrit: boolean;
  ignoresArmour?: boolean;
  ignoresResistance?: boolean;
  unmitigated?: boolean;
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
  sourceMagicArtId?: string;
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
  | "magic-art-not-known"
  | "ability-not-equipped"
  | "weapon-requirement"
  | "proficiency-level-requirement"
  | "equipment-requirement"
  | "full-health"
  | "consumable-missing"
  | "stunned";

import type {
  CombatProficiencyId,
} from "../progression/progressionTypes";
import type { EnemyCombatAbilityId, EnemyAbilityRuntimeState } from "../enemyAbilities/enemyAbilityTypes";

export type DamageProgressionSource =
  | { type: "equippedWeapon"; proficiencyEligible: boolean }
  | {
      type: "magic-art";
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
  maxLife: number;
  baseAttackDamageMin: number;
  baseAttackDamageMax: number;
  accuracyRating: number;
  evasionRating: number;
  armour: number;
  baseAttackTime: number;
  blockChance?: number;
  blockEffect?: number;
  resistances: Partial<Record<ResistanceDamageType, number>>;
  enemyTier: EnemyTier;
  traits: EnemyTraitAssignment[];
  combatAbilityIds: EnemyCombatAbilityId[];
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
  abilityCooldowns: Record<EnemyCombatAbilityId, number>;
  abilityRuntime: EnemyAbilityRuntimeState;
  phaseId: string | null;
  phaseStatModifiers?: StatModifier[];
  currentAction: EnemyActionRuntime | null;
  effects: import("./combatEffectTypes").ActiveEffectInstance[];
  defeated: boolean;
  rewardResolved: boolean;
  traitRuntime: EnemyTraitRuntimeState;
}

export type CombatEventType =
  | "enemyAbilityResolved"
  | "actionStarted"
  | "actionResolved"
  | "attackMissed"
  | "attackEvaded"
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
  itemsGained: number;
  lootGained: Record<string, number>;
  itemInstanceIdsGained: import("../items/itemTypes").ItemInstanceId[];
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
  magicArts?: Record<string, import("../magicArts/magicArtTypes").MagicArtDefinition>;
  items: Record<string, ItemDefinition>;
  effects: Record<string, import("./combatEffectTypes").EffectDefinition>;
  enemyCombatAbilities?: Record<EnemyCombatAbilityId, import("../enemyAbilities/enemyAbilityTypes").EnemyCombatAbilityDefinition>;
  enemyTraits?: Record<EnemyTraitId, import("../enemyTraits/enemyTraitTypes").EnemyTraitDefinition>;
  rng: CombatRng;
  debugHooks?: {
    onAutomationTrace?: (trace: import("../automation/automationTypes").AutomationEvaluationTrace) => void;
    isPlayerImmortal?: () => boolean;
    isEnemyImmortal?: (instanceId: string) => boolean;
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
