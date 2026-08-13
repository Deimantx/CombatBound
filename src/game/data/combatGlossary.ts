import { combatBalance } from '../combat/combatBalance'
import type { CombatStatKey, DamageType } from '../combat/combatTypes'

export type CombatReferenceCategory = 'offense' | 'defense' | 'resources' | 'resistances' | 'character'
export type CombatStatDisplayKey = CombatStatKey | 'currentHealth' | 'stamina' | 'mana' | 'barrier' | 'hitChance' | `${DamageType}Resistance`
export type CombatStatFormat = 'number' | 'percent' | 'seconds' | 'multiplier' | 'resistance'

export interface CombatStatReference {
  id: CombatStatDisplayKey
  statKey?: CombatStatKey
  label: string
  shortDescription: string
  fullDescription: string
  category: CombatReferenceCategory
  format: CombatStatFormat
  formula?: string
  notes?: string[]
}

const stat = (reference: CombatStatReference) => reference

export const combatStatReferences: CombatStatReference[] = [
  stat({ id: 'maxHealth', statKey: 'maxHealth', label: 'Max Health', category: 'defense', format: 'number', shortDescription: 'The maximum HP the Hunter can have before taking damage.', fullDescription: 'Max Health sets the upper limit of HP. Current Health cannot exceed this value. When Hunter HP reaches 0, the current Hunt ends in defeat.' }),
  stat({ id: 'attackPower', statKey: 'attackPower', label: 'Attack Power', category: 'offense', format: 'number', shortDescription: 'The main offensive stat used to scale weapon and Attack Power-based damage.', fullDescription: 'Attack Power provides the base scaling for normal weapon attacks and any action that scales from Attack Power. Normal attacks currently roll controlled damage variance before Critical Hits and defensive mitigation are resolved.', formula: `Normal damage variance: ${Math.round(combatBalance.baseDamageVarianceMin * 100)}%–${Math.round(combatBalance.baseDamageVarianceMax * 100)}% of the rolled base value.` }),
  stat({ id: 'accuracy', statKey: 'accuracy', label: 'Accuracy', category: 'offense', format: 'number', shortDescription: "Improves the chance for attacks to connect against the target's Evasion.", fullDescription: 'Accuracy is opposed by Evasion during the initial hit check. Higher Accuracy increases Hit Chance. Armor does not affect whether an attack connects.', formula: `Hit Chance = ${Math.round(combatBalance.baseHitChance * 100)}% base + ${Math.round(combatBalance.hitChanceRelativeScale * 100)}% × ((Accuracy − Evasion) / max(1, Accuracy + Evasion)).`, notes: [`Clamped between ${Math.round(combatBalance.minHitChance * 100)}% and ${Math.round(combatBalance.maxHitChance * 100)}%.`] }),
  stat({ id: 'attackInterval', statKey: 'attackInterval', label: 'Attack Interval', category: 'offense', format: 'seconds', shortDescription: 'Seconds between automatic normal attacks. Lower is faster.', fullDescription: "Attack Interval controls the Hunter's normal attack timer. A 2.0 second interval attacks more often than a 2.5 second interval. Stances and equipment can modify this value." }),
  stat({ id: 'armor', statKey: 'armor', label: 'Armor', category: 'defense', format: 'number', shortDescription: 'Reduces incoming direct Physical damage with diminishing returns.', fullDescription: 'Armor mitigates direct Physical damage after an attack connects. Armor does not reduce Hit Chance and does not normally reduce Fire, Earth, Air, Nature, Mystic, or True damage.', formula: `Armor Mitigation = Armor / (Armor + ${combatBalance.armorConstant}).` }),
  stat({ id: 'evasion', statKey: 'evasion', label: 'Evasion', category: 'defense', format: 'number', shortDescription: "Reduces an attacker's chance to connect by opposing Accuracy.", fullDescription: 'Evasion participates in the initial Accuracy versus Evasion hit check. If the attack fails this check, it Misses before Dodge, Parry, Block, Armor, or Resistance are resolved.', notes: ['Evasion is not Dodge.'] }),
  stat({ id: 'critChance', statKey: 'critChance', label: 'Critical Hit Chance', category: 'offense', format: 'percent', shortDescription: 'Chance for an eligible damaging hit to become a Critical Hit.', fullDescription: 'When an eligible hit Critically Hits, its rolled damage is multiplied by Critical Hit Damage before later mitigation.' }),
  stat({ id: 'critDamage', statKey: 'critDamage', label: 'Critical Hit Damage', category: 'offense', format: 'multiplier', shortDescription: 'Damage multiplier applied when an eligible hit becomes a Critical Hit.', fullDescription: 'A value of 1.50 means a Critical Hit deals 150% of its normal rolled damage before mitigation.' }),
  stat({ id: 'dodgeChance', statKey: 'dodgeChance', label: 'Dodge Chance', category: 'defense', format: 'percent', shortDescription: 'Chance to completely avoid an eligible attack after it passes the Accuracy check.', fullDescription: 'After Accuracy versus Evasion succeeds, an eligible attack may be Dodged. A successful Dodge prevents that direct hit from dealing damage.' }),
  stat({ id: 'parryChance', statKey: 'parryChance', label: 'Parry Chance', category: 'defense', format: 'percent', shortDescription: 'Chance to completely avoid an eligible attack after the Dodge check.', fullDescription: 'Parry is a separate defensive layer after Accuracy and Dodge. Only actions marked as parryable can be Parried.', notes: ['Parrying does not currently create a counterattack.'] }),
  stat({ id: 'blockChance', statKey: 'blockChance', label: 'Block Chance', category: 'defense', format: 'percent', shortDescription: 'Chance to partially block an eligible hit.', fullDescription: 'Block occurs after an attack connects and passes Dodge and Parry. A successful Block does not fully avoid the hit; Block Power determines how much remaining damage is prevented.' }),
  stat({ id: 'blockPower', statKey: 'blockPower', label: 'Block Power', category: 'defense', format: 'percent', shortDescription: 'The portion of eligible damage prevented when a Block succeeds.', fullDescription: 'Block Power reduces damage after Armor and Resistance. A value of 50% prevents half of that remaining damage on a successful Block.' }),
  stat({ id: 'maxStamina', statKey: 'maxStamina', label: 'Max Stamina', category: 'resources', format: 'number', shortDescription: "The Hunter's maximum Stamina capacity.", fullDescription: 'Max Stamina is the upper limit for the Stamina resource. Stamina powers sustained physical Techniques and cannot exceed this capacity.' }),
  stat({ id: 'staminaRegen', statKey: 'staminaRegen', label: 'Stamina Regeneration', category: 'resources', format: 'number', shortDescription: 'Stamina restored per second before sustained Technique drain.', fullDescription: 'Stamina Regeneration restores Stamina over real combat time. Stances may modify regeneration, while active Techniques consume Stamina each second. Recovery accelerates this regeneration.', notes: ['Displayed as Stamina per second.'] }),
  stat({ id: 'maxMana', statKey: 'maxMana', label: 'Max Mana', category: 'resources', format: 'number', shortDescription: "The Hunter's maximum Mana capacity.", fullDescription: 'Max Mana is the upper limit for the Mana resource. Mana is spent to cast combat Spells and cannot exceed this capacity.' }),
  stat({ id: 'manaRegen', statKey: 'manaRegen', label: 'Mana Regeneration', category: 'resources', format: 'number', shortDescription: 'Mana restored per second.', fullDescription: 'Mana regenerates passively during active combat and recovery at its normal rate. Mana is not generated by dealing damage, taking damage, or creating a Barrier.', notes: ['Displayed as Mana per second.'] }),
  stat({ id: 'statusResistance', statKey: 'statusResistance', label: 'Status Resistance', category: 'defense', format: 'percent', shortDescription: 'Reduces the duration of harmful status effects.', fullDescription: 'Status Resistance shortens harmful effect duration. Beneficial buffs and Barriers are not shortened by Status Resistance.', formula: 'Effective Duration = Base Duration × (1 − Status Resistance).', notes: [`Current cap: ${Math.round(combatBalance.maxStatusResistance * 100)}%.`] }),
  stat({ id: 'currentHealth', label: 'Current Health', category: 'character', format: 'number', shortDescription: 'Current HP remaining. Reaching 0 defeats the Hunter or enemy.', fullDescription: 'Current Health is the HP remaining in combat. Reaching 0 defeats the Hunter or an enemy.' }),
  stat({ id: 'stamina', label: 'Stamina', category: 'resources', format: 'number', shortDescription: 'Current Stamina available for sustained Techniques.', fullDescription: 'Current Stamina powers sustained Techniques. It regenerates over time, is drained by active Techniques, and automatically deactivates those Techniques when it reaches zero.' }),
  stat({ id: 'mana', label: 'Mana', category: 'resources', format: 'number', shortDescription: 'Current Mana available for Spells.', fullDescription: 'Current Mana is spent on combat Spells and passively regenerates during active combat and recovery. It is not generated by damage or Barrier events.' }),
  stat({ id: 'barrier', label: 'Barrier', category: 'defense', format: 'number', shortDescription: 'Temporary damage absorption.', fullDescription: 'Barrier absorbs incoming mitigated damage before HP unless an action explicitly bypasses Barriers.' }),
  stat({ id: 'hitChance', label: 'Hit Chance', category: 'offense', format: 'percent', shortDescription: "Calculated chance for the Accuracy check to connect against the target's Evasion.", fullDescription: 'Hit Chance is calculated from Accuracy versus Evasion before Dodge, Parry, or Block.' }),
]

