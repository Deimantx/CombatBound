import { grantItem, getInstancesByDefinitionId, removeItemInstance } from "../items/itemOwnership";
import { discoverItem, discoverTarget } from "../collection/collectionLogic";
import { createInitialCollection } from "../collection/collectionTypes";
import { itemById, itemDefinitions } from "../data/items";
import { itemUpgradeNodeById, itemUpgradeTreeById } from "../data/gear/itemUpgradeTrees";
import { enemyDefinitions } from "../data/enemies";
import { effectById } from "../data/effects";
import { magicArtDefinitions } from "../data/magicArts";
import { proficiencyDefinitions, proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";
import { weaponSkillDefinitions } from "../data/weaponSkills";
import { applyEffectById } from "../combat/combatEffects";
import { createCombatContext, forceDefeatEnemiesForDebug, forceDefeatPlayerForDebug, syncCombatStats } from "../combat/combatEngine";
import { normalizeCombatAbilityLoadout, equipCombatAbility } from "../combatAbilities/combatAbilityLogic";
import { COMBAT_ABILITY_SLOT_COUNT } from "../combatAbilities/combatAbilityTypes";
import { allProficiencyDefinitions, discoverProficiency, proficiencyXpForLevel } from "../progression/proficiencyProgression";
import { MAX_PROFICIENCY_LEVEL } from "../progression/progressionBalance";
import { awardHunterRankPoints, MAX_HUNTER_RANK, totalHunterRankPointsForRank } from "../progression/hunterRankProgression";
import type { CombatProficiencyId } from "../progression/progressionTypes";
import type { CombatantRef } from "../combat/combatTypes";
import type { GameState } from "../gameState";
import type { DebugEffectTarget, DebugResource } from "./debugTypes";
import type { ItemInstanceId } from "../items/itemTypes";

const debugContext = createCombatContext({ next: () => 0.5 });

function safeInteger(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function clampInteger(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, safeInteger(value, minimum)));
}

export function debugGrantItem(game: GameState, itemId: string, quantity: number): GameState {
  if (!itemById[itemId]) return game;
  const amount = Math.max(0, safeInteger(quantity));
  if (amount <= 0) return game;
  return { ...game, inventory: grantItem(game.inventory, itemId, amount).inventory, collection: discoverItem(game.collection, itemId) };
}

export function debugSetOwnedItemCount(game: GameState, itemId: string, quantity: number): GameState {
  if (!itemById[itemId]) return game;
  const target = Math.max(0, safeInteger(quantity));
  const definition = itemById[itemId];
  if (definition.inventoryMode === "stackable") {
    const stackables = { ...game.inventory.stackables, [itemId]: target };
    return syncCombatStats({ ...game, inventory: { ...game.inventory, stackables } });
  }
  const owned = getInstancesByDefinitionId(game.inventory, itemId);
  const equippedIds = new Set(Object.values(game.equipment.slots).filter((id): id is string => Boolean(id)));
  let inventory = game.inventory;
  if (owned.length < target) inventory = grantItem(inventory, itemId, target - owned.length).inventory;
  if (owned.length > target) {
    const removable = owned.filter((instance) => !equippedIds.has(instance.id)).slice(0, owned.length - target);
    for (const instance of removable) inventory = removeItemInstance(inventory, instance.id, equippedIds);
  }
  return syncCombatStats({ ...game, inventory });
}

export function debugDeleteItemInstance(game: GameState, instanceId: string): GameState {
  const equippedIds = new Set(Object.values(game.equipment.slots).filter((id): id is string => Boolean(id)));
  if (!game.inventory.instances[instanceId] || equippedIds.has(instanceId)) return game;
  const inventory = removeItemInstance(game.inventory, instanceId as ItemInstanceId, equippedIds);
  return inventory === game.inventory ? game : syncCombatStats({ ...game, inventory });
}

