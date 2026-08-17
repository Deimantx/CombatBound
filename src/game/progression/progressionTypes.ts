import type { ModifiableCombatStatKey, ResistanceDamageType, StatModifier } from '../combat/combatTypes'

export type WeaponProficiencyId =
  | 'one-handed-sword'
  | 'one-handed-axe'
  | 'one-handed-mace'
  | 'dagger'
  | 'two-handed-sword'
  | 'two-handed-axe'
  | 'two-handed-hammer'
  | 'spear'
  | 'shortbow'
  | 'longbow'
  | 'crossbow'

/** Historical save/test boundary only; no runtime definition or progression tree exists. */
export type MagicProficiencyId = 'fire-magic' | 'water-magic' | 'air-magic' | 'earth-magic' | 'darkness-magic'
export type DefensiveProficiencyId = 'light-armor' | 'medium-armor' | 'heavy-armor' | 'shield'
export type CombatProficiencyId = WeaponProficiencyId | MagicProficiencyId | DefensiveProficiencyId
export type ProficiencyCategory = 'melee' | 'ranged' | 'magic' | 'defense'
export type ProgressionCreditMode = 'hp-damage' | 'barrier-absorb' | 'effective-healing' | 'successful-cleanse'

export type ProficiencyXpReason =
  | { type: 'effective-hp-damage'; amount: number }
  | { type: 'barrier-absorption'; amount: number }
  | { type: 'effective-healing'; amount: number }
  | { type: 'successful-cleanse'; weight: number }

export interface ProgressionCredit {
  proficiencyId: CombatProficiencyId
  mode: ProgressionCreditMode
}

export interface ProficiencyProgress {
  proficiencyId: CombatProficiencyId
  totalXp: number
}

export interface ProgressionState {
  proficiencies: Partial<Record<CombatProficiencyId, ProficiencyProgress>>
  masteryXp: number
  bonusPerkPoints: number
  purchasedPerks: Record<string, number>
}

export type LegacyProgressionState = Omit<ProgressionState, 'bonusPerkPoints'> & { bonusPerkPoints?: number }

export interface ProficiencyDefinition {
  id: CombatProficiencyId
  name: string
  category: ProficiencyCategory
  description: string
  icon: string
  maxLevel: number
  perkIds: string[]
}

export type WeaponProficiencyDefinition = ProficiencyDefinition

export interface ProficiencyPerkPrerequisite {
  perkId: string
  requiredRank: number
}

export type PerkPrerequisiteRule =
  | { mode: 'all'; requirements: ProficiencyPerkPrerequisite[] }
  | { mode: 'any'; requirements: ProficiencyPerkPrerequisite[]; minimumSatisfied?: number }

export type PerkPresentationSize = 'minor' | 'major' | 'capstone' | 'root'

