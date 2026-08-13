import type { ActiveEffectInstance, EffectDefinition, CombatStatKey, DamageType } from '../combat/combatTypes'
import type { ItemDefinition } from '../data/items'
import { combatStatReferenceById } from '../data/combatGlossary'
import { effectById } from '../data/effects'
import { skillById } from '../data/skills'
import type { SpellDefinition } from '../data/spells'
import { stanceDefinitions } from '../data/stances'
import type { TechniqueId } from '../combat/combatTypes'
import { techniqueDefinitions } from '../data/techniques'
import { formatCombatStatValue, formatItemStats, formatPercent, formatSeconds, formatSignedNumber, labelForStatKey } from './statFormatting'
import type { TooltipModel, TooltipRow, TooltipTone } from './tooltipTypes'

const damageLabels: Record<DamageType, string> = { physical: 'Physical', fire: 'Fire', earth: 'Earth', air: 'Air', nature: 'Nature', mystic: 'Mystic', true: 'True' }
const kindLabels: Record<EffectDefinition['kind'], string> = { buff: 'Buff', debuff: 'Debuff', status: 'Status', barrier: 'Barrier' }
const categoryLabels: Record<ItemDefinition['category'], string> = { weapon: 'Weapon', armor: 'Armor', accessory: 'Accessory', material: 'Material', consumable: 'Consumable', currency: 'Currency' }
const rarityLabels: Record<ItemDefinition['rarity'], string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' }

const toneForValue = (value: number): TooltipTone => value > 0 ? 'green' : value < 0 ? 'red' : 'default'

export function buildItemTooltip(item: ItemDefinition, options: { quantity?: number; equipped?: boolean } = {}): TooltipModel {
  const rows = formatItemStats(item.stats ?? {}).map((row) => ({ label: row.label, value: row.value, tone: row.tone }))
  return { id: item.id, icon: item.icon, title: item.name, subtitle: `${categoryLabels[item.category]} · ${rarityLabels[item.rarity]}`, tone: item.rarity === 'rare' ? 'gold' : item.rarity === 'uncommon' ? 'blue' : 'default', description: item.description, rows, notes: [options.quantity !== undefined ? `Owned: ${options.quantity}` : '', options.equipped ? 'Currently equipped' : ''].filter(Boolean) }
}

export function buildStatTooltip(key: string, value: number, detail?: string): TooltipModel {
  const reference = combatStatReferenceById[key as keyof typeof combatStatReferenceById]
  const label = reference?.label ?? labelForStatKey(key)
  const rows: TooltipRow[] = [{ label: 'Current value', value: formatCombatStatValue(key, value), tone: toneForValue(value) }]
  if (detail) rows.push({ label: 'Context', value: detail, tone: 'blue' })
  return { id: `stat.${key}`, title: label, subtitle: reference ? `${reference.category[0].toUpperCase()}${reference.category.slice(1)} combat stat` : 'Combat stat', tone: reference?.category === 'resistances' ? toneForValue(value) : 'default', description: reference?.fullDescription ?? `Current combat value for ${label}.`, rows, notes: [reference?.formula, ...(reference?.notes ?? [])].filter((note): note is string => Boolean(note)) }
}

export function buildSkillTooltip(skill: keyof typeof skillById | (typeof skillById)[keyof typeof skillById]): TooltipModel {
  const definition = typeof skill === 'string' ? skillById[skill] : skill
  return { id: `skill.${definition.id}`, icon: definition.icon, title: definition.name, subtitle: 'Combat progression skill', description: definition.fullDescription, rows: [{ label: 'Current effect', value: definition.currentEffect, tone: definition.id === 'swordsmanship' || definition.id === 'defense' ? 'gold' : 'blue' }] }
}

export function buildEffectTooltip(instance: ActiveEffectInstance, definition: EffectDefinition = effectById[instance.effectId]): TooltipModel {
  const duration = instance.remainingSeconds === null ? 'Permanent while active' : formatSeconds(Math.max(0, instance.remainingSeconds))
  const rows: TooltipRow[] = [
    { label: 'Kind', value: kindLabels[definition.kind], tone: definition.kind === 'debuff' || definition.kind === 'status' ? 'red' : definition.kind === 'barrier' ? 'blue' : 'green' },
    { label: 'Remaining', value: duration, tone: 'blue' },
    { label: 'Stacks', value: `${instance.stacks}${definition.stacking.maxStacks > 1 ? ` / ${definition.stacking.maxStacks}` : ''}`, tone: instance.stacks > 1 ? 'gold' : 'default' },
    { label: 'Source', value: instance.source.kind === 'player' ? 'Hunter' : `Enemy ${instance.source.instanceId}`, tone: 'default' },
  ]
  if (definition.periodic) {
    const operation = definition.periodic.operation
    rows.push({ label: operation.type === 'damage' ? 'Periodic damage' : 'Periodic healing', value: operation.type === 'damage' ? `${formatSignedNumber(operation.baseAmount * instance.stacks)} ${damageLabels[operation.damageType]} every ${formatSeconds(definition.periodic.intervalSeconds)}` : `${operation.baseAmount * instance.stacks} every ${formatSeconds(definition.periodic.intervalSeconds)}`, tone: operation.type === 'damage' ? 'red' : 'green' })
  }
  for (const modifier of definition.statModifiers ?? []) rows.push({ label: labelForStatKey(modifier.stat), value: modifier.operation === 'flat' ? formatSignedNumber(modifier.value * instance.stacks) : `${modifier.value > 0 ? '+' : ''}${Math.round(modifier.value * 100)}%`, tone: toneForValue(modifier.value) })
  if (definition.kind === 'barrier') rows.push({ label: 'Remaining absorption', value: `${Math.floor(instance.runtimeValues?.absorbRemaining ?? definition.barrierAmount ?? 0)}`, tone: 'blue' })
  const notes = [`Stacking: ${definition.stacking.mode.replace('-', ' ')}`, `Persistence: ${definition.persistence.replace('-', ' ')}`]
  return { id: `${definition.id}.${instance.instanceId}`, icon: definition.icon, title: definition.name, subtitle: `${kindLabels[definition.kind]} · ${definition.tags.join(' · ')}`, tone: definition.kind === 'debuff' || definition.kind === 'status' ? 'red' : definition.kind === 'barrier' ? 'blue' : 'green', description: definition.description, rows, notes }
}