export function debugSetHunterRankPoints(game: GameState, points: number): GameState {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0;
  return syncCombatStats({ ...game, progression: { ...game.progression, hunterRankPoints: safePoints } });
}

export function debugSetHunterRank(game: GameState, rank: number): GameState {
  const safeRank = clampInteger(rank, 1, MAX_HUNTER_RANK);
  return debugSetHunterRankPoints(game, totalHunterRankPointsForRank(safeRank));
}

export function debugAddHunterRankPoints(game: GameState, amount: number): GameState {
  const result = awardHunterRankPoints(game.progression, amount);
  return result.pointsGained > 0 ? syncCombatStats({ ...game, progression: result.progression }) : game;
}

export function debugGrantPerkPoints(game: GameState, points: number): GameState {
  const safePoints = Math.max(0, safeInteger(points));
  if (safePoints <= 0) return game;
  const current = Number.isFinite(game.progression.bonusPerkPoints) ? Math.max(0, Math.floor(game.progression.bonusPerkPoints)) : 0;
  return { ...game, progression: { ...game.progression, bonusPerkPoints: current + safePoints } };
}

export function debugSetBonusPerkPoints(game: GameState, points: number): GameState {
  const safePoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  return { ...game, progression: { ...game.progression, bonusPerkPoints: safePoints } };
}

export function debugResetBonusPerkPoints(game: GameState): GameState {
  return debugSetBonusPerkPoints(game, 0);
}

export function debugSetProficiencyLevel(game: GameState, proficiencyId: CombatProficiencyId, level: number): GameState {
  const definition = proficiencyById[proficiencyId];
  if (!definition) return game;
  const safeLevel = clampInteger(level, 0, Math.min(MAX_PROFICIENCY_LEVEL, definition.maxLevel));
  const progression = discoverProficiency(game.progression, proficiencyId);
  return syncCombatStats({
    ...game,
    progression: {
      ...progression,
      proficiencies: {
        ...progression.proficiencies,
        [proficiencyId]: { proficiencyId, totalXp: safeLevel === 0 ? 0 : Math.max(1, proficiencyXpForLevel(safeLevel)) },
      },
    },
  });
}

export function debugSetAllProficiencyLevels(game: GameState, level: number): GameState {
  return allProficiencyDefinitions().reduce(
    (current, definition) => debugSetProficiencyLevel(current, definition.id, level),
    game,
  );
}

export function debugDiscoverAllProficiencies(game: GameState): GameState {
  const progression = allProficiencyDefinitions().reduce(
    (current, definition) => discoverProficiency(current, definition.id),
    game.progression,
  );
  return { ...game, progression };
}

export function debugDiscoverAllItems(game: GameState): GameState {
  return {
    ...game,
    collection: {
      ...game.collection,
      discoveredItems: itemDefinitions.map((item) => item.id),
    },
  };
}

export function debugDiscoverAllTargets(game: GameState): GameState {
  const collection = enemyDefinitions.reduce(
    (current, enemy) => discoverTarget(current, enemy.id),
    game.collection,
  );
  return { ...game, collection };
}

export function debugSetAllTargetDefeatsToOne(game: GameState): GameState {
  return {
    ...game,
    collection: {
      ...game.collection,
      targets: Object.fromEntries(
        enemyDefinitions.map((enemy) => [
          enemy.id,
          {
            ...(game.collection.targets[enemy.id] ?? { enemyId: enemy.id, firstDefeatedAt: undefined }),
            enemyId: enemy.id,
            discovered: true,
            defeats: 1,
          },
        ]),
      ),
    },
  };
}

export function debugResetCollection(game: GameState): GameState {
  return { ...game, collection: createInitialCollection(enemyDefinitions.map((enemy) => enemy.id)) };
}

function currentMaximum(game: GameState, resource: DebugResource) {
  return resource === "health"
    ? game.combat.maxPlayerHp
    : resource === "stamina"
      ? game.combat.maxStamina
      : game.combat.maxMana;
}

