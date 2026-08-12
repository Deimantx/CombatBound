import { addItem } from '../inventory/inventoryLogic'
import { discoverItem, recordTargetDefeat } from '../collection/collectionLogic'
import { addSkillXp } from '../progression/experience'
import type { CombatContext, CombatState, EnemyCombatInstance } from './combatTypes'
import type { GameState } from '../gameState'
import type { CombatLocationDefinition } from '../world/worldTypes'

export function resolveEnemyReward(game: GameState, combat: CombatState, enemy: EnemyCombatInstance, context: CombatContext) {
  if (enemy.rewardResolved) return { game, combat, items: 0, xp: 0, droppedItemIds: [] as string[] }
  const definition = context.enemies[enemy.enemyId]
  let nextGame = { ...game, inventory: { ...game.inventory, quantities: { ...game.inventory.quantities } }, collection: { ...game.collection, discoveredItems: [...game.collection.discoveredItems], targets: { ...game.collection.targets } }, progression: { ...game.progression, skills: { ...game.progression.skills } } }
  let items = 0
  const droppedItemIds: string[] = []
  let gold = nextGame.gold
  const lootGained = { ...combat.session.lootGained }
  let goldGained = 0
  for (const drop of definition.loot) {
    if (context.rng.next() > drop.chance) continue
    const quantity = drop.minQuantity + Math.floor(context.rng.next() * (drop.maxQuantity - drop.minQuantity + 1))
    nextGame.inventory = addItem(nextGame.inventory, drop.itemId, quantity)
    nextGame.collection = discoverItem(nextGame.collection, drop.itemId)
    droppedItemIds.push(drop.itemId)
    lootGained[drop.itemId] = (lootGained[drop.itemId] ?? 0) + quantity
    items += quantity
    if (drop.itemId === 'item.coin-pouch') { gold += quantity * 20; goldGained += quantity * 20 }
  }
  nextGame.collection = recordTargetDefeat(nextGame.collection, definition.id)
  const progressionResult = addSkillXp(nextGame.progression, nextGame.progression.trainingFocus, definition.baseXp)
  nextGame.progression = progressionResult.progression
  const nextCombat = { ...combat, session: { ...combat.session, enemiesDefeated: combat.session.enemiesDefeated + 1, xpGained: combat.session.xpGained + definition.baseXp, itemsGained: combat.session.itemsGained + items, lootGained, goldGained: combat.session.goldGained + goldGained }, log: combat.log }
  nextGame.gold = gold
  return { game: nextGame, combat: nextCombat, items, xp: definition.baseXp, droppedItemIds, leveledUp: progressionResult.leveledUp }
}

export function resolveLocationClearReward(game: GameState, combat: CombatState, location: CombatLocationDefinition, context: CombatContext) {
  let nextGame = { ...game, inventory: { ...game.inventory, quantities: { ...game.inventory.quantities } }, collection: { ...game.collection, discoveredItems: [...game.collection.discoveredItems] } }
  const droppedItemIds: string[] = []
  const lootGained = { ...combat.session.lootGained }
  let items = 0
  let gold = nextGame.gold
  let goldGained = 0
  for (const drop of location.sharedLoot ?? []) {
    if (context.rng.next() > drop.chance) continue
    const quantity = drop.minQuantity + Math.floor(context.rng.next() * (drop.maxQuantity - drop.minQuantity + 1))
    nextGame.inventory = addItem(nextGame.inventory, drop.itemId, quantity)
    nextGame.collection = discoverItem(nextGame.collection, drop.itemId)
    lootGained[drop.itemId] = (lootGained[drop.itemId] ?? 0) + quantity
    droppedItemIds.push(drop.itemId)
    items += quantity
    if (drop.itemId === 'item.coin-pouch') { gold += quantity * 20; goldGained += quantity * 20 }
  }
  nextGame.gold = gold
  return { game: nextGame, combat: { ...combat, session: { ...combat.session, itemsGained: combat.session.itemsGained + items, lootGained, goldGained: combat.session.goldGained + goldGained } }, droppedItemIds }
}
