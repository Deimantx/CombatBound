import { grantItem, getInstancesByDefinitionId, removeItemInstance } from "../items/itemOwnership";
import { addItemAffix, removeItemAffix, rerollItemAffix, setItemQuality, setItemUpgradeLevel } from "../items/itemMutations";
import { discoverItem, discoverTarget } from "../collection/collectionLogic";
import { createInitialCollection } from "../collection/collectionTypes";
import { itemById, itemDefinitions, prototypeEquipmentDefinitions } from "../data/items";
import { enemyDefinitions } from "../data/enemies";
import { effectById } from "../data/effects";
import { spellDefinitions } from "../data/spells";
import { proficiencyDefinitions, proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";
import { techniqueDefinitions } from "../data/techniques";
import { weaponSkillDefinitions } from "../data/weaponSkills";
import { applyEffectById } from "../combat/combatEffects";
import { createCombatContext, forceDefeatEnemiesForDebug, forceDefeatPlayerForDebug, syncCombatStats } from "../combat/combatEngine";
import { normalizeCombatAbilityLoadout, equipCombatAbility, equipTechnique } from "../combatAbilities/combatAbilityLogic";
import { COMBAT_ABILITY_SLOT_COUNT } from "../combatAbilities/combatAbilityTypes";
import { createInitialSpellbook, normalizeSpellbook } from "../spellbook/spellbookLogic";
import { COMBAT_SPELL_SLOT_COUNT } from "../spellbook/spellbookTypes";
import { allProficiencyDefinitions, discoverProficiency, proficiencyXpForLevel } from "../progression/proficiencyProgression";
import { MAX_PROFICIENCY_LEVEL } from "../progression/progressionBalance";
import { awardHunterRankPoints, MAX_HUNTER_RANK, totalHunterRankPointsForRank } from "../progression/hunterRankProgression";
import type { CombatProficiencyId } from "../progression/progressionTypes";
import type { CombatantRef } from "../combat/combatTypes";
import type { GameState } from "../gameState";
import type { DebugEffectTarget, DebugResource } from "./debugTypes";
import type { ItemInstanceId } from "../items/itemTypes";
import { createDeterministicItemRng } from "../items/itemRandom";

const debugContext = createCombatContext({ next: () => 0.5 });
const debugItemRng = createDeterministicItemRng(0x00c0ffee);

function safeInteger(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function clampInteger(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, safeInteger(value, minimum)));
}

function prototypeQuantity(itemId: string, quantity: number) {
  const item = itemById[itemId];
  return item?.equipmentSlotKind === "ring" || item?.equipmentSlotKind === "earring"
    ? Math.max(2, quantity)
    : quantity;
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

function applyItemMutation(game: GameState, mutation: (inventory: GameState["inventory"]) => ReturnType<typeof setItemQuality>) {
  const result = mutation(game.inventory);
  return result.changed ? syncCombatStats({ ...game, inventory: result.inventory }) : game;
}

export function debugSetItemQuality(game: GameState, instanceId: string, quality: number): GameState {
  return applyItemMutation(game, (inventory) => setItemQuality(inventory, instanceId as ItemInstanceId, quality));
}

export function debugSetItemUpgradeLevel(game: GameState, instanceId: string, upgradeLevel: number): GameState {
  return applyItemMutation(game, (inventory) => setItemUpgradeLevel(inventory, instanceId as ItemInstanceId, upgradeLevel));
}

export function debugAddItemAffix(game: GameState, instanceId: string, affixId: string, tierId: string): GameState {
  return applyItemMutation(game, (inventory) => addItemAffix(inventory, instanceId as ItemInstanceId, affixId, tierId, debugItemRng));
}

export function debugRemoveItemAffix(game: GameState, instanceId: string, affixId: string): GameState {
  return applyItemMutation(game, (inventory) => removeItemAffix(inventory, instanceId as ItemInstanceId, affixId));
}

export function debugRerollItemAffix(game: GameState, instanceId: string, affixId: string): GameState {
  return applyItemMutation(game, (inventory) => rerollItemAffix(inventory, instanceId as ItemInstanceId, affixId, debugItemRng));
}

export function debugGrantAllEquipment(game: GameState, quantity = 1): GameState {
  return prototypeEquipmentDefinitions.reduce(
    (current, item) => debugGrantItem(current, item.id, Math.max(0, safeInteger(quantity))),
    game,
  );
}

export function debugGrantEquipmentTier(game: GameState, hunterRank: number): GameState {
  const tier = clampInteger(hunterRank, 1, MAX_HUNTER_RANK);
  return prototypeEquipmentDefinitions
    .filter((item) => item.requiredHunterRank === tier)
    .reduce(
      (current, item) => debugGrantItem(current, item.id, prototypeQuantity(item.id, 1)),
      game,
    );
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
  return {
    ...game,
    combat: {
      ...game.combat,
      enemies: game.combat.enemies.map((enemy) => ({ ...enemy, actionCooldowns: {} })),
    },
  };
}

export function debugCancelEnemyActions(game: GameState): GameState {
  return {
    ...game,
    combat: {
      ...game.combat,
      enemies: game.combat.enemies.map((enemy) => enemy.defeated
        ? enemy
        : { ...enemy, currentAction: null, attackTimer: enemy.attackInterval }),
    },
  };
}

export function debugClearPlayerEffects(game: GameState): GameState {
  return { ...game, combat: { ...game.combat, playerEffects: [] } };
}

export function debugClearSelectedEnemyEffects(game: GameState): GameState {
  const selectedId = game.combat.selectedEnemyInstanceId;
  if (!selectedId) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      enemies: game.combat.enemies.map((enemy) => enemy.instanceId === selectedId ? { ...enemy, effects: [] } : enemy),
    },
  };
}