export type ProficiencyPerkEffect =
  | {
      type: 'statModifier'
      stat: ModifiableCombatStatKey
      operation: StatModifier['operation']
      valuePerRank: number
    }
  | {
      type: 'equippedArmorStatModifier'
      stat: ModifiableCombatStatKey
      operation: StatModifier['operation']
      valuePerRankPerPiece: number
      minimumPieces?: number
    }
  | {
      type: 'equippedArmorResistanceModifier'
      damageType: ResistanceDamageType
      valuePerRankPerPiece: number
      minimumPieces?: number
    }
  | {
      type: 'equippedArmorSpellModifier'
      modifier: 'damage' | 'manaCost' | 'cooldown' | 'barrierAmount' | 'barrierDuration'
      valuePerRank: number
      minimumPieces: number
    }
  | {
      type: 'equippedArmorWeaponModifier'
      modifier: 'damage' | 'attackSpeed' | 'accuracy'
      valuePerRank: number
      minimumPieces: number
    }
  | {
      type: 'onWeaponHitApplyEffect'
      effectId: string
      chancePerRank: number
    }
  | {
      type: 'conditionalDamageModifier'
      operation: 'increased' | 'more'
      valuePerRank: number
      condition: { type: 'targetHpBelow'; fraction: number } | { type: 'targetHasEffect'; effectId: string } | { type: 'targetHasEffectAndHpBelow'; effectId: string; fraction: number }
    }
  | {
      type: 'spellDamageModifier' | 'spellManaCostModifier' | 'spellCooldownModifier'
      valuePerRank: number
    }
  | { type: 'spellCriticalChanceModifier' | 'spellHealingModifier' | 'spellHealingOverTimeModifier' | 'spellLifeDrainModifier' | 'spellDamageBasedManaRestore'; valuePerRank: number }
  | { type: 'spellArmorPenetrationModifier'; mode: 'flat' | 'percent'; valuePerRank: number }
  | { type: 'spellSecondaryTargetDamage'; fractionPerRank: number; maxAdditionalTargets: number }
  | { type: 'spellOnEffectiveHealingResourceRestore'; resource: 'mana' | 'stamina'; amountPerRank: number; divisor?: number }
  | { type: 'onSuccessfulCleanseRestoreResource'; resource: 'mana' | 'stamina'; amountPerRank: number }
  | { type: 'onSuccessfulCleanseApplyEffect'; effectId: string; durationSeconds?: number }
  | { type: 'sourceEffectOutgoingDamageModifier'; effectId: string; valuePerRank: number }
  | { type: 'onSpellHitApplyEffect'; effectId: string; chancePerRank: number; secondaryOnly?: boolean }
  | {
      type: 'appliedEffectPeriodicPowerModifier' | 'appliedEffectDurationModifier'
      effectId: string
      valuePerRank: number
    }
  | {
      type: 'barrierAmountModifier' | 'barrierDurationModifier'
      valuePerRank: number
    }
  | {
      type: 'barrierFlatAmountModifier'
      valuePerRank: number
    }
  | {
      type: 'onBarrierAbsorbRestoreMana'
      amountPerRank: number
    }
  | { type: 'proficiencyXpModifier'; valuePerRank: number; reasonType?: ProficiencyXpReason['type'] }
  | {
      type: 'spellCanCrit'
    }
  | {
      type: 'conditionalStatModifier'
      stat: ModifiableCombatStatKey
      operation: StatModifier['operation']
      valuePerRank: number
      condition: { type: 'active-barrier' | 'active-technique' | 'stamina-above' | 'player-hp-below'; fraction?: number }
    }
  | { type: 'weaponDamageModifier' | 'weaponAttackSpeedModifier'; valuePerRank: number }
  | { type: 'weaponArmorPenetrationModifier'; mode: 'flat' | 'percent'; valuePerRank: number }
  | { type: 'weaponSecondaryTargetDamage'; fractionPerRank: number; maxAdditionalTargets: number }
  | { type: 'onBlockApplyEffect'; effectId: string; durationSeconds?: number }
  | { type: 'weaponFlatDamageModifier'; valuePerRank: number }
  | { type: 'weaponOnHitResourceRestore'; resource: 'stamina' | 'mana'; amountPerRank: number; chancePerRank?: number }
  | { type: 'weaponConditionalDamageModifier'; operation: 'increased' | 'more'; valuePerRank: number; condition: { type: 'targetHpAbove' | 'targetHpBelow' | 'targetHasEffect' | 'targetHasEffectAndHpBelow'; fraction?: number; effectId?: string } }
  | { type: 'spellFlatDamageModifier'; valuePerRank: number }
  | { type: 'spellCritEligibility' }
  | { type: 'spellOnHpDamageResourceRestore'; resource: 'mana' | 'stamina'; amountPerRank: number; chancePerRank?: number }
  | { type: 'spellConditionalDamageModifier'; operation: 'increased' | 'more'; valuePerRank: number; condition: { type: 'targetHpAbove' | 'targetHpBelow' | 'targetHasEffect' | 'targetHasEffectAndHpBelow' | 'manaAbove'; fraction?: number; effectId?: string } }
  | { type: 'spellConditionalCritModifier'; valuePerRank: number; condition: { type: 'targetHpBelow'; fraction: number } }
  | { type: 'onSpellCastApplyEffect'; effectId: string; durationSeconds?: number }
  | { type: 'onSpellCriticalReduceCooldown'; amountSecondsPerRank: number }
  | { type: 'onIgniteTickReduceCooldown'; amountSecondsPerRank: number; chancePerRank?: number }
  | { type: 'spellCriticalDamageModifier'; valuePerRank: number }
  | { type: 'appliedEffectPeriodicDamageModifier'; effectId: string; valuePerRank: number }
  | { type: 'appliedEffectMaxStacksModifier'; effectId: string; valuePerRank: number }
  | { type: 'barrierAbsorbResourceRestore'; resource: 'stamina' | 'mana'; amountPerRank: number }
  | { type: 'techniqueStaminaDrainModifier'; valuePerRank: number }
  | { type: 'weaponOnHitAdvanceAttack'; chancePerRank: number; fraction: number }
  | { type: 'activeTechniqueStatModifier'; stat: ModifiableCombatStatKey; operation: StatModifier['operation']; valuePerRank: number }
  | { type: 'appliedEffectRefreshOnMaxStacks'; effectId: string; fraction: number }
  | { type: 'spellConditionalCooldownModifier'; valuePerRank: number; condition: { type: 'targetHasEffect'; effectId: string } }
  | { type: 'spellConditionalManaCostModifier'; valuePerRank: number; condition: { type: 'manaAbove'; fraction: number } }
  | { type: 'onBarrierBreakApplyEffect'; effectId: string; durationSeconds?: number }
  | { type: 'onBarrierExpireRestoreResource'; resource: 'mana' | 'stamina'; fraction: number }
  | { type: 'onBarrierAbsorbApplyEffect'; effectId: string; durationSeconds?: number }

export interface ProficiencyPerkDefinition {
  id: string
  proficiencyId: CombatProficiencyId
  name: string
  branch: string
  requiredProficiencyLevel: number
  maxRank: number
  costPerRank: number
  description: string
  effects: ProficiencyPerkEffect[]
  prerequisiteRules: PerkPrerequisiteRule[]
  presentation: { column: number; row: number; size?: PerkPresentationSize; icon: string }
  autoGranted?: boolean
}

export type PerkPurchaseOutcome = 'purchased' | 'max-rank' | 'insufficient-points' | 'level-locked' | 'prerequisite-locked' | 'unknown-perk'

export type PerkPurchaseStateStatus = 'available' | 'level-locked' | 'prerequisite-locked' | 'points-locked' | 'maxed' | 'unknown'

export interface PerkPurchaseState {
  status: PerkPurchaseStateStatus
  perk?: ProficiencyPerkDefinition
  currentRank: number
  missingLevel?: number
  missingPoints?: number
  missingPrerequisites?: ProficiencyPerkPrerequisite[]
}

export interface PerkPurchaseResult {
  progression: ProgressionState
  outcome: PerkPurchaseOutcome
  perkId: string
  rank: number
}

export interface ProficiencyXpResult {
  progression: ProgressionState
  proficiencyId: CombatProficiencyId
  proficiencyXpGained: number
  oldProficiencyLevel: number
  newProficiencyLevel: number
  oldMasteryLevel: number
  newMasteryLevel: number
  oldEarnedPerkPoints: number
  newEarnedPerkPoints: number
  perkPointsEarned: number
}
