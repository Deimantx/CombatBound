import { describe, expect, it } from "vitest"
import { createInitialGameState } from "../game/gameState"
import { grantItem, getItemInstances, getStackableQuantity } from "../game/items/itemOwnership"
import { getProfessionLevel, setProfessionLevel } from "../game/professions/professionProgression"
import { blacksmithingRecipes } from "../game/professions/blacksmithing/blacksmithingRecipes"
import { BLACKSMITHING_PERK_TREE_COST, blacksmithingPerkById } from "../game/professions/blacksmithing/blacksmithingPerks"
import { validateBlacksmithingPerks, validateBlacksmithingRecipes } from "../game/professions/blacksmithing/blacksmithingValidation"
import { advanceBlacksmithing, startBlacksmithingRecipe, stopBlacksmithingState } from "../game/professions/blacksmithing/blacksmithingRuntime"
import { purchaseProfessionItemUpgrade } from "../game/professions/professionItemUpgrades"
import { getBlacksmithingStats, operationTagsForItem } from "../game/professions/blacksmithing/blacksmithingStats"
import { gameStateToSaveV18, gameStateToSaveV19, parseGameSaveJson } from "../game/persistence/saveGame"
import { itemById } from "../game/data/items"
import { itemUpgradeNodeById } from "../game/data/gear/itemUpgradeTrees"
import { createBlacksmithingActivityAdapter } from "../game/offline/blacksmithingActivity"

const rng = (value: number) => ({ next: () => value })