export function debugClearAllEnemyEffects(game: GameState): GameState {
  return { ...game, combat: { ...game.combat, enemies: game.combat.enemies.map((enemy) => ({ ...enemy, effects: [] })) } };
}

export function debugApplyEffect(game: GameState, effectId: string, target: DebugEffectTarget): GameState {
  const definition = effectById[effectId];
  if (!definition) return game;
  const source: CombatantRef = { kind: "player" };
  if (target === "player") {
    const result = applyEffectById(game.combat, effectId, effectById, source, source);
    return { ...game, combat: result.combat };
  }
  const selected = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId && !enemy.defeated);
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
  const selected = game.combat.selectedEnemyInstanceId;
  return selected ? forceDefeatEnemiesForDebug(game, [selected], debugContext) : game;
}

export function debugHealSelectedEnemyToFull(game: GameState): GameState {
  const selectedId = game.combat.selectedEnemyInstanceId;
  if (!selectedId) return game;
  const selected = game.combat.enemies.find((enemy) => enemy.instanceId === selectedId);
  if (!selected || selected.defeated) return game;
  return { ...game, combat: { ...game.combat, enemies: game.combat.enemies.map((enemy) => enemy.instanceId === selectedId ? { ...enemy, currentHealth: enemy.maxHealth } : enemy) } };
}

export function debugKillCurrentGroup(game: GameState): GameState {
  return forceDefeatEnemiesForDebug(
    game,
    game.combat.enemies.filter((enemy) => !enemy.defeated).map((enemy) => enemy.instanceId),
    debugContext,
  );
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
      enemies: game.combat.enemies.map((enemy) => ({ ...enemy, currentAction: null })),
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
        groupClears: 0,
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

export function debugLearnAllSpells(game: GameState): GameState {
  return { ...game, spellbook: normalizeSpellbook({ ...game.spellbook, knownSpellIds: spellDefinitions.map((spell) => spell.id) }) };
}

export function debugResetSpellbook(game: GameState): GameState {
  return { ...game, spellbook: createInitialSpellbook() };
}

export function debugFillSpellLoadout(game: GameState): GameState {
  const knownSpellIds = game.spellbook.knownSpellIds;
  return { ...game, spellbook: normalizeSpellbook({ ...game.spellbook, equippedSpellSlots: knownSpellIds.slice(0, COMBAT_SPELL_SLOT_COUNT) }) };
}

export function debugEquipSwordSkills(game: GameState): GameState {
  const skills = weaponSkillDefinitions.filter((skill) => skill.proficiencyId === "one-handed-sword").slice(0, COMBAT_ABILITY_SLOT_COUNT);
  let loadout = normalizeCombatAbilityLoadout(game.combatAbilities);
  skills.forEach((skill, slot) => { loadout = equipCombatAbility(loadout, skill.id, slot); });
  return { ...game, combatAbilities: loadout };
}

export function debugEquipBothTechniques(game: GameState): GameState {
  const ids = Object.keys(techniqueDefinitions) as Array<keyof typeof techniqueDefinitions>;
  let loadout = normalizeCombatAbilityLoadout(game.combatAbilities);
  ids.slice(0, 2).forEach((id, slot) => { loadout = equipTechnique(loadout, id, slot); });
  return { ...game, combatAbilities: loadout };
}

export function debugSetGold(game: GameState, amount: number): GameState {
  return { ...game, gold: Math.max(0, safeInteger(amount)) };
}

export function debugAddGold(game: GameState, amount: number): GameState {
  const safeAmount = Number.isFinite(amount) ? safeInteger(amount) : 0;
  return debugSetGold(game, game.gold + safeAmount);
}

export function debugPermanent(game: GameState, mutation: (game: GameState) => GameState) {
  return mutation(game);
}

export const debugDefinitions = {
  items: itemDefinitions,
  equipment: prototypeEquipmentDefinitions,
  proficiencies: proficiencyDefinitions,
  perks: Object.values(perkById),
  effects: Object.values(effectById),
  spells: spellDefinitions,
  enemies: enemyDefinitions,
};
