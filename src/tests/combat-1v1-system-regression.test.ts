import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game/gameState'
import { calculateHunterCombatStats } from '../game/equipment/derivedStats'
import { calculateDefensiveTrainingAwards } from '../game/equipment/defensiveEquipment'
import { createCombatContext, executePlayerAction, resolveDefensiveTrainingForCombatEvent, startCombatTarget } from '../game/combat/combatEngine'
import { getPlayerActionDefinitions, validatePlayerAction } from '../game/combat/playerActions'
import { weaponSkillDefinitions } from '../game/data/weaponSkills'
import { evaluateAutomation, normalizeCombatAutomation } from '../game/automation/automationLogic'
import { createDeterministicOfflineRng } from '../game/offline/offlineActivityContract'
import { simulateCombatHuntOffline } from '../game/offline/offlineCombatSimulation'

describe('1v1 player, automation, defensive, and offline regressions', () => {
  it('keeps defensive training split by equipped category and resolved event', () => {
    expect(calculateDefensiveTrainingAwards({ lightArmorPieces: 1, mediumArmorPieces: 1, heavyArmorPieces: 2, shieldEquipped: true })).toMatchObject({ 'light-armor': .25, 'medium-armor': .25, 'heavy-armor': .5, shield: 1 })
    const game = createInitialGameState()
    const unchanged = resolveDefensiveTrainingForCombatEvent(game, { source: 'enemy-normal-attack', resolved: false })
    expect(unchanged).toBe(game)
  })

  it('keeps weapon skills in the player action pipeline and respects the selected enemy', () => {
    const skill = weaponSkillDefinitions[0]
    expect(skill.proficiencyId).toBe('one-handed-sword')
    expect(skill.staminaCost).toBeGreaterThan(0)
    const initial = createInitialGameState()
    const configured = { ...initial, combatAbilities: { ...initial.combatAbilities, slots: [skill.id, null, null, null, null] } }
    const stats = calculateHunterCombatStats(configured.equipment, configured.inventory, configured.progression)
    const context = createCombatContext({ next: () => .5 })
    const active = startCombatTarget(configured, 'location.wolf-den', 'enemy.grey-wolf', stats, context)
    expect(getPlayerActionDefinitions(active, context).some((action) => action.id === skill.id)).toBe(true)
    expect(validatePlayerAction(active, skill.id, stats, context).valid).toBe(true)
    const used = executePlayerAction(active, skill.id, stats, context)
    expect(used.combat.actionCooldowns[skill.id]).toBe(skill.cooldownSeconds)
    expect(used.combat.targetEnemyId).toBe('enemy.grey-wolf')
  })

  it('normalizes automation to direct current-target conditions and can select an equipped action', () => {
    const initial = createInitialGameState()
    const skill = weaponSkillDefinitions[0]
    const configured = { ...initial, combatAbilities: { ...initial.combatAbilities, slots: [skill.id, null, null, null, null] }, combatAutomation: normalizeCombatAutomation({ enabled: true, rules: [{ id: 'rule.skill', actionId: skill.id, priority: 1, enabled: true, conditions: [{ type: 'always' }] }] }) }
    const stats = calculateHunterCombatStats(configured.equipment, configured.inventory, configured.progression)
    const context = createCombatContext({ next: () => .5 })
    const active = startCombatTarget(configured, 'location.wolf-den', 'enemy.grey-wolf', stats, context)
    expect(evaluateAutomation(active, stats, context).actionId).toBe(skill.id)
  })

  it('keeps offline combat on the same selected target and completes requested time', () => {
    const initial = createInitialGameState()
    const stats = calculateHunterCombatStats(initial.equipment, initial.inventory, initial.progression)
    const context = createCombatContext(createDeterministicOfflineRng(1234))
    const active = startCombatTarget(initial, 'location.wolf-den', 'enemy.grey-wolf', stats, context)
    const result = simulateCombatHuntOffline(active, { requestedSeconds: 2 }, createDeterministicOfflineRng(1234))
    expect(result.stopReason).toBe('requested-time-complete')
    expect(result.state.combat.targetEnemyId).toBe('enemy.grey-wolf')
    expect(result.summary.virtualElapsedSeconds).toBe(2)
  })
})
