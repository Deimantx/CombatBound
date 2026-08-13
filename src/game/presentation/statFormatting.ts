import type { CombatStatDisplayKey } from '../data/combatGlossary'
import { combatStatReferenceById } from '../data/combatGlossary'
import type { ItemDefinition } from '../data/items'

export type ItemStatKey = NonNullable<ItemDefinition['stats']> extends infer Stats ? keyof Stats & string : string
export interface FormattedStat { label: string; value: string; tone?: 'default' | 'gold' | 'blue' | 'green' | 'red' }

export function formatPercent(value: number, signed = false) {
  const percent = Math.round(value * 100)
  return signed && percent > 0 ? `+${percent}%` : `${percent}%`
}

export function formatSeconds(value: number) { return `${value.toFixed(1)}s` }
export function formatSignedNumber(value: number) { return value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}` }
export function formatSignedPercent(value: number) { return formatPercent(value, true) }
export function formatMultiplierAsPercent(value: number) { return formatPercent(value) }
export function formatResistance(value: number) { return formatPercent(value, true) }

const labelAliases: Record<string, string> = {
  attack: 'Attack Power', defense: 'Armor', dodge: 'Dodge Chance', parry: 'Parry Chance', block: 'Block Chance',
  maxHealth: 'Max Health', attackPower: 'Attack Power', accuracy: 'Accuracy', attackInterval: 'Attack Interval', armor: 'Armor', evasion: 'Evasion',
  critChance: 'Critical Hit Chance', critDamage: 'Critical Hit Damage', dodgeChance: 'Dodge Chance', parryChance: 'Parry Chance', blockChance: 'Block Chance', blockPower: 'Block Power',
  maxStamina: 'Max Stamina', staminaRegen: 'Stamina Regeneration', maxMana: 'Max Mana', manaRegen: 'Mana Regeneration', statusResistance: 'Status Resistance',
  physicalResistance: 'Physical Resistance', fireResistance: 'Fire Resistance', earthResistance: 'Earth Resistance', airResistance: 'Air Resistance', natureResistance: 'Nature Resistance', mysticResistance: 'Mystic Resistance',
  currentHealth: 'Current Health', stamina: 'Stamina', mana: 'Mana', barrier: 'Barrier', hitChance: 'Hit Chance',
}

export function labelForStatKey(key: string) { return labelAliases[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()) }

export function formatCombatStatValue(statKey: CombatStatDisplayKey | string, value: number) {
  if (statKey === 'attackInterval') return formatSeconds(value)
  if (['critChance', 'dodgeChance', 'parryChance', 'blockChance', 'blockPower', 'statusResistance', 'hitChance'].includes(statKey)) return formatPercent(value)
  if (statKey === 'critDamage') return formatMultiplierAsPercent(value)
  if (statKey.endsWith('Resistance')) return formatResistance(value)
  if (statKey === 'staminaRegen' || statKey === 'manaRegen') return `${value.toFixed(1)} / sec`
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

export function formatItemStat(key: string, value: number): FormattedStat {
  const isResistance = key.endsWith('Resistance')
  if (key === 'attackInterval') return { label: labelForStatKey(key), value: formatSeconds(value), tone: 'gold' }
  if (['critChance', 'dodgeChance', 'parryChance', 'blockChance', 'blockPower'].includes(key)) return { label: labelForStatKey(key), value: formatSignedPercent(value), tone: 'gold' }
  if (key === 'critDamage') return { label: labelForStatKey(key), value: formatMultiplierAsPercent(value), tone: 'gold' }
  if (isResistance) return { label: labelForStatKey(key), value: formatResistance(value), tone: value > 0 ? 'green' : value < 0 ? 'red' : 'default' }
  return { label: labelForStatKey(key), value: formatSignedNumber(value), tone: 'gold' }
}

export function formatItemStats(stats: NonNullable<ItemDefinition['stats']>) { return Object.entries(stats).map(([key, value]) => formatItemStat(key, value)) }

export function statReferenceFor(key: string) { return combatStatReferenceById[key as CombatStatDisplayKey] }