export function debugSetResourcePercent(game: GameState, resource: DebugResource, percent: number): GameState {
  const maximum = currentMaximum(game, resource);
  const fraction = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) / 100 : 0;
  return debugSetPlayerResource(game, resource, maximum * fraction);
}

export function debugSetPlayerResource(game: GameState, resource: DebugResource, value: number): GameState {
  const maximum = currentMaximum(game, resource);
  const nextValue = Math.max(0, Math.min(maximum, Number.isFinite(value) ? value : 0));
  const combat = resource === "health"
    ? { ...game.combat, playerHp: nextValue }
    : resource === "stamina"
      ? { ...game.combat, stamina: nextValue }
      : { ...game.combat, mana: nextValue };
  const next = { ...game, combat };
  return resource === "health" && nextValue <= 0 ? forceDefeatPlayerForDebug(next) : next;
}

export function debugFillHealth(game: GameState) { return debugSetPlayerResource(game, "health", game.combat.maxPlayerHp); }
export function debugFillStamina(game: GameState) { return debugSetPlayerResource(game, "stamina", game.combat.maxStamina); }
export function debugFillMana(game: GameState) { return debugSetPlayerResource(game, "mana", game.combat.maxMana); }
export function debugFillAllResources(game: GameState) { return debugFillMana(debugFillStamina(debugFillHealth(game))); }

export function debugDamagePlayer(game: GameState, amount: number): GameState {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return debugSetPlayerResource(game, "health", game.combat.playerHp - safeAmount);
}

export function debugHealPlayer(game: GameState, amount: number): GameState {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return debugSetPlayerResource(game, "health", game.combat.playerHp + safeAmount);
}

export function debugResetPlayerCooldowns(game: GameState): GameState {
  return {
    ...game,
    combat: {
      ...game.combat,
      actionCooldowns: {},
      globalCooldownRemaining: 0,
      potionCooldownRemaining: 0,
    },
  };
}

export function debugResetEnemyCooldowns(game: GameState): GameState {
  if (!game.combat.enemy) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      enemy: { ...game.combat.enemy, abilityCooldowns: {} },
    },
  };
}

export function debugCancelEnemyAbilities(game: GameState): GameState {
  if (!game.combat.enemy) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      enemy: game.combat.enemy.defeated ? game.combat.enemy : { ...game.combat.enemy, preparedAbility: null, attackTimer: game.combat.enemy.attackInterval },
    },
  };
}

export function debugClearPlayerEffects(game: GameState): GameState {
  return { ...game, combat: { ...game.combat, playerEffects: [] } };
}

export function debugClearSelectedEnemyEffects(game: GameState): GameState {
  const selectedId = game.combat.enemy?.instanceId;
  if (!selectedId || !game.combat.enemy) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      enemy: { ...game.combat.enemy, effects: [] },
    },
  };
}

export function debugClearAllEnemyEffects(game: GameState): GameState {
  return { ...game, combat: game.combat.enemy ? { ...game.combat, enemy: { ...game.combat.enemy, effects: [] } } : game.combat };
}

export function debugApplyEffect(game: GameState, effectId: string, target: DebugEffectTarget): GameState {
  const definition = effectById[effectId];
  if (!definition) return game;
  const source: CombatantRef = { kind: "player" };
  if (target === "player") {
    const result = applyEffectById(game.combat, effectId, effectById, source, source);
    return { ...game, combat: result.combat };
  }
  const selected = game.combat.enemy && !game.combat.enemy.defeated ? game.combat.enemy : undefined;
  if (!selected) return game;
  const targetRef: CombatantRef = { kind: "enemy", instanceId: selected.instanceId };
  const result = applyEffectById(game.combat, effectId, effectById, source, targetRef);
  return { ...game, combat: result.combat };
}

export function debugApplyPlayerMaxHpBarrier(game: GameState): GameState {
  const result = applyEffectById(game.combat, "effect.earth-barrier", effectById, { kind: "player" }, { kind: "player" }, { absorbAmount: game.combat.maxPlayerHp });
  return { ...game, combat: result.combat };
}

