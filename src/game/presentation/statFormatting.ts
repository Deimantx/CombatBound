import type { CombatStatDisplayKey } from '../data/combatGlossary'
import type { DamageType } from '../combat/combatTypes'
import { combatStatReferenceById } from '../data/combatGlossary'
import type { ItemDefinition } from '../data/items'
import { COMBAT_STAT_DEFINITION_BY_ID, COMBAT_STAT_REGISTRY } from './combatStatRegistry'

export type ItemStatKey = NonNullable<ItemDefinition['stats']> extends infer Stats ? keyof Stats & string : string
export interface FormattedStat { label: string; value: string; tone?: 'default' | 'gold' | 'blue' | 'green' | 'red' }
export interface DamageRange { min: number; max: number }
export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = { physical: 'Physical', fire: 'Fire', cold: 'Cold', lightning: 'Lightning', chaos: 'Chaos' }

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

const canonicalDisplaySpecs: CombatStatDisplaySpec[] = COMBAT_STAT_REGISTRY.map((entry) => ({
  key: entry.id,
  valueKind: entry.format === 'number' ? 'flat' : entry.format,
  decimals: entry.format === 'seconds' || entry.format === 'per-second' ? 1 : 0,
  comparisonDecimals: entry.format === 'seconds' || entry.format === 'per-second' ? 2 : undefined,
  comparisonDirection: entry.comparisonDirection,
}))
const displaySpecs: CombatStatDisplaySpec[] = [
  ...canonicalDisplaySpecs,
  ...['attackDamage', 'baseDamageMin', 'baseDamageMax', 'maxLife', 'accuracyRating', 'evasionRating', 'armour', 'maxStamina', 'maxMana', 'attacksPerSecond', 'castsPerSecond'].map((key) => flatHigher(key)),
  ...['lifeRegenFlat', 'staminaRegen', 'manaRegenFlat'].map((key) => regenHigher(key)),
  ...['attackInterval', 'baseAttackTime', 'baseCastTime', 'castTime'].map((key) => ({ key, valueKind: 'seconds' as const, decimals: 1, comparisonDecimals: 2, comparisonDirection: 'lower-is-better' as const })),
  ...['baseCritChance', 'additionalBaseCritChance', 'criticalStrikeMultiplier', 'attackBlockChance', 'maxAttackBlockChance', 'spellBlockChance', 'maxSpellBlockChance', 'spellSuppressionChance', 'suppressedSpellDamagePrevented', 'additionalPhysicalDamageReduction', 'ailmentDurationReduction', 'nonDamagingAilmentEffectReduction', 'increasedDamageTaken', 'hitChance',
    'fireResistance', 'coldResistance', 'lightningResistance', 'chaosResistance', 'maxFireResistance', 'maxColdResistance', 'maxLightningResistance', 'maxChaosResistance'].map((key) => percentHigher(key)),
  ...['currentHealth', 'stamina', 'mana', 'barrier'].map((key) => flatHigher(key, 1)),
]

export const COMBAT_STAT_DISPLAY_SPECS: Readonly<Record<string, CombatStatDisplaySpec>> = Object.fromEntries(displaySpecs.map((spec) => [spec.key, spec]))
export const COMBAT_ITEM_STAT_KEYS = [
  'baseDamageMin', 'baseDamageMax', 'baseAttackTime', 'accuracyRating', 'armour', 'evasionRating', 'maxLife', 'lifeRegenFlat', 'maxStamina', 'staminaRegen', 'maxMana', 'manaRegenFlat',
  'baseCritChance', 'additionalBaseCritChance', 'criticalStrikeMultiplier', 'attackBlockChance', 'maxAttackBlockChance', 'spellBlockChance', 'maxSpellBlockChance', 'spellSuppressionChance', 'ailmentDurationReduction', 'elementalAilmentAvoidance', 'physicalAilmentAvoidance', 'nonDamagingAilmentEffectReduction', 'increasedDamageTaken', 'actionSpeed', 'increasedAttackSpeed', 'increasedCastSpeed', 'additionalPhysicalDamageReduction',
  'fireResistance', 'coldResistance', 'lightningResistance', 'chaosResistance', 'maxFireResistance', 'maxColdResistance', 'maxLightningResistance', 'maxChaosResistance',
] as const
const combatItemStatKeySet = new Set<string>(COMBAT_ITEM_STAT_KEYS)

