import { Crosshair, Heart, Pause, Play, Sparkles, Swords, Target, Timer, Zap } from 'lucide-react'
import { useState } from 'react'
import { enemyById } from '../../../../game/data/enemies'
import { spellDefinitions } from '../../../../game/data/spells'
import type { CombatState, EnemyActionDefinition, EnemyCombatInstance } from '../../../../game/combat/combatTypes'
import type { GameState } from '../../../../game/gameState'
import type { HunterCombatStats } from '../../../../game/equipment/derivedStats'
import type { CombatLocationDefinition } from '../../../../game/world/worldTypes'
import { Panel } from '../../../components/Panel'
import { PlaceholderArt } from '../../../components/PlaceholderArt'
import { ProgressBar } from '../../../components/ProgressBar'
import { techniqueDrain, combatProgress, combatTimerLabel, getSpellUiState, useSmoothCombatProgress } from './combatUi'

interface LiveHuntPanelProps {
  game: GameState
  stats: HunterCombatStats
  location?: CombatLocationDefinition
  selectedEnemy?: EnemyCombatInstance
  selectedDefinition: (typeof enemyById)[keyof typeof enemyById]
  onSelectTarget: (instanceId: string) => void
  onCastSpell: (spellId: string) => void
  onUsePotion: () => void
  onStartHunt: () => void
  onStopHunt: () => void
}

