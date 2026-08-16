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
  | "cold"
  | "lightning"
  | "chaos";
export type DamageSourceKind = "attack" | "spell" | "secondary";
export type DamageDeliveryKind = "hit" | "damage-over-time";
export type ResistanceDamageType = Exclude<DamageType, "physical">;
export type PlayerActionKind =
  "basic-attack" | "spell" | "defensive" | "consumable" | "weapon-skill";
export type PlayerActionTargetMode = "self" | "selected-enemy";
export type GlobalCooldownMode = "standard" | "none" | number;
import type { ItemDefinition } from "../data/items";

export type CombatantRef =
  { kind: "player" } | { kind: "enemy"; instanceId: string };

export type CombatStatKey =
  | "maxLife"
  | "lifeRegenFlat"
  | "lifeRegenPercent"
  | "lifeRecoveryRate"
  | "maxMana"
  | "manaRegenFlat"
  | "manaRegenPercent"
  | "manaRecoveryRate"
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
  | "actionSpeed"
  | "attackInterval"
  | "attacksPerSecond"
  | "castTime"
  | "castsPerSecond"
  | "attackDamage"
  | "attackDamageMin"
  | "attackDamageMax"
  | "baseCritChance"
  | "additionalBaseCritChance"
  | "increasedCritChance"
  | "moreCritChance"
  | "criticalStrikeMultiplier"
  | "reducedExtraDamageTakenFromCriticalStrikes"
  | "armour"
  | "additionalPhysicalDamageReduction"
  | "maxPhysicalDamageReduction"
  | "attackBlockChance"
  | "spellBlockChance"
  | "maxAttackBlockChance"
  | "maxSpellBlockChance"
  | "spellSuppressionChance"
  | "suppressedSpellDamagePrevented"
  | "fireResistance"
  | "coldResistance"
  | "lightningResistance"
  | "chaosResistance"
  | "maxFireResistance"
  | "maxColdResistance"
  | "maxLightningResistance"
  | "maxChaosResistance"
  | "elementalAilmentAvoidance"
  | "physicalAilmentAvoidance"
  | "ailmentDurationReduction"
  | "nonDamagingAilmentEffectReduction"
  | "increasedDamageTaken";

export type ModifiableCombatStatKey = Exclude<
  CombatStatKey,
  "attackInterval" | "attacksPerSecond" | "castTime" | "castsPerSecond"
>;

export interface CombatStats {
  maxLife?: number;
  attackDamage: number;
  attackDamageMin?: number;
  attackDamageMax?: number;
  lifeRegenFlat?: number;
  lifeRegenPercent?: number;
  lifeRecoveryRate?: number;
  manaRegenFlat?: number;
  manaRegenPercent?: number;
  manaRecoveryRate?: number;
  accuracyRating?: number;
  evasionRating?: number;
  baseAttackTime?: number;
  increasedAttackSpeed?: number;
  moreAttackSpeed?: number;
  baseCastTime?: number;
  increasedCastSpeed?: number;
  moreCastSpeed?: number;
  actionSpeed?: number;
  baseCritChance?: number;
  additionalBaseCritChance?: number;
  increasedCritChance?: number;
  moreCritChance?: number;
  criticalStrikeMultiplier?: number;
  reducedExtraDamageTakenFromCriticalStrikes?: number;
  armour?: number;
  additionalPhysicalDamageReduction?: number;
  maxPhysicalDamageReduction?: number;
  attackBlockChance?: number;
  spellBlockChance?: number;
  maxAttackBlockChance?: number;
  maxSpellBlockChance?: number;
  spellSuppressionChance?: number;
  suppressedSpellDamagePrevented?: number;
  fireResistance?: number;
  coldResistance?: number;
  lightningResistance?: number;
  chaosResistance?: number;
  maxFireResistance?: number;
  maxColdResistance?: number;
  maxLightningResistance?: number;
  maxChaosResistance?: number;
  elementalAilmentAvoidance?: number;
  physicalAilmentAvoidance?: number;
  ailmentDurationReduction?: number;
  nonDamagingAilmentEffectReduction?: number;
  increasedDamageTaken?: number;
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
  sourceType: "base" | "equipment" | "perk" | "stance" | "technique" | "effect" | "other";
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
  sourceKind?: DamageSourceKind;
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
  maxLife: number;
  baseAttackDamageMin: number;
  baseAttackDamageMax: number;
  accuracyRating: number;
  evasionRating: number;
  armour: number;
  baseAttackTime: number;
  attackBlockChance?: number;
  spellBlockChance?: number;
  spellSuppressionChance?: number;
  additionalPhysicalDamageReduction?: number;
  maxResistances?: Partial<Record<ResistanceDamageType, number>>;
  resistances: Partial<Record<ResistanceDamageType, number>>;
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
  masteryXpGained: number;
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
