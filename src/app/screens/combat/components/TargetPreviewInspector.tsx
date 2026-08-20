import { Eye, Lock, Swords } from 'lucide-react'
import { enemyById } from '../../../../game/data/enemies'
import { enemyCombatAbilityById } from '../../../../game/data/enemyCombatAbilities'
import { itemById } from '../../../../game/data/items'
import { getEnemyEffectiveCombatStats } from '../../../../game/combat/combatSelectors'
import { instantiateCombatTarget } from '../../../../game/combat/combatState'
import { getCombatTargetLootPreview } from '../../../../game/combat/combatRewards'
import type { CombatLocationDefinition } from '../../../../game/world/worldTypes'
import { getEnemyResolvedTraits } from '../../../../game/enemyTraits/enemyTraitSelectors'
import { formatDamageRange, formatPercent, formatSeconds } from '../../../../game/presentation/statFormatting'
import { PlaceholderArt } from '../../../components/PlaceholderArt'
import { GameTooltip } from '../../../components/tooltip/GameTooltip'
import { isCombatTargetUnlocked } from '../combatLocationPresentation'

interface TargetPreviewInspectorProps {
  location: CombatLocationDefinition
  selectedTargetId: string
  hunterRank: number
  locationAvailable: boolean
  activeLocationId?: string
  activeTargetId?: string | null
  combatActive: boolean
}

export function TargetPreviewInspector({ location, selectedTargetId, hunterRank, locationAvailable, activeLocationId, activeTargetId, combatActive }: TargetPreviewInspectorProps) {
  const definition = enemyById[selectedTargetId]
  const preview = instantiateCombatTarget(selectedTargetId, 0)
  if (!definition || !preview) return null

  const stats = getEnemyEffectiveCombatStats(preview)
  const isActive = combatActive && activeLocationId === location.id && activeTargetId === selectedTargetId
  const unlocked = isCombatTargetUnlocked(location, selectedTargetId, hunterRank, locationAvailable)
  const target = location.targets.find((entry) => entry.enemyId === selectedTargetId)
  const loot = getCombatTargetLootPreview(location, definition)
  const tier = definition.enemyTier.toUpperCase()
  const actionLabel = !unlocked ? 'LOCKED' : isActive ? 'FIGHTING' : combatActive ? 'SWITCH TARGET' : 'FIGHT TARGET'

  return <div className="combat-target-preview" data-debug-kind="combat-target-inspector" data-debug-enemy-id={selectedTargetId}>
    <div className="combat-target-preview-heading">
      <div className={`combat-target-preview-icon ${isActive ? 'is-active' : ''}`}><PlaceholderArt icon={definition.icon} size="medium" variant={definition.accent} /></div>
      <div>
        <span className="tiny-label">SELECTED TARGET</span>
        <h4>{definition.name}</h4>
        <p>{tier} · {definition.family}</p>
      </div>
      <span className={`combat-target-preview-state ${isActive ? 'is-fighting' : unlocked ? 'is-selected' : 'is-locked'}`}>{isActive ? <Swords size={11} /> : !unlocked ? <Lock size={11} /> : <Eye size={11} />}{actionLabel}</span>
    </div>
    {target?.minHunterRank && !unlocked && <p className="combat-target-lock-copy">Requires Hunter Rank {target.minHunterRank}</p>}
    <div className="combat-target-detail-grid" data-debug-kind="combat-target-static-stats">
      <span>HP</span><strong>{definition.maxLife}</strong>
      <span>Attack</span><strong>{formatDamageRange(stats.attackDamageMin ?? definition.baseAttackDamageMin, stats.attackDamageMax ?? definition.baseAttackDamageMax)}</strong>
      <span>Attack Interval</span><strong>{formatSeconds(stats.attackInterval ?? definition.baseAttackTime)}</strong>
      <span>Armour</span><strong>{Math.round(stats.armour ?? definition.armour)}</strong>
      <span>Accuracy</span><strong>{Math.round(stats.accuracyRating ?? definition.accuracyRating)}</strong>
      <span>Evasion</span><strong>{Math.round(stats.evasionRating ?? definition.evasionRating)}</strong>
    </div>
    <div className="combat-target-preview-section"><span className="tiny-label">TRAITS · {definition.traits.length}</span>{definition.traits.length ? getEnemyResolvedTraits(definition).map((trait) => <GameTooltip key={trait.assignment.traitId} content={{ id: `trait:${trait.assignment.traitId}`, icon: 'shield', title: trait.definition.name, subtitle: `Rank ${trait.assignment.rank}`, description: trait.rank.description }}><span className="combat-target-preview-row"><strong>{trait.definition.name}</strong><small>Rank {trait.assignment.rank}</small></span></GameTooltip>) : <small className="combat-target-muted">No traits</small>}</div>
    <div className="combat-target-preview-section"><span className="tiny-label">COMBAT ABILITIES · {definition.combatAbilityIds.length}</span>{definition.combatAbilityIds.length ? definition.combatAbilityIds.map((abilityId) => { const ability = enemyCombatAbilityById[abilityId]; return ability ? <span className="combat-target-preview-row" key={ability.id}><strong>{ability.name}</strong><small>Prep {formatSeconds(ability.preparationSeconds)} · CD {formatSeconds(ability.cooldownSeconds)}</small></span> : null }) : <small className="combat-target-muted">No combat abilities</small>}</div>
    <TargetPreviewLoot title="TARGET LOOT" drops={loot.targetLoot} />
    <TargetPreviewLoot title="ZONE SHARED LOOT" drops={loot.sharedLoot} note="Every kill in this arena" />
  </div>
}

function TargetPreviewLoot({ title, drops, note }: { title: string; drops: Array<{ itemId: string; chance: number; minQuantity: number; maxQuantity: number }>; note?: string }) {
  return <div className="combat-target-preview-section combat-target-preview-loot"><div className="combat-target-preview-section-heading"><span className="tiny-label">{title}</span>{note && <small>{note}</small>}</div>{drops.length ? drops.map((drop) => { const item = itemById[drop.itemId]; if (!item) return null; return <GameTooltip key={drop.itemId} content={{ id: item.id, icon: item.icon, title: item.name, subtitle: item.category, description: item.description, rows: [{ label: 'Drop chance', value: formatPercent(drop.chance), tone: 'gold' }] }}><span className="combat-target-loot-row"><PlaceholderArt icon={item.icon} size="small" variant="gold" /><strong>{item.name}</strong><small>{formatPercent(drop.chance)}{drop.maxQuantity > 1 ? ` · x${drop.minQuantity}-${drop.maxQuantity}` : ''}</small></span></GameTooltip> }) : <small className="combat-target-muted">No drops</small>}</div>
}