export function LiveHuntPanel({ game, stats, location, selectedEnemy, selectedDefinition, onSelectTarget, onCastSpell, onUsePotion, onStartHunt, onStopHunt }: LiveHuntPanelProps) {
  const combat = game.combat
  const active = combat.phase === 'active' || combat.phase === 'recovery'
  const alive = combat.enemies.filter((enemy) => !enemy.defeated).length
  const [logExpanded, setLogExpanded] = useState(false)
  const selectedAction = selectedEnemy?.currentAction ? selectedDefinition.actions.find((action) => action.id === selectedEnemy.currentAction?.actionId) : undefined
  const playerAttackProgress = useSmoothCombatProgress(combat.playerAttackTimer, combat.playerAttackInterval)
  const netEnergy = stats.energyRegen - techniqueDrain(combat)
  const statusLabel = combat.phase === 'active' ? 'LIVE HUNT' : combat.phase === 'recovery' ? 'GROUP RECOVERY' : combat.phase.toUpperCase()
  const potionQuantity = game.inventory.quantities['item.healing-potion'] ?? 0
  const potionReady = combat.phase === 'active' && combat.potionCooldownRemaining <= 0 && potionQuantity > 0 && combat.playerHp < stats.maxHealth
  const potionStatus = combat.potionCooldownRemaining > 0 ? `COOLDOWN ${combat.potionCooldownRemaining.toFixed(1)}s` : potionQuantity <= 0 ? 'OUT OF STOCK' : combat.playerHp >= stats.maxHealth ? 'FULL HEALTH' : 'READY'

  return <Panel title="Live hunt" subtitle={active ? `${location?.name ?? 'Combat Location'} · Group ${combat.groupNumber} · ${alive} enemies alive` : combat.stopReason ? `Stopped: ${combat.stopReason}` : 'Start a Combat Location Hunt to generate a group'} icon={Swords} panelId="liveCombat" screen="combat" className="live-combat-panel">
    <div className={`combat-status ${combat.phase === 'active' ? 'is-active' : ''}`}><span className="status-pulse" /><span>{statusLabel}</span>{location && <small>{location.name}</small>}<span className="combat-round">GROUP {combat.groupNumber || '—'}</span></div>
    <div className="combat-resource-hud" data-debug-kind="combat-resource-hud">
      <Resource label="HP" value={combat.playerHp} max={stats.maxHealth} icon={<Heart size={13} />} variant="health" className="resource-health" resource="hp" />
      <Resource label="Energy" value={combat.energy} max={combat.maxEnergy} icon={<Zap size={13} />} variant="resource" resource="energy" net={netEnergy} detail={`+${stats.energyRegen.toFixed(1)} regen · -${techniqueDrain(combat).toFixed(1)} techniques`} />
      <Resource label="Adrenaline" value={combat.adrenaline} max={combat.maxAdrenaline} icon={<Sparkles size={13} />} variant="experience" resource="adrenaline" />
    </div>
    <div className="player-attack-progress" data-debug-kind="player-attack"><div className="player-attack-heading"><span><Swords size={11} /> YOUR ATTACK</span><strong>{combat.phase === 'active' ? combatTimerLabel(combat.playerAttackTimer, combat.playerAttackInterval) : combat.phase === 'recovery' ? 'Paused during recovery' : 'Waiting for target'}</strong></div><ProgressBar value={combat.phase === 'active' ? playerAttackProgress.value : 0} variant="attack" className={`player-attack-bar ${playerAttackProgress.isResetting ? 'is-attack-resetting' : ''}`} ariaLabel="Player attack progress" /><small>{selectedEnemy && !selectedEnemy.defeated ? `Target: ${selectedEnemy.displayName}` : 'Select an enemy target'}</small></div>
    {combat.phase === 'recovery' && <div className="combat-recovery-banner"><strong>GROUP CLEARED</strong><span>Recovering · next group in {combat.recoveryRemaining.toFixed(1)}s</span></div>}
    <div className="enemy-group-heading"><span className="tiny-label">ENEMY GROUP</span><strong>{alive} ALIVE</strong></div>
    <div className="enemy-roster" aria-label="Generated hunt group">{combat.enemies.length > 0 ? combat.enemies.map((enemy) => <EnemyCard key={enemy.instanceId} enemy={enemy} selected={enemy.instanceId === combat.selectedEnemyInstanceId} onSelect={onSelectTarget} />) : <div className="combat-empty-state"><Target size={20} /><strong>NO ACTIVE HUNT</strong><span>Choose a Combat Location above to generate an enemy group.</span></div>}</div>
    <div className="spell-controls"><div className="section-title"><span className="tiny-label">COMBAT ACTIONS</span><small>{selectedAction?.interruptible ? 'INTERRUPT AVAILABLE' : 'Spells and consumables'}</small></div>{selectedAction?.interruptible && <div className="interrupt-window"><Crosshair size={13} /><strong>INTERRUPT WINDOW OPEN</strong><span>Disrupting Pulse can stop {selectedAction.name}.</span></div>}<div className="spell-grid">{spellDefinitions.map((spell) => { const runtime = combat.spells.find((entry) => entry.spellId === spell.id); const state = getSpellUiState(spell, runtime, combat, selectedAction); return <button key={spell.id} className={`spell-button is-${state.tone} ${spell.id === 'spell.disrupting-pulse' && state.enabled ? 'is-interrupt-ready' : ''}`} onClick={() => onCastSpell(spell.id)} disabled={!state.enabled} title={`${spell.description} · ${spell.cooldownSeconds}s cooldown`} data-debug-kind="spell" data-debug-spell-id={spell.id}><PlaceholderArt icon={spell.icon} size="small" variant={state.enabled ? 'gold' : 'muted'} /><span><strong>{spell.name}</strong><small>{spell.cost} ADR · {state.status}</small></span></button> })}<button className={`spell-button potion-button ${potionReady ? 'is-ready' : 'is-invalid'}`} onClick={onUsePotion} disabled={!potionReady} title="Restore health with a Healing Potion" data-debug-kind="potion"><PlaceholderArt icon="heart" size="small" variant="gold" /><span><strong>Healing Potion ×{potionQuantity}</strong><small>{potionStatus}</small></span></button></div></div>
    <div className="hunt-control-row"><div><span className="tiny-label">HUNT CONTROL</span><small>{active ? '∞ New groups continue automatically' : 'Ready to generate a random group'}</small></div><button aria-label={active ? 'Stop hunt' : 'Start hunt'} className="button button-primary fight-button" onClick={active ? onStopHunt : onStartHunt} data-debug-kind="combat-control" data-debug-label={active ? 'Stop hunt' : 'Start hunt'}>{active ? <><Pause size={15} />Stop Hunt</> : <><Play size={15} />Start Hunt</>}</button></div>
    <div className={`combat-log ${logExpanded ? 'is-expanded' : 'is-collapsed'}`} data-debug-kind="combat-log"><button className="combat-log-heading" onClick={() => setLogExpanded((value) => !value)} aria-expanded={logExpanded}><span className="tiny-label">{logExpanded ? '▾' : '▸'} COMBAT LOG</span><span>{combat.log.length} events</span></button>{logExpanded && <div className="combat-log-list">{combat.log.slice(0, 12).map((entry) => <div className={`combat-log-entry log-${entry.type}`} key={entry.id}><time>{entry.time}</time><span>{entry.text}</span></div>)}</div>}</div>
  </Panel>
}

