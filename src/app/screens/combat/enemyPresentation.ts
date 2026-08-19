import type { EnemyDefinition } from '../../../game/combat/combatTypes'
import { enemyById } from '../../../game/data/enemies'
import { formatDamageRange, formatPercent, formatSeconds } from '../../../game/presentation/statFormatting'
import type { TooltipModel, TooltipRow, TooltipSection, TooltipTone } from '../../components/tooltip/tooltipTypes'

export interface EnemyPresentation {
  enemyId: string
  name: string
  enemy?: EnemyDefinition
}

export function enemyPresentation(enemyId: string): EnemyPresentation {
  const enemy = enemyById[enemyId]
  return { enemyId, name: enemy?.name ?? 'Unknown Enemy', enemy }
}

export function enemyTooltipModel(enemyId: string): TooltipModel {
  const enemy = enemyById[enemyId]
  if (!enemy) return { id: `enemy:${enemyId}`, icon: 'target', title: 'Unknown Enemy', subtitle: 'Enemy details unavailable', description: 'Enemy details are unavailable.' }

  const rows: TooltipRow[] = [
    { label: 'Life', value: `${enemy.maxLife}`, tone: 'green' },
    { label: 'Damage', value: formatDamageRange(enemy.baseAttackDamageMin, enemy.baseAttackDamageMax), tone: 'red' },
    { label: 'Accuracy', value: `${enemy.accuracyRating}`, tone: 'gold' },
    { label: 'Armour', value: `${enemy.armour}`, tone: 'blue' },
    { label: 'Evasion', value: `${enemy.evasionRating}`, tone: 'blue' },
    { label: 'Attack Interval', value: formatSeconds(enemy.baseAttackTime), tone: 'blue' },
  ]
  if ((enemy.blockChance ?? 0) > 0) rows.push({ label: 'Block Chance', value: formatPercent(enemy.blockChance ?? 0), tone: 'blue' })

  const sections: TooltipSection[] = [{ id: 'enemy-stats', title: 'CORE STATS', rows }]
  if (enemy.traits.length > 0) sections.push({ id: 'enemy-traits', title: 'TRAITS', notes: enemy.traits.map((trait) => `${trait.name} — ${trait.description}`) })
  if (enemy.actions.length > 0) sections.push({ id: 'enemy-actions', title: 'SPECIAL ACTIONS', notes: enemy.actions.map((action) => {
    const danger = action.danger ? ` [${action.danger.toUpperCase()}]` : ''
    const timing = ` Prep ${formatSeconds(action.preparationSeconds)} · Cooldown ${formatSeconds(action.cooldownSeconds)}`
    return `${action.name}${danger} — ${action.description}${timing}`
  }) })

  const resistances = Object.entries(enemy.resistances).filter(([, value]) => value !== 0)
  if (resistances.length > 0) sections.push({
    id: 'enemy-resistances',
    title: 'RESISTANCES',
    rows: resistances.map(([damageType, value]) => ({ label: `${damageType[0].toUpperCase()}${damageType.slice(1)}`, value: formatPercent(value, true), tone: value < 0 ? 'red' : 'blue' } satisfies TooltipRow)),
  })

  return {
    id: `enemy:${enemy.id}`,
    icon: enemy.icon,
    title: enemy.name,
    subtitle: enemy.family,
    tone: enemyTone(enemy.accent),
    sections,
  }
}

function enemyTone(accent: EnemyDefinition['accent']): TooltipTone {
  if (accent === 'gold' || accent === 'red' || accent === 'blue') return accent
  return 'default'
}
