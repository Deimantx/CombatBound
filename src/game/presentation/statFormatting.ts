import type { CombatStatDisplayKey } from '../data/combatGlossary'
import { combatStatReferenceById } from '../data/combatGlossary'
import type { ItemDefinition } from '../data/items'

export type ItemStatKey = NonNullable<ItemDefinition['stats']> extends infer Stats ? keyof Stats & string : string
export interface FormattedStat { label: string; value: string; tone?: 'default' | 'gold' | 'blue' | 'green' | 'red' }

export type CombatStatFormatMode = 'normal' | 'comparison'
export type CombatStatValueKind = 'flat' | 'percent' | 'seconds' | 'per-second'
export type StatComparisonDirection = 'higher-is-better' | 'lower-is-better' | 'neutral'
export interface CombatStatDisplaySpec {
  key: string
  valueKind: CombatStatValueKind
  decimals: number
  comparisonDecimals?: number
  comparisonDirection: StatComparisonDirection
}

export const COMBAT_STAT_EPSILON = 1e-9

const flatHigher = (key: string, decimals = 0): CombatStatDisplaySpec => ({ key, valueKind: 'flat', decimals, comparisonDirection: 'higher-is-better' })
const percentHigher = (key: string): CombatStatDisplaySpec => ({ key, valueKind: 'percent', decimals: 0, comparisonDirection: 'higher-is-better' })
const regenHigher = (key: string): CombatStatDisplaySpec => ({ key, valueKind: 'per-second', decimals: 1, comparisonDecimals: 2, comparisonDirection: 'higher-is-better' })

const displaySpecs: CombatStatDisplaySpec[] = [
  ...['attackPower', 'attack', 'accuracy', 'armor', 'defense', 'evasion', 'maxHealth', 'maxStamina', 'maxMana'].map((key) => flatHigher(key)),
  ...['healthRegen', 'staminaRegen', 'manaRegen'].map((key) => regenHigher(key)),
  { key: 'attackInterval', valueKind: 'seconds', decimals: 1, comparisonDecimals: 2, comparisonDirection: 'lower-is-better' },
  ...['critChance', 'critDamage', 'dodgeChance', 'parryChance', 'blockChance', 'blockPower', 'statusResistance', 'physicalDirectMitigation', 'hitChance',
    'physicalResistance', 'fireResistance', 'waterResistance', 'earthResistance', 'airResistance', 'lightResistance', 'darknessResistance', 'natureResistance', 'mysticResistance'].map((key) => percentHigher(key)),
  ...['currentHealth', 'stamina', 'mana', 'barrier'].map((key) => flatHigher(key, 1)),
]

export const COMBAT_STAT_DISPLAY_SPECS: Readonly<Record<string, CombatStatDisplaySpec>> = Object.fromEntries(displaySpecs.map((spec) => [spec.key, spec]))
export const COMBAT_ITEM_STAT_KEYS = [
  'attackPower', 'attack', 'accuracy', 'armor', 'defense', 'evasion', 'maxHealth', 'healthRegen', 'maxStamina', 'staminaRegen', 'maxMana', 'manaRegen',
  'statusResistance', 'attackInterval', 'critChance', 'critDamage', 'dodgeChance', 'parryChance', 'blockChance', 'blockPower',
  'physicalResistance', 'fireResistance', 'waterResistance', 'earthResistance', 'airResistance', 'lightResistance', 'darknessResistance', 'natureResistance', 'mysticResistance',
] as const
const combatItemStatKeySet = new Set<string>(COMBAT_ITEM_STAT_KEYS)

export function getCombatStatDisplaySpec(key: string) { return COMBAT_STAT_DISPLAY_SPECS[key] }
export function isKnownCombatItemStatKey(key: string): key is ItemStatKey { return combatItemStatKeySet.has(key) }

export function formatCompactDecimal(value: number, maxDecimals = 2) {
  if (!Number.isFinite(value)) return String(value)
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals }).format(value)
}

function formatFixedDecimal(value: number, decimals: number) {
  if (!Number.isFinite(value)) return String(value)
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}

export function formatSignedDecimal(value: number, maxDecimals = 2) {
  const formatted = formatCompactDecimal(Math.abs(value), maxDecimals)
  if (value > 0) return `+${formatted}`
  if (value < 0) return `-${formatted}`
  return formatted
}

export function formatPercent(value: number, signed = false) {
  const percent = Math.round(value * 100)
  return signed && percent > 0 ? `+${percent}%` : `${percent}%`
}