describe("Blacksmithing foundation V19", () => {
  it("registers a fresh shared profession and keeps point accounting generic", () => {
    const game = createInitialGameState()
    expect(game.professions.skills.blacksmithing).toEqual({ skillId: "blacksmithing", totalXp: 0, bonusSkillPoints: 0, purchasedPerks: {} })
    expect(getProfessionLevel(game.professions, "blacksmithing")).toBe(1)
    expect(BLACKSMITHING_PERK_TREE_COST).toBeGreaterThan(99)
    expect(Object.keys(blacksmithingPerkById)).toHaveLength(33)
    expect(validateBlacksmithingRecipes().valid).toBe(true)
    expect(validateBlacksmithingPerks().valid).toBe(true)
  })

  it("keeps V18 frozen while migrating it to a fresh V19 Blacksmithing state", () => {
    const v18 = gameStateToSaveV18(createInitialGameState(), { reducedMotion: false, showInspectorButton: true })
    expect(v18.version).toBe(18)
    expect(v18).not.toHaveProperty("blacksmithing")
    const migrated = parseGameSaveJson(JSON.stringify(v18))!
    expect(migrated.version).toBe(20)
    expect(migrated.blacksmithing.active).toBe(false)
    expect(migrated.blacksmithing.forgeStamina).toBe(100)
    expect(migrated.professions.skills.blacksmithing?.totalXp).toBe(0)
  })

  it("locks Iron Bar to the exact 5 Ore -> 1 Bar recipe", () => {
    const ironBar = blacksmithingRecipes.find((recipe) => recipe.id === "blacksmithing-recipe.iron-bar")!
    expect(ironBar.costs).toEqual([{ itemId: "item.iron-ore", quantity: 5 }])
    expect(ironBar.outputItemId).toBe("item.iron-bar")
    expect(ironBar.outputQuantity).toBe(1)
  })

  it("reserves the full smelting cost and awards output and XP only on completion", () => {
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(game.inventory, "item.iron-ore", 5).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar")
    expect(started.outcome).toBe("started")
    expect(getStackableQuantity(started.game.inventory, "item.iron-ore")).toBe(0)
    expect(getStackableQuantity(started.game.inventory, "item.iron-bar")).toBe(0)
    const before = started.game.professions.skills.blacksmithing!.totalXp
    const completed = advanceBlacksmithing(started.game, 4, rng(0.99))
    expect(getStackableQuantity(completed.game.inventory, "item.iron-bar")).toBe(1)
    expect(completed.game.professions.skills.blacksmithing!.totalXp - before).toBe(2)
  })

  it("does not reserve an insufficient recipe even when recovery would be guaranteed", () => {
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(game.inventory, "item.iron-ore", 4).inventory }
    const result = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar")
    expect(result.outcome).toBe("materials-exhausted")
    expect(result.game).toBe(game)
    expect(getStackableQuantity(game.inventory, "item.iron-ore")).toBe(4)
  })

  it("uses deterministic recovery after success without bonus XP", () => {
    let game = createInitialGameState()
    game = { ...game, professions: setProfessionLevel(game.professions, "blacksmithing", 20), inventory: grantItem(game.inventory, "item.iron-ore", 5).inventory }
    game = { ...game, professions: { ...game.professions, skills: { ...game.professions.skills, blacksmithing: { ...game.professions.skills.blacksmithing!, purchasedPerks: { "blacksmithing-perk.smelters-eye": 4 } } } } }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar")
    const completed = advanceBlacksmithing(started.game, 4, rng(0))
    expect(getStackableQuantity(completed.game.inventory, "item.iron-ore")).toBe(1)
    expect(getStackableQuantity(completed.game.inventory, "item.iron-bar")).toBe(1)
    expect(completed.summary.blacksmithingXp).toBe(2)
  })

  it("runs a fixed queue with one reservation per cycle", () => {
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(game.inventory, "item.iron-ore", 25).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar", 5)
    const completed = advanceBlacksmithing(started.game, 20.01, rng(0.99))
    expect(getStackableQuantity(completed.game.inventory, "item.iron-ore")).toBe(0)
    expect(getStackableQuantity(completed.game.inventory, "item.iron-bar")).toBe(5)
    expect(completed.summary.smeltsCompleted).toBe(5)
    expect(completed.game.blacksmithing.active).toBe(false)
    expect(completed.stopReason).toBe("queue-complete")
  })

  it("stops a fixed x1 queue before entering rest when the completed operation exhausts stamina", () => {
    let game = createInitialGameState()
    game = { ...game, blacksmithing: { ...game.blacksmithing, forgeStamina: 3 }, inventory: grantItem(game.inventory, "item.iron-ore", 10).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar", 1)
    const completed = advanceBlacksmithing(started.game, 4, rng(0.99))
    expect(completed.summary.smeltsCompleted).toBe(1)
    expect(completed.game.blacksmithing.active).toBe(false)
    expect(completed.game.blacksmithing.mode).toBe("idle")
    expect(completed.game.blacksmithing.lastStopReason).toBe("queue-complete")
    expect(getStackableQuantity(completed.game.inventory, "item.iron-ore")).toBe(5)
  })

  it("runs MAX until the next full cost cannot be reserved", () => {
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(game.inventory, "item.iron-ore", 53).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar", 1, "max")
    const completed = advanceBlacksmithing(started.game, 40.01, rng(0.99))
    expect(getStackableQuantity(completed.game.inventory, "item.iron-ore")).toBe(3)
    expect(getStackableQuantity(completed.game.inventory, "item.iron-bar")).toBe(10)
    expect(completed.summary.smeltsCompleted).toBe(10)
    expect(completed.game.blacksmithing.lastStopReason).toBe("materials-exhausted")
  })

  it("pauses mid-operation without progress or a second reservation", () => {
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(game.inventory, "item.iron-ore", 5).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar")
    const partial = advanceBlacksmithing(started.game, 1, rng(0.5))
    const paused = stopBlacksmithingState(partial.game)
    expect(paused.blacksmithing.active).toBe(false)
    expect(paused.blacksmithing.activeOperation?.kind).toBe("smelting")
    expect(paused.blacksmithing.actionTimerRemaining).toBeCloseTo(3)
    const frozen = advanceBlacksmithing(paused, 20, rng(0.5))
    expect(frozen.summary.operationsCompleted).toBe(0)
    expect(frozen.game.blacksmithing.actionTimerRemaining).toBeCloseTo(3)
    const resumed = startBlacksmithingRecipe(frozen.game, "blacksmithing-recipe.iron-bar")
    expect(resumed.outcome).toBe("resumed")
    const completed = advanceBlacksmithing(resumed.game, 3, rng(0.5))
    expect(getStackableQuantity(completed.game.inventory, "item.iron-ore")).toBe(0)
    expect(getStackableQuantity(completed.game.inventory, "item.iron-bar")).toBe(1)
  })

  it("rests before reserving when started at zero Forge Stamina", () => {
    let game = createInitialGameState()
    game = { ...game, blacksmithing: { ...game.blacksmithing, forgeStamina: 0 }, inventory: grantItem(game.inventory, "item.iron-ore", 5).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar")
    expect(started.outcome).toBe("resting")
    expect(started.game.blacksmithing.mode).toBe("resting")
    expect(started.game.blacksmithing.activeOperation).toBeNull()
    expect(getStackableQuantity(started.game.inventory, "item.iron-ore")).toBe(5)
    const rested = advanceBlacksmithing(started.game, 10, rng(0.5))
    expect(rested.game.blacksmithing.mode).toBe("working")
    expect(rested.game.blacksmithing.activeOperation?.kind).toBe("smelting")
    expect(getStackableQuantity(rested.game.inventory, "item.iron-ore")).toBe(0)
    expect(getStackableQuantity(rested.game.inventory, "item.iron-bar")).toBe(0)
  })

  it("round-trips a paused reserved operation through V19", () => {
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(game.inventory, "item.iron-ore", 5).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar")
    const paused = stopBlacksmithingState(advanceBlacksmithing(started.game, 1.25, rng(0.5)).game)
    const loaded = parseGameSaveJson(JSON.stringify(gameStateToSaveV19(paused, { reducedMotion: false, showInspectorButton: true })))!
    expect(loaded.version).toBe(20)
    expect(loaded.blacksmithing.active).toBe(false)
    expect(loaded.blacksmithing.activeOperation?.reservedCosts).toEqual([{ itemId: "item.iron-ore", quantity: 5 }])
    expect(loaded.blacksmithing.actionTimerRemaining).toBeCloseTo(paused.blacksmithing.actionTimerRemaining)
    const completed = advanceBlacksmithing(startBlacksmithingRecipe(loaded, "blacksmithing-recipe.iron-bar").game, 2.75, rng(0.5))
    expect(getStackableQuantity(completed.game.inventory, "item.iron-ore")).toBe(0)
    expect(getStackableQuantity(completed.game.inventory, "item.iron-bar")).toBe(1)
  })

  it("crafts all fourteen current Smithing outputs as clean unique ItemInstances", () => {
    for (const recipe of blacksmithingRecipes.filter((entry) => entry.kind === "smithing")) {
      let game = createInitialGameState()
      game = { ...game, professions: setProfessionLevel(game.professions, "blacksmithing", 18), inventory: grantItem(game.inventory, "item.iron-bar", recipe.costs[0].quantity).inventory }
      const initialInstanceIds = new Set(getItemInstances(game.inventory).map((entry) => entry.id))
      const started = startBlacksmithingRecipe(game, recipe.id)
      const completed = advanceBlacksmithing(started.game, recipe.baseDurationSeconds, rng(0.99))
      const instances = getItemInstances(completed.game.inventory).filter((entry) => entry.definitionId === recipe.outputItemId && !initialInstanceIds.has(entry.id))
      expect(instances).toHaveLength(1)
      expect(instances[0]).toMatchObject({ version: 3, unlockedUpgradeNodeIds: [] })
      expect(itemById[recipe.outputItemId]).toBeDefined()
      expect(completed.game.collection.discoveredItems).toContain(recipe.outputItemId)
    }
  })

  it("keeps production operation filters isolated", () => {
    const game = createInitialGameState()
    expect(operationTagsForItem("item.iron-shield")).toEqual(["iron", "defensive", "shield"])
    expect(getBlacksmithingStats(game, ["iron", "weapon"]).materialRecoveryChance).toBe(0)
  })

  it("purchases an exact profession-owned upgrade instantly without touching forge production state", () => {
    let game = createInitialGameState()
    game = { ...game, professions: setProfessionLevel(game.professions, "blacksmithing", 5), blacksmithing: { ...game.blacksmithing, forgeStamina: 0 } }
    const instance = Object.values(game.inventory.instances).find((entry) => entry.definitionId === "item.iron-sword")!
    const nodeId = "upgrade-node.iron-sword.tempered-edge-1"
    game = { ...game, inventory: grantItem(grantItem(game.inventory, "item.iron-bar", 2).inventory, "item.weapon-scrap", 2).inventory }
    const result = purchaseProfessionItemUpgrade({ game, professionId: "blacksmithing", instanceId: instance.id, nodeId })
    expect(result.outcome).toBe("purchased")
    expect(result.game.inventory.instances[instance.id].unlockedUpgradeNodeIds).toContain(nodeId)
    expect(getStackableQuantity(result.game.inventory, "item.iron-bar")).toBe(0)
    expect(result.game.blacksmithing).toEqual(game.blacksmithing)
    expect(result.game.professions.skills.blacksmithing).toEqual(game.professions.skills.blacksmithing)
  })

  it("enforces level, profession, prerequisite, and combat locks through the generic upgrade engine", () => {
    const instance = Object.values(createInitialGameState().inventory.instances).find((entry) => entry.definitionId === "item.iron-sword")!
    const nodeId = "upgrade-node.iron-sword.tempered-edge-1"
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(grantItem(game.inventory, "item.iron-bar", 20).inventory, "item.weapon-scrap", 20).inventory }
    expect(purchaseProfessionItemUpgrade({ game, professionId: "blacksmithing", instanceId: instance.id, nodeId }).outcome).toBe("profession-level-locked")
    game = { ...game, professions: setProfessionLevel(game.professions, "blacksmithing", 5) }
    expect(purchaseProfessionItemUpgrade({ game, professionId: "mining", instanceId: instance.id, nodeId }).outcome).toBe("wrong-profession")
    expect(purchaseProfessionItemUpgrade({ game, professionId: "blacksmithing", instanceId: instance.id, nodeId, combatLocked: true }).outcome).toBe("combat-locked")
    const purchased = purchaseProfessionItemUpgrade({ game, professionId: "blacksmithing", instanceId: instance.id, nodeId })
    expect(purchased.outcome).toBe("purchased")
    expect(purchaseProfessionItemUpgrade({ game: purchased.game, professionId: "blacksmithing", instanceId: instance.id, nodeId: "upgrade-node.iron-sword.tempered-edge-2" }).outcome).toBe("profession-level-locked")
  })

  it("migrates a valid prepaid V19 upgrade exactly once without charging current resources", () => {
    let game = createInitialGameState()
    const instance = Object.values(game.inventory.instances).find((entry) => entry.definitionId === "item.iron-sword")!
    const nodeId = "upgrade-node.iron-sword.tempered-edge-1"
    game = { ...game, inventory: grantItem(grantItem(game.inventory, "item.iron-bar", 2).inventory, "item.weapon-scrap", 2).inventory }
    const save = gameStateToSaveV19(game, { reducedMotion: false, showInspectorButton: true }) as unknown as Record<string, unknown>
    save.blacksmithing = {
      ...(save.blacksmithing as Record<string, unknown>),
      active: true,
      mode: "working",
      activityKind: "upgrade",
      activeOperation: { kind: "upgrade", instanceId: instance.id, nodeId, depth: 1, operationTags: ["iron", "weapon", "upgrade"], durationSeconds: 5, staminaCost: 5, xpReward: 5, reservedCosts: [{ itemId: "item.iron-bar", quantity: 2 }, { itemId: "item.weapon-scrap", quantity: 2 }] },
    }
    const loaded = parseGameSaveJson(JSON.stringify(save))!
    expect(loaded.version).toBe(20)
    expect(loaded.inventory.instances[instance.id].unlockedUpgradeNodeIds).toContain(nodeId)
    expect(getStackableQuantity(loaded.inventory, "item.iron-bar")).toBe(2)
    expect(getStackableQuantity(loaded.inventory, "item.weapon-scrap")).toBe(2)
    expect(loaded.blacksmithing.activeOperation).toBeNull()
    expect(loaded.blacksmithing.active).toBe(false)
  })

  it("refunds structurally valid reserved V19 upgrade costs when the pending target is invalid", () => {
    const game = createInitialGameState()
    const save = gameStateToSaveV19(game, { reducedMotion: false, showInspectorButton: true }) as unknown as Record<string, unknown>
    save.blacksmithing = {
      ...(save.blacksmithing as Record<string, unknown>),
      active: true,
      mode: "working",
      activityKind: "upgrade",
      activeOperation: { kind: "upgrade", instanceId: "missing-instance", nodeId: "missing-node", depth: 1, operationTags: ["iron", "upgrade"], durationSeconds: 5, staminaCost: 5, xpReward: 5, reservedCosts: [{ itemId: "item.iron-bar", quantity: 3 }, { itemId: "item.weapon-scrap", quantity: 4 }, { itemId: "not-a-stackable", quantity: 99 }] },
    }
    const loaded = parseGameSaveJson(JSON.stringify(save))!
    expect(getStackableQuantity(loaded.inventory, "item.iron-bar")).toBe(3)
    expect(getStackableQuantity(loaded.inventory, "item.weapon-scrap")).toBe(4)
    expect(loaded.blacksmithing.activeOperation).toBeNull()
    expect(Object.values(itemUpgradeNodeById)).toHaveLength(156)
  })

  it("reports a true safety cap separately from natural queue completion", () => {
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(game.inventory, "item.iron-ore", 10).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar", 1, "max")
    const capped = advanceBlacksmithing(started.game, 60, rng(0.99), { maxEvents: 1 })
    expect(capped.stopReason).toBe("safety-limit")
    expect(capped.game.blacksmithing.active).toBe(true)
    expect(capped.summary.smeltsCompleted).toBe(1)
  })

  it("keeps a fractional natural completion committed while billing the whole completed second", () => {
    let game = createInitialGameState()
    game = { ...game, professions: { ...game.professions, skills: { ...game.professions.skills, blacksmithing: { ...game.professions.skills.blacksmithing!, purchasedPerks: { "blacksmithing-perk.steady-hands": 1 } } } }, inventory: grantItem(game.inventory, "item.iron-ore", 5).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar")
    const adapter = createBlacksmithingActivityAdapter()
    const result = adapter.simulate(started.game, { requestedSeconds: 4 }, { next: () => 0.99 })
    expect(result.stopReason).toBe("activity-ended")
    expect(result.activitySeconds).toBe(4)
    expect(getStackableQuantity(result.state.inventory, "item.iron-bar")).toBe(1)
    expect(result.state.blacksmithing.active).toBe(false)
  })

  it("normalizes reserved costs structurally instead of rejecting a historical snapshot after balance tuning", () => {
    let game = createInitialGameState()
    game = { ...game, inventory: grantItem(game.inventory, "item.iron-ore", 5).inventory }
    const started = startBlacksmithingRecipe(game, "blacksmithing-recipe.iron-bar")
    const save = gameStateToSaveV19(started.game, { reducedMotion: false, showInspectorButton: true }) as unknown as Record<string, unknown>
    const blacksmithing = save.blacksmithing as Record<string, unknown>
    const operation = blacksmithing.activeOperation as Record<string, unknown>
    operation.reservedCosts = [{ itemId: "item.iron-ore", quantity: 7 }]
    const loaded = parseGameSaveJson(JSON.stringify(save))!
    expect(loaded.blacksmithing.activeOperation?.reservedCosts).toEqual([{ itemId: "item.iron-ore", quantity: 7 }])
  })
})