export function debugKillSelectedEnemy(game: GameState): GameState {
  const selected = game.combat.enemy?.instanceId;
  return selected ? forceDefeatEnemiesForDebug(game, [selected], debugContext) : game;
}

export function debugHealSelectedEnemyToFull(game: GameState): GameState {
  const selectedId = game.combat.enemy?.instanceId;
  if (!selectedId) return game;
  const selected = game.combat.enemy;
  if (!selected || selected.defeated) return game;
  return { ...game, combat: game.combat.enemy ? { ...game.combat, enemy: { ...game.combat.enemy, currentHealth: game.combat.enemy.maxHealth } } : game.combat };
}

export function debugKillCurrentEnemy(game: GameState): GameState {
  const instanceId = game.combat.enemy?.instanceId;
  return instanceId ? forceDefeatEnemiesForDebug(game, [instanceId], debugContext) : game;
}

export function debugRevivePlayer(game: GameState): GameState {
  return {
    ...game,
    combat: {
      ...game.combat,
      phase: game.combat.combatLocationId ? "stopped" : "inactive",
      stopReason: null,
      recoveryRemaining: 0,
      playerHp: game.combat.maxPlayerHp,
      stamina: game.combat.maxStamina,
      mana: game.combat.maxMana,
      playerEffects: [],
      enemy: game.combat.enemy ? { ...game.combat.enemy, preparedAbility: null } : null,
    },
  };
}

export function debugResetSessionMetrics(game: GameState): GameState {
  return {
    ...game,
    combat: {
      ...game.combat,
      session: {
        ...game.combat.session,
        elapsedSeconds: 0,
        enemiesDefeated: 0,
        damageDealt: 0,
        damageTaken: 0,
        healing: 0,
        proficiencyXpGained: {},
        itemsGained: 0,
        lootGained: {},
        itemInstanceIdsGained: [],
        goldGained: 0,
        highestHit: 0,
      },
    },
  };
}

export function debugLearnAllMagicArts(game: GameState): GameState {
  return { ...game, magicArts: { knownArtIds: magicArtDefinitions.map((art) => art.id) } };
}

export function debugResetMagicArts(game: GameState): GameState {
  return { ...game, magicArts: { knownArtIds: [] }, combatAbilities: { slots: game.combatAbilities.slots.map((id) => id?.startsWith("magic-art.") ? null : id) } };
}

export function debugEquipEarthShield(game: GameState): GameState {
  const knownArtIds = game.magicArts.knownArtIds.includes("magic-art.earth-shield")
    ? game.magicArts.knownArtIds
    : ["magic-art.earth-shield" as const, ...game.magicArts.knownArtIds];
  let combatAbilities = normalizeCombatAbilityLoadout(game.combatAbilities, knownArtIds);
  combatAbilities = equipCombatAbility(combatAbilities, "magic-art.earth-shield", 3, knownArtIds);
  return { ...game, magicArts: { knownArtIds }, combatAbilities };
}

export function debugSetMagicArtsXp(game: GameState, totalXp: number): GameState {
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0);
  return syncCombatStats({
    ...game,
    progression: {
      ...game.progression,
      proficiencies: {
        ...game.progression.proficiencies,
        "magic-arts": { proficiencyId: "magic-arts", totalXp: safeXp },
      },
    },
  });
}

export function debugAddMagicArtsXp(game: GameState, amount: number): GameState {
  return debugSetMagicArtsXp(game, (game.progression.proficiencies["magic-arts"]?.totalXp ?? 0) + Math.max(0, Number.isFinite(amount) ? amount : 0));
}

export function debugResetMagicArtsXp(game: GameState): GameState {
  const proficiencies = { ...game.progression.proficiencies };
  delete proficiencies["magic-arts"];
  return syncCombatStats({ ...game, progression: { ...game.progression, proficiencies } });
}

