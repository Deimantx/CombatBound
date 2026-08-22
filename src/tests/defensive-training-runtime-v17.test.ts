import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { equipItemInstance } from "../game/equipment/equipmentRules";
import { grantItem } from "../game/items/itemOwnership";
import { createCombatContext, resolveDefensiveTrainingForCombatEvent, startCombatTarget } from "../game/combat/combatEngine";
import { advanceEnemyActions, resolveEnemyCombatAbilityResult, type EnemyRuntimeDependencies } from "../game/combat/combatEnemyRuntime";
import { enemyCombatAbilityById } from "../game/data/enemyCombatAbilities";

function equipGear(itemIds: Array<[string, "head" | "armor" | "gloves" | "boots" | "offhand"]>) {
  const base = createInitialGameState();
  let inventory = base.inventory;
  let equipment = base.equipment;
  let progression = base.progression;
  for (const [itemId, slotId] of itemIds) {
    const granted = grantItem(inventory, itemId, 1);
    inventory = granted.inventory;
    const result = equipItemInstance({ inventory, equipment, instanceId: granted.createdInstanceIds[0]!, slotId, hunterRank: 1, progression });
    equipment = result.equipment;
    progression = result.progression ?? progression;
  }
  return { ...base, inventory, equipment, progression };
}

function productionDependencies(): EnemyRuntimeDependencies {
  return {
    applyEffectiveHealing: (game) => game,
    awardBarrierCredits: (game) => game,
    resolveDefensiveTrainingForCombatEvent: (game, event, items) => {
      return resolveDefensiveTrainingForCombatEvent(game, event, items);
    },
  };
}

function combatFixture(itemIds: Array<[string, "head" | "armor" | "gloves" | "boots" | "offhand"]>) {
  const configured = equipGear(itemIds);
  const stats = calculateHunterCombatStats(configured.equipment, configured.inventory, configured.progression);
  const context = createCombatContext({ next: () => 0 });
  const started = startCombatTarget(configured, "location.wolf-den", "enemy.grey-wolf", stats, context);
  return { game: started, stats, context };
}

function xp(game: ReturnType<typeof createInitialGameState>, id: "heavy-armor" | "shield") {
  return game.progression.proficiencies[id]?.totalXp ?? 0;
}

describe("defensive training from resolved enemy actions V17", () => {
  it("awards one quarter Heavy Armor XP for one resolved helmet-only normal attack", () => {
    const { game, stats, context } = combatFixture([["item.iron-helmet", "head"]]);
    const next = advanceEnemyActions({ ...game, combat: { ...game.combat, enemy: { ...game.combat.enemy!, attackTimer: 0 } } }, 0.01, context, stats, productionDependencies());
    expect(xp(next, "heavy-armor")).toBeCloseTo(0.25);
  });

  it("awards once for a player-targeted multi-hit ability and never for self-only abilities", () => {
    const { game, stats, context } = combatFixture([
      ["item.iron-helmet", "head"],
      ["item.iron-armor", "armor"],
      ["item.iron-gloves", "gloves"],
      ["item.iron-boots", "boots"],
      ["item.iron-shield", "offhand"],
    ]);
    const enemyId = game.combat.enemy!.instanceId;
    const self = resolveEnemyCombatAbilityResult(game, enemyId, enemyCombatAbilityById["enemy-ability.guard-stance"], context, stats, productionDependencies());
    expect(xp(self.game, "heavy-armor")).toBe(0);
    expect(xp(self.game, "shield")).toBe(0);
    const hit = resolveEnemyCombatAbilityResult(game, enemyId, enemyCombatAbilityById["enemy-ability.maul"], context, stats, productionDependencies());
    expect(hit.resolution.totalHits).toBe(2);
    expect(xp(hit.game, "heavy-armor")).toBeCloseTo(1);
    expect(xp(hit.game, "shield")).toBeCloseTo(1);
  });
});
