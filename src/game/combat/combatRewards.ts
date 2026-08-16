import { grantItem } from '../items/itemOwnership'
import { discoverItem, recordTargetDefeat } from '../collection/collectionLogic'
import type { CombatContext, CombatState, EnemyCombatInstance } from './combatTypes'
import type { GameState } from '../gameState'
import type { CombatLocationDefinition } from '../world/worldTypes'
import { nextCombatRandom } from './combatRng'

export function resolveEnemyReward(game: GameState, combat: CombatState, enemy: EnemyCombatInstance, context: CombatContext) {
  if (enemy.rewardResolved) return { game, combat, items: 0, droppedItemIds: [] as string[], droppedInstanceIds: [] as string[] }
  const definition = context.enemies[enemy.enemyId]
  let nextGame = { ...game, collection: { ...game.collection, discoveredItems: [...game.collection.discoveredItems], targets: { ...game.collection.targets } } }
  let items = 0
  const droppedItemIds: string[] = []
  const droppedInstanceIds: string[] = []
  let gold = nextGame.gold
  const lootGained = { ...combat.session.lootGained }
  const itemInstanceIdsGained = [...combat.session.itemInstanceIdsGained]
  let goldGained = 0
  for (const drop of definition.loot) {
    if (nextCombatRandom(context.rng, 'lootChance') > drop.chance) continue
    const quantity = drop.minQuantity + Math.floor(nextCombatRandom(context.rng, 'lootQuantity') * (drop.maxQuantity - drop.minQuantity + 1))
    const grant = grantItem(nextGame.inventory, drop.itemId, quantity)
    nextGame.inventory = grant.inventory
    nextGame.collection = discoverItem(nextGame.collection, drop.itemId)
    droppedItemIds.push(drop.itemId)
    droppedInstanceIds.push(...grant.createdInstanceIds)
    itemInstanceIdsGained.push(...grant.createdInstanceIds)
    lootGained[drop.itemId] = (lootGained[drop.itemId] ?? 0) + grant.quantityGranted
    items += grant.quantityGranted
    if (drop.itemId === 'item.coin-pouch') { gold += grant.quantityGranted * 20; goldGained += grant.quantityGranted * 20 }
  }
  nextGame.collection = recordTargetDefeat(nextGame.collection, definition.id)
  const nextCombat = { ...combat, session: { ...combat.session, itemInstanceIdsGained, enemiesDefeated: combat.session.enemiesDefeated + 1, itemsGained: combat.session.itemsGained + items, lootGained, goldGained: combat.session.goldGained + goldGained }, log: combat.log }
  nextGame.gold = gold
  return { game: nextGame, combat: nextCombat, items, droppedItemIds, droppedInstanceIds }
}

export function resolveLocationClearReward(game: GameState, combat: CombatState, location: CombatLocationDefinition, context: CombatContext) {
  let nextGame = { ...game, collection: { ...game.collection, discoveredItems: [...game.collection.discoveredItems] } }
  const droppedItemIds: string[] = []
  const droppedInstanceIds: string[] = []
  const lootGained = { ...combat.session.lootGained }
  const itemInstanceIdsGained = [...combat.session.itemInstanceIdsGained]
  let items = 0
  let gold = nextGame.gold
  let goldGained = 0
  for (const drop of location.sharedLoot ?? []) {
    if (nextCombatRandom(context.rng, 'lootChance') > drop.chance) continue
    const quantity = drop.minQuantity + Math.floor(nextCombatRandom(context.rng, 'lootQuantity') * (drop.maxQuantity - drop.minQuantity + 1))
    const grant = grantItem(nextGame.inventory, drop.itemId, quantity)
    nextGame.inventory = grant.inventory
    nextGame.collection = discoverItem(nextGame.collection, drop.itemId)
    lootGained[drop.itemId] = (lootGained[drop.itemId] ?? 0) + grant.quantityGranted
    droppedItemIds.push(drop.itemId)
    droppedInstanceIds.push(...grant.createdInstanceIds)
    itemInstanceIdsGained.push(...grant.createdInstanceIds)
    items += grant.quantityGranted
    if (drop.itemId === 'item.coin-pouch') { gold += grant.quantityGranted * 20; goldGained += grant.quantityGranted * 20 }
  }
  nextGame.gold = gold
  return { game: nextGame, combat: { ...combat, session: { ...combat.session, itemInstanceIdsGained, itemsGained: combat.session.itemsGained + items, lootGained, goldGained: combat.session.goldGained + goldGained } }, droppedItemIds, droppedInstanceIds }
}