export function formatSeconds(value: number) { return `${formatFixedDecimal(value, 1)}s` }
export function formatSignedNumber(value: number) { return formatSignedDecimal(value, 0) }
export function formatSignedPercent(value: number) { return formatPercent(value, true) }
export function formatMultiplierAsPercent(value: number) { return formatPercent(value) }
export function formatResistance(value: number) { return formatPercent(value, true) }
export function formatHealthWithBarrier(current: number, max: number, barrier = 0) {
  const health = `${Math.floor(current).toLocaleString()} / ${Math.floor(max).toLocaleString()}`
  const absorbShield = Math.max(0, Math.floor(barrier))
  return absorbShield > 0 ? `${health} (+${absorbShield.toLocaleString()})` : health
}

const labelAliases: Record<string, string> = {
  attack: 'Attack Power', defense: 'Armor', dodge: 'Dodge Chance', parry: 'Parry Chance', block: 'Block Chance',
  maxHealth: 'Max Health', attackPower: 'Attack Power', accuracy: 'Accuracy', attackInterval: 'Attack Interval', armor: 'Armor', physicalDirectMitigation: 'Physical direct mitigation', evasion: 'Evasion',
  critChance: 'Critical Hit Chance', critDamage: 'Critical Hit Damage', dodgeChance: 'Dodge Chance', parryChance: 'Parry Chance', blockChance: 'Block Chance', blockPower: 'Block Power',
  maxStamina: 'Max Stamina', staminaRegen: 'Stamina Regeneration', maxMana: 'Max Mana', manaRegen: 'Mana Regeneration', statusResistance: 'Status Resistance', healthRegen: 'Health Regen',
  physicalResistance: 'Physical Resistance', fireResistance: 'Fire Resistance', waterResistance: 'Water Resistance', earthResistance: 'Earth Resistance', airResistance: 'Air Resistance', lightResistance: 'Light Resistance', darknessResistance: 'Darkness Resistance', natureResistance: 'Nature Resistance', mysticResistance: 'Mystic Resistance',
  currentHealth: 'Current Health', stamina: 'Stamina', mana: 'Mana', barrier: 'Barrier', hitChance: 'Hit Chance',
}

export function labelForStatKey(key: string) { return labelAliases[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()) }

function formattedValue(spec: CombatStatDisplaySpec, value: number, mode: CombatStatFormatMode, signed = false) {
  const decimals = mode === 'comparison' ? spec.comparisonDecimals ?? spec.decimals : spec.decimals
  if (spec.valueKind === 'percent') return formatPercent(value, signed)
  if (spec.valueKind === 'seconds') return `${signed ? formatSignedDecimal(value, decimals) : mode === 'normal' ? formatFixedDecimal(value, decimals) : formatCompactDecimal(value, decimals)}s`
  if (spec.valueKind === 'per-second') return `${signed ? formatSignedDecimal(value, decimals) : mode === 'normal' ? formatFixedDecimal(value, decimals) : formatCompactDecimal(value, decimals)} / sec`
  return signed ? formatSignedDecimal(value, decimals) : formatCompactDecimal(value, decimals)
}

export function formatCombatStatValue(statKey: CombatStatDisplayKey | string, value: number, mode: CombatStatFormatMode = 'normal') {
  const spec = getCombatStatDisplaySpec(statKey)
  if (!spec) return formatCompactDecimal(value, mode === 'comparison' ? 2 : 1)
  const signedResistance = statKey.endsWith('Resistance') && statKey !== 'statusResistance'
  return formattedValue(spec, value, mode, signedResistance)
}

export function formatCombatStatDelta(statKey: string, value: number) {
  const spec = getCombatStatDisplaySpec(statKey)
  if (!spec) return formatSignedDecimal(value, 2)
  return formattedValue(spec, value, 'comparison', true)
}

export function formatItemStat(key: string, value: number): FormattedStat {
  const spec = getCombatStatDisplaySpec(key)
  if (!spec || !isKnownCombatItemStatKey(key)) {
    if (import.meta.env.DEV) console.warn(`[equipment] Unknown item stat display key: ${key}`)
    return { label: labelForStatKey(key), value: formatSignedDecimal(value, 2), tone: 'gold' }
  }
  if (key === 'attackInterval') return { label: 'Weapon Attack Interval', value: formattedValue(spec, value, 'comparison'), tone: 'gold' }
  if (spec.valueKind === 'percent') return { label: labelForStatKey(key), value: formattedValue(spec, value, 'normal', true), tone: value > 0 ? 'green' : value < 0 ? 'red' : 'default' }
  if (spec.valueKind === 'per-second') return { label: labelForStatKey(key), value: formattedValue(spec, value, 'comparison', true), tone: 'gold' }
  return { label: labelForStatKey(key), value: formattedValue(spec, value, 'normal', true), tone: 'gold' }
}

export function formatItemStats(stats: NonNullable<ItemDefinition['stats']>) { return Object.entries(stats).map(([key, value]) => formatItemStat(key, value)) }

export function statReferenceFor(key: string) { return combatStatReferenceById[key as CombatStatDisplayKey] }
