import { Eye, Lock, Swords } from 'lucide-react'
import type { ReactNode } from 'react'
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
  const actionLabel = !unlocked ? 'LOCKED' : isActive ? 'FIGHTING' : combatActive ? 'SWITCH TARGET' : 'FIGHT TARGET'

  return <div className="combat-target-preview" data-debug-kind="combat-target-inspector" data-debug-enemy-id={selectedTargetId}>
    <div className="combat-target-preview-heading">
      <div className={`combat-target-preview-icon ${isActive ? 'is-active' : ''}`}><PlaceholderArt icon={definition.icon} size="medium" variant={definition.accent} /></div>
      <div><span className="tiny-label">SELECTED TARGET</span><h4>{definition.name}</h4><p>{definition.enemyTier.toUpperCase()} - {definition.family}</p></div>
      <span className={`combat-target-preview-state ${isActive ? 'is-fighting' : unlocked ? 'is-selected' : 'is-locked'}`}>{isActive ? <Swords size={11} /> : !unlocked ? <Lock size={11} /> : <Eye size={11} />}{actionLabel}</span>
    </div>
    {target?.minHunterRank && !unlocked && <p className="combat-target-lock-copy">Requires Hunter Rank {target.minHunterRank}</p>}
    <div className="combat-target-detail-grid" data-debug-kind="combat-target-static-stats"><span>HP</span><strong>{definition.maxLife}</strong><span>Attack</span><strong>{formatDamageRange(stats.attackDamageMin ?? definition.baseAttackDamageMin, stats.attackDamageMax ?? definition.baseAttackDamageMax)}</strong><span>Attack Interval</span><strong>{formatSeconds(stats.attackInterval ?? definition.baseAttackTime)}</strong><span>Armour</span><strong>{Math.round(stats.armour ?? definition.armour)}</strong><span>Accuracy</span><strong>{Math.round(stats.accuracyRating ?? definition.accuracyRating)}</strong><span>Evasion</span><strong>{Math.round(stats.evasionRating ?? definition.evasionRating)}</strong></div>
    <InspectorTileSection title="TRAITS" empty={!definition.traits.length}>{getEnemyResolvedTraits(definition).map((trait) => <InspectorTile key={trait.assignment.traitId} icon="shield" label={trait.definition.name} tooltip={{ id: `trait:${trait.assignment.traitId}`, icon: 'shield', title: trait.definition.name, subtitle: `Rank ${trait.assignment.rank}`, description: trait.rank.description }} />)}</InspectorTileSection>
    <InspectorTileSection title="COMBAT ABILITIES" empty={!definition.combatAbilityIds.length}>{definition.combatAbilityIds.map((abilityId) => { const ability = enemyCombatAbilityById[abilityId]; if (!ability) return null; const icon = ability.category === 'defensive' ? 'shield' : ability.category === 'healing' ? 'heart' : 'sparkles'; return <InspectorTile key={ability.id} icon={icon} label={ability.name} tooltip={{ id: ability.id, icon, title: ability.name, subtitle: `${ability.category} - targets ${ability.target}`, description: ability.description, rows: [{ label: 'Preparation', value: formatSeconds(ability.preparationSeconds) }, { label: 'Cooldown', value: formatSeconds(ability.cooldownSeconds) }] }} /> })}</InspectorTileSection>
    <TargetPreviewLoot title="TARGET LOOT" drops={loot.targetLoot} source="Dropped by this target" />
    <TargetPreviewLoot title="ZONE SHARED LOOT" drops={loot.sharedLoot} source="Shared by this arena" />
  </div>
}

function InspectorTileSection({ title, empty, children }: { title: string; empty: boolean; children: ReactNode }) {
  return <div className="combat-target-preview-section"><span className="tiny-label">{title}</span><div className="combat-inspector-tile-grid" data-debug-kind="combat-inspector-tile-grid">{empty ? <small className="combat-target-muted">-</small> : children}</div></div>
}

function InspectorTile({ icon, label, tooltip }: { icon: string; label: string; tooltip: Parameters<typeof GameTooltip>[0]['content'] }) {
  return <GameTooltip content={tooltip} label={label}><button type="button" className="combat-inspector-tile" aria-label={label} data-debug-kind="combat-inspector-tile"><PlaceholderArt icon={icon} size="small" variant="gold" /></button></GameTooltip>
}

function TargetPreviewLoot({ title, drops, source }: { title: string; drops: Array<{ itemId: string; chance: number; minQuantity: number; maxQuantity: number }>; source: string }) {
  return <div className="combat-target-preview-section combat-target-preview-loot"><span className="tiny-label">{title}</span><div className="combat-inspector-tile-grid" data-debug-kind="combat-loot-tile-grid">{drops.length ? drops.map((drop) => { const item = itemById[drop.itemId]; if (!item) return null; return <InspectorTile key={drop.itemId} icon={item.icon} label={item.name} tooltip={{ id: item.id, icon: item.icon, title: item.name, subtitle: `${item.category} - ${source}`, description: item.description, rows: [{ label: 'Drop chance', value: formatPercent(drop.chance), tone: 'gold' }, { label: 'Quantity', value: drop.minQuantity === drop.maxQuantity ? `x${drop.minQuantity}` : `x${drop.minQuantity}-${drop.maxQuantity}` }] }} /> }) : <small className="combat-target-muted">-</small>}</div></div>
}