const resistanceTypes: Array<{ id: `${DamageType}Resistance`; damageType: DamageType; label: string; description: string }> = [
  { id: 'physicalResistance', damageType: 'physical', label: 'Physical Resistance', description: 'Reduces Physical damage after applicable Armor mitigation. Physical Resistance is separate from Armor.' },
  { id: 'fireResistance', damageType: 'fire', label: 'Fire Resistance', description: 'Reduces Fire damage. Negative Fire Resistance means Fire Weakness.' },
  { id: 'earthResistance', damageType: 'earth', label: 'Earth Resistance', description: 'Reduces Earth damage. Armor does not normally mitigate Earth damage.' },
  { id: 'airResistance', damageType: 'air', label: 'Air Resistance', description: 'Reduces Air damage. Armor does not normally mitigate Air damage.' },
  { id: 'natureResistance', damageType: 'nature', label: 'Nature Resistance', description: 'Reduces Nature damage. Armor does not normally mitigate Nature damage.' },
  { id: 'mysticResistance', damageType: 'mystic', label: 'Mystic Resistance', description: 'Reduces Mystic damage. Armor does not normally mitigate Mystic damage.' },
]

for (const resistance of resistanceTypes) {
  combatStatReferences.push(stat({ id: resistance.id, label: resistance.label, category: 'resistances', format: 'resistance', shortDescription: resistance.description, fullDescription: `${resistance.description} Positive Resistance reduces damage; negative Resistance is a Weakness and increases damage taken.`, notes: [`Values are clamped between ${Math.round(combatBalance.minResistance * 100)}% and +${Math.round(combatBalance.maxResistance * 100)}%.`] }))
}