function EnemyCard({ enemy, selected, onSelect }: { enemy: EnemyCombatInstance; selected: boolean; onSelect: (instanceId: string) => void }) {
  const definition = enemyById[enemy.enemyId]
  const action = enemy.currentAction ? definition.actions.find((candidate) => candidate.id === enemy.currentAction?.actionId) : undefined
  const normalAttackProgress = useSmoothCombatProgress(enemy.attackTimer, enemy.attackInterval)
  const label = `${enemy.displayName}, ${Math.floor(enemy.currentHealth)} of ${enemy.maxHealth} HP, ${selected ? 'targeted' : enemy.defeated ? 'defeated' : 'available'}`

  return <button className={`enemy-combat-card ${selected ? 'is-targeted' : ''} ${enemy.defeated ? 'is-defeated' : ''} ${action ? `has-special danger-${action.danger}` : ''}`} onClick={() => onSelect(enemy.instanceId)} aria-label={label} aria-pressed={selected} data-debug-kind="combat-enemy" data-debug-enemy-id={enemy.enemyId} data-debug-instance-id={enemy.instanceId} data-debug-label={enemy.displayName}>
    <div className="enemy-card-top"><PlaceholderArt icon={definition.icon} size="small" variant={definition.accent} /><span><strong>{selected && <Crosshair size={11} />} {enemy.displayName}</strong><small>{enemy.defeated ? 'DEFEATED' : `${Math.floor(enemy.currentHealth)} / ${enemy.maxHealth} HP`}</small></span><em className={selected ? 'target-tag' : ''}>{selected ? 'TARGETED' : enemy.defeated ? 'DEFEATED' : 'SELECT'}</em></div>
    {!enemy.defeated && <><ProgressBar value={(enemy.currentHealth / enemy.maxHealth) * 100} variant="health" className="enemy-health-bar" ariaLabel={`${enemy.displayName} health`} /><div className="enemy-card-timer"><span><Timer size={11} /> NORMAL ATTACK</span><strong>{combatTimerLabel(enemy.attackTimer, enemy.attackInterval)}</strong></div>{!action && <ProgressBar value={normalAttackProgress.value} variant="attack" className={`enemy-action-progress ${normalAttackProgress.isResetting ? 'is-attack-resetting' : ''}`} ariaLabel={`${enemy.displayName} normal attack progress`} />}{action && <div className={`special-intent danger-${action.danger}`}><div className="special-intent-heading"><span>⚠ {action.name}</span><strong>{combatTimerLabel(enemy.currentAction!.remainingSeconds, enemy.currentAction!.totalSeconds)}</strong></div><ProgressBar value={combatProgress(enemy.currentAction!.remainingSeconds, enemy.currentAction!.totalSeconds)} variant="attack" className="enemy-action-progress" ariaLabel={`${action.name} progress`} /><small><span>{action.danger.toUpperCase()} DANGER</span><strong>{action.interruptible ? 'INTERRUPTIBLE' : 'UNINTERRUPTIBLE'}</strong></small></div>}</>}
  </button>
}

function Resource({ label, value, max, icon, variant, detail, net, className = '', resource }: { label: string; value: number; max: number; icon: React.ReactNode; variant: 'health' | 'resource' | 'experience'; detail?: string; net?: number; className?: string; resource: string }) {
  const rateClass = net !== undefined && net < 0 ? 'is-negative' : net !== undefined && net > 0 ? 'is-positive' : ''
  return <div className={`resource-block ${className}`} data-debug-kind="combat-resource" data-debug-resource={resource}><div className="resource-heading"><span>{icon} {label}</span><strong>{Math.floor(value)} / {max}</strong></div><ProgressBar value={(value / max) * 100} variant={variant} className="resource-bar" ariaLabel={`${label} ${Math.floor(value)} of ${max}`} />{net !== undefined && <strong className={`resource-net ${rateClass}`}>Net Energy: {net >= 0 ? '+' : ''}{net.toFixed(1)}/s</strong>}{detail && <small className="resource-rate-detail">{detail}</small>}</div>
}
