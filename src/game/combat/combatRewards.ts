import { grantItem } from "../items/itemOwnership";
import { discoverItem, recordTargetDefeat } from "../collection/collectionLogic";
import type { CombatContext, CombatState, EnemyCombatInstance, LootEntry } from "./combatTypes";
import type { GameState } from "../gameState";
import type { CombatLocationDefinition } from "../world/worldTypes";
import { nextCombatRandom } from "./combatRng";

export interface CombatRewardRolls {
  source: "target" | "location";
  itemId: string;
  quantity: number;
}

export function getCombatTargetLootPreview(location: CombatLocationDefinition, enemy: { loot: LootEntry[] }) {
  return { sharedLoot: location.sharedLoot ?? [], targetLoot: enemy.loot };
}

export function resolveEnemyKillRewards(game: GameState, combat: CombatState, enemy: EnemyCombatInstance, location: CombatLocationDefinition | undefined, context: CombatContext) {
  if (enemy.rewardResolved) return { game, combat, items: 0, droppedItemIds: [] as string[], droppedInstanceIds: [] as string[], rolls: [] as CombatRewardRolls[] };
  const definition = context.enemies[enemy.enemyId];
  if (!definition) return { game, combat, items: 0, droppedItemIds: [] as string[], droppedInstanceIds: [] as string[], rolls: [] as CombatRewardRolls[] };
  let nextGame = { ...game, collection: { ...game.collection, discoveredItems: [...game.collection.discoveredItems], targets: { ...game.collection.targets } } };
  let items = 0;
  const droppedItemIds: string[] = [];
  const droppedInstanceIds: string[] = [];
  const rolls: CombatRewardRolls[] = [];
  let gold = nextGame.gold;
  let goldGained = 0;
  const lootGained = { ...combat.session.lootGained };
  const itemInstanceIdsGained = [...combat.session.itemInstanceIdsGained];
  const roll = (entries: readonly LootEntry[], source: CombatRewardRolls["source"]) => {
    for (const drop of entries) {
      if (nextCombatRandom(context.rng, "lootChance") > drop.chance) continue;
      const quantity = drop.minQuantity + Math.floor(nextCombatRandom(context.rng, "lootQuantity") * (drop.maxQuantity - drop.minQuantity + 1));
      const grant = grantItem(nextGame.inventory, drop.itemId, quantity);
      nextGame.inventory = grant.inventory;
      nextGame.collection = discoverItem(nextGame.collection, drop.itemId);
      droppedItemIds.push(drop.itemId);
      droppedInstanceIds.push(...grant.createdInstanceIds);
      itemInstanceIdsGained.push(...grant.createdInstanceIds);
      lootGained[drop.itemId] = (lootGained[drop.itemId] ?? 0) + grant.quantityGranted;
      items += grant.quantityGranted;
      rolls.push({ source, itemId: drop.itemId, quantity: grant.quantityGranted });
      if (drop.itemId === "item.coin-pouch") { gold += grant.quantityGranted * 20; goldGained += grant.quantityGranted * 20; }
    }
  };
  roll(definition.loot, "target");
  roll(location?.sharedLoot ?? [], "location");
  nextGame.collection = recordTargetDefeat(nextGame.collection, definition.id);
  nextGame.gold = gold;
  const nextCombat = { ...combat, session: { ...combat.session, itemInstanceIdsGained, enemiesDefeated: combat.session.enemiesDefeated + 1, itemsGained: combat.session.itemsGained + items, lootGained, goldGained: combat.session.goldGained + goldGained } };
  return { game: nextGame, combat: nextCombat, items, droppedItemIds, droppedInstanceIds, rolls };
}