export function debugEquipSwordSkills(game: GameState): GameState {
  const skills = weaponSkillDefinitions.filter((skill) => skill.proficiencyId === "one-handed-sword").slice(0, COMBAT_ABILITY_SLOT_COUNT);
  let loadout = normalizeCombatAbilityLoadout(game.combatAbilities, game.magicArts.knownArtIds);
  skills.forEach((skill, slot) => { loadout = equipCombatAbility(loadout, skill.id, slot, game.magicArts.knownArtIds); });
  return { ...game, combatAbilities: loadout };
}

export function debugSetGold(game: GameState, amount: number): GameState {
  return { ...game, gold: Math.max(0, safeInteger(amount)) };
}

export function debugAddGold(game: GameState, amount: number): GameState {
  const safeAmount = Number.isFinite(amount) ? safeInteger(amount) : 0;
  return debugSetGold(game, game.gold + safeAmount);
}

export function debugGrantIronSwordMaterials(game: GameState): GameState {
  const materialIds = ["item.iron-bar", "item.weapon-scrap", "item.rough-metal-fragment", "item.alpha-fang", "item.captains-blade-fragment", "item.black-stone", "item.wolf-fang", "item.wolf-bone", "item.fallen-watch-insignia", "item.metal-scraps", "item.mineralized-shell-plate", "item.ironback-core"];
  let inventory = game.inventory;
  for (const itemId of materialIds) inventory = grantItem(inventory, itemId, 100).inventory;
  return { ...game, inventory };
}

export function debugGrantIronMeleeRoster(game: GameState): GameState {
  const roster = ["item.iron-sword", "item.iron-axe", "item.iron-mace", "item.iron-dagger", "item.iron-greatsword", "item.iron-great-axe", "item.iron-warhammer", "item.iron-spear"];
  let next = game;
  for (const itemId of roster) next = debugGrantItem(next, itemId, 1);
  return next;
}

export function debugGrantIronDefensiveSet(game: GameState): GameState {
  const roster = ["item.iron-helmet", "item.iron-armor", "item.iron-gloves", "item.iron-boots", "item.iron-shield"];
  let next = game;
  for (const itemId of roster) next = debugGrantItem(next, itemId, 1);
  return next;
}

export function debugGrantSelectedGearMaterials(game: GameState, itemId: string): GameState {
  const treeId = itemById[itemId]?.upgradeTreeId;
  const tree = treeId ? itemUpgradeTreeById[treeId] : undefined;
  if (!tree) return game;
  const materialQuantities = new Map<string, number>();
  for (const nodeId of tree.nodeIds) for (const cost of itemUpgradeNodeById[nodeId]?.costs ?? []) materialQuantities.set(cost.itemId, Math.max(materialQuantities.get(cost.itemId) ?? 0, cost.quantity * 100));
  let inventory = game.inventory;
  for (const [materialId, quantity] of materialQuantities) inventory = grantItem(inventory, materialId, quantity).inventory;
  return { ...game, inventory };
}

/** @deprecated Use debugGrantSelectedGearMaterials for any item tree. */
export const debugGrantSelectedWeaponMaterials = debugGrantSelectedGearMaterials;

export function debugResetItemUpgrades(game: GameState, instanceId: string): GameState {
  const instance = game.inventory.instances[instanceId];
  if (!instance) return game;
  return { ...game, inventory: { ...game.inventory, instances: { ...game.inventory.instances, [instanceId]: { ...instance, unlockedUpgradeNodeIds: [] } } } };
}

export function debugPermanent(game: GameState, mutation: (game: GameState) => GameState) {
  return mutation(game);
}

export const debugDefinitions = {
  items: itemDefinitions,
  equipment: itemDefinitions.filter((item) => Boolean(item.equipmentSlotKind)),
  proficiencies: proficiencyDefinitions,
  perks: Object.values(perkById),
  effects: Object.values(effectById),
  enemies: enemyDefinitions,
};