export const combatStatReferenceById = Object.fromEntries(combatStatReferences.map((reference) => [reference.id, reference])) as Record<CombatStatDisplayKey, CombatStatReference>
export const combatReferenceGroups: Array<{ id: CombatReferenceCategory; label: string }> = [
  { id: 'offense', label: 'Offense' },
  { id: 'defense', label: 'Defense' },
  { id: 'resources', label: 'Resources' },
  { id: 'resistances', label: 'Resistances' },
]

export const damageTypeReferences: Array<{ id: DamageType; label: string; description: string }> = [
  { id: 'physical', label: 'Physical', description: 'Normally reduced by Armor and then Physical Resistance.' },
  { id: 'fire', label: 'Fire', description: 'Normally ignores Armor and uses Fire Resistance.' },
  { id: 'earth', label: 'Earth', description: 'Normally ignores Armor and uses Earth Resistance.' },
  { id: 'air', label: 'Air', description: 'Normally ignores Armor and uses Air Resistance.' },
  { id: 'nature', label: 'Nature', description: 'Normally ignores Armor and uses Nature Resistance.' },
  { id: 'mystic', label: 'Mystic', description: 'Normally ignores Armor and uses Mystic Resistance.' },
  { id: 'true', label: 'True', description: 'Ignores Armor and normal Resistances.' },
]