export function getCombatStatDisplaySpec(key: string) { return COMBAT_STAT_DISPLAY_SPECS[key] }
export function isKnownCombatItemStatKey(key: string): key is ItemStatKey { return combatItemStatKeySet.has(key) }

export function formatCompactDecimal(value: number, maxDecimals = 2) {
  if (!Number.isFinite(value)) return String(value)
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals }).format(value)
}

export function formatDamageRange(min: number, max: number, maxDecimals = 1) {
  const low = formatCompactDecimal(min, maxDecimals)
  const high = formatCompactDecimal(max, maxDecimals)
  return min === max ? low : `${low}–${high}`
}

export function damageTypeLabel(damageType: DamageType) { return DAMAGE_TYPE_LABELS[damageType] }

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
  attackDamage: 'Attack Damage', baseDamageMin: 'Base Damage Min', baseDamageMax: 'Base Damage Max', baseAttackTime: 'Base Attack Time', maxLife: 'Max Life', accuracyRating: 'Accuracy Rating', attackInterval: 'Attack Interval', armour: 'Armour', evasionRating: 'Evasion Rating',
  baseCritChance: 'Base Critical Chance', additionalBaseCritChance: 'Additional Base Critical Chance', criticalStrikeMultiplier: 'Critical Strike Multiplier', attackBlockChance: 'Attack Block Chance', maxAttackBlockChance: 'Maximum Attack Block Chance', spellBlockChance: 'Spell Block Chance', maxSpellBlockChance: 'Maximum Spell Block Chance', spellSuppressionChance: 'Spell Suppression Chance', suppressedSpellDamagePrevented: 'Suppressed Spell Damage Prevented', increasedDamageTaken: 'Increased Damage Taken', nonDamagingAilmentEffectReduction: 'Non-Damaging Ailment Effect Reduction',
  maxStamina: 'Max Stamina', staminaRegen: 'Stamina Regeneration', maxMana: 'Max Mana', manaRegenFlat: 'Mana Regeneration', lifeRegenFlat: 'Life Regen',
  fireResistance: 'Fire Resistance', coldResistance: 'Cold Resistance', lightningResistance: 'Lightning Resistance', chaosResistance: 'Chaos Resistance',
  ailmentDurationReduction: 'Ailment Duration Reduction',
  currentHealth: 'Current Health', stamina: 'Stamina', mana: 'Mana', barrier: 'Barrier', hitChance: 'Hit Chance',
}

export function labelForStatKey(key: string) { return labelAliases[key] ?? COMBAT_STAT_DEFINITION_BY_ID[key as keyof typeof COMBAT_STAT_DEFINITION_BY_ID]?.label ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()) }

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
  const signedResistance = statKey.endsWith('Resistance')
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
  if (key === 'baseAttackTime') return { label: 'Weapon Base Attack Time', value: formattedValue(spec, value, 'comparison'), tone: 'gold' }
  if (spec.valueKind === 'percent') return { label: labelForStatKey(key), value: formattedValue(spec, value, 'normal', true), tone: value > 0 ? 'green' : value < 0 ? 'red' : 'default' }
  if (spec.valueKind === 'per-second') return { label: labelForStatKey(key), value: formattedValue(spec, value, 'comparison', true), tone: 'gold' }
  return { label: labelForStatKey(key), value: formattedValue(spec, value, 'normal', true), tone: 'gold' }
}

export function formatItemStats(stats: NonNullable<ItemDefinition['stats']>) {
  const rows: FormattedStat[] = []
  const hasMin = typeof stats.baseDamageMin === 'number' && Number.isFinite(stats.baseDamageMin)
  const hasMax = typeof stats.baseDamageMax === 'number' && Number.isFinite(stats.baseDamageMax)
  if (hasMin || hasMax) {
    const min = hasMin ? stats.baseDamageMin! : stats.baseDamageMax!
    const max = hasMax ? stats.baseDamageMax! : stats.baseDamageMin!
    rows.push({ label: 'Physical Damage', value: formatDamageRange(min, max), tone: 'gold' })
  }
  for (const [key, value] of Object.entries(stats)) {
    if (key === 'baseDamageMin' || key === 'baseDamageMax') continue
    rows.push(formatItemStat(key, value))
  }
  return rows
}

export function statReferenceFor(key: string) { return combatStatReferenceById[key as CombatStatDisplayKey] }
