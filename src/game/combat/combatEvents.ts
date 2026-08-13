import type { CombatEvent, CombatState } from './combatTypes'

export function appendCombatEvent(state: CombatState, item: CombatEvent) {
  const id = state.eventSequence + 1
  return {
    ...state,
    eventSequence: id,
    events: [...state.events, { id, type: item.eventType ?? 'actionResolved', source: item.source, target: item.target, data: item.data }].slice(-100),
  }
}