export function buildSpellTooltip(spell: SpellDefinition): TooltipModel {
  const rows: TooltipRow[] = [
    { label: 'Mana cost', value: `${spell.manaCost}`, tone: 'gold' },
    { label: 'Cooldown', value: formatSeconds(spell.cooldownSeconds), tone: 'blue' },
    { label: 'Target', value: spell.targetMode === 'self' ? 'Self' : spell.targetMode === 'allEnemies' ? 'All enemies' : 'Selected enemy' },
  ]
  if (spell.damage > 0) rows.push({ label: 'Base damage', value: `${spell.damage} ${damageLabels[spell.damageType ?? 'physical']}`, tone: 'red' })
  if (spell.barrierAmount) rows.push({ label: 'Barrier', value: `${spell.barrierAmount}`, tone: 'blue' })
  if (spell.applyEffects?.length) rows.push({ label: 'Applies', value: spell.applyEffects.map(({ effectId, chance }) => `${effectById[effectId]?.name ?? effectId}${chance < 1 ? ` (${formatPercent(chance)})` : ''}`).join(', '), tone: 'red' })
  if (spell.interruptsAction) rows.push({ label: 'Utility', value: 'Interrupts a selected enemy special action', tone: 'blue' })
  return { id: spell.id, icon: spell.icon, title: spell.name, subtitle: 'Combat spell', tone: spell.damageType === 'fire' ? 'red' : spell.barrierAmount ? 'blue' : 'gold', description: spell.description, rows }
}

export function buildTechniqueTooltip(id: TechniqueId): TooltipModel {
  const technique = techniqueDefinitions[id]
  const rows: TooltipRow[] = [{ label: 'Stamina drain', value: `${technique.staminaDrainPerSecond.toFixed(1)} / sec`, tone: 'blue' }]
  if (technique.accuracy) rows.push({ label: 'Accuracy', value: formatSignedNumber(technique.accuracy), tone: 'gold' })
  if (technique.dodge) rows.push({ label: 'Dodge Chance', value: formatPercent(technique.dodge, true), tone: 'green' })
  if (technique.parry) rows.push({ label: 'Parry Chance', value: formatPercent(technique.parry, true), tone: 'green' })
  return { id: `technique.${id}`, icon: 'spark', title: technique.name, subtitle: 'Sustained Technique', description: technique.description, rows, notes: ['Automatically deactivates when Stamina reaches zero.'] }
}

export function buildStanceTooltip(id: keyof typeof stanceDefinitions): TooltipModel {
  const stance = stanceDefinitions[id]
  const rows: TooltipRow[] = []
  const addMultiplier = (label: string, value: number, note?: string) => { if (value !== 1) rows.push({ label, value: `${value > 1 ? '+' : ''}${Math.round((value - 1) * 100)}%${note ? ` (${note})` : ''}`, tone: toneForValue(value - 1) }) }
  addMultiplier('Attack Power', stance.damage)
  addMultiplier('Armor', stance.armor)
  addMultiplier('Accuracy', stance.accuracy)
  addMultiplier('Attack Interval', stance.attackIntervalMultiplier, stance.attackIntervalMultiplier < 1 ? 'faster' : 'slower')
  if (stance.dodge) rows.push({ label: 'Dodge Chance', value: formatPercent(stance.dodge, true), tone: 'green' })
  if (stance.parry) rows.push({ label: 'Parry Chance', value: formatPercent(stance.parry, true), tone: 'green' })
  addMultiplier('Stamina Regeneration', stance.staminaRegenMultiplier)
  addMultiplier('Stamina Drain', stance.staminaDrainMultiplier)
  return { id: `stance.${id}`, icon: 'shield', title: stance.name, subtitle: 'Combat stance', tone: id === 'high' ? 'red' : id === 'low' ? 'blue' : 'default', description: stance.description, rows }
}
