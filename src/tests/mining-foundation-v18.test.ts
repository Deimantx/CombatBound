import { describe, expect, it } from "vitest"
import { createInitialGameState } from "../game/gameState"
import { advanceMining, startMiningState } from "../game/professions/mining/miningRuntime"
import { MINING_PERK_TREE_COST, miningPerkById } from "../game/professions/mining/miningPerks"
import { professionAvailablePoints, professionPointsFromLevels, setProfessionLevel } from "../game/professions/professionProgression"
import { getMiningStats } from "../game/professions/mining/miningStats"
import { ironMasteryLevel, ironMasteryXpForLevel } from "../game/professions/mining/miningMastery"
import { gameStateToSaveV18, parseGameSaveJson } from "../game/persistence/saveGame"

describe("Mining foundation V18", () => {
  it("keeps Mining separate from Combat proficiency and starts with a Worn Pickaxe", () => {
    const game = createInitialGameState()
    expect(game.professions.skills.mining).toEqual({ skillId: "mining", totalXp: 0, bonusSkillPoints: 0, purchasedPerks: {} })
    expect((game.progression.proficiencies as Record<string, unknown>).mining).toBeUndefined()
    expect(game.equipment.slots.tool).toBeDefined()
    expect(game.inventory.instances[game.equipment.slots.tool!].definitionId).toBe("item.worn-pickaxe")
  })

  it("uses one point per level and keeps the authored tree above the level budget", () => {
    const game = createInitialGameState()
    const level100 = { ...game, professions: setProfessionLevel(game.professions, "mining", 100) }
    expect(professionPointsFromLevels(level100.professions, "mining")).toBe(99)
    expect(MINING_PERK_TREE_COST).toBe(124)
    expect(Object.keys(miningPerkById)).toHaveLength(38)
    expect(professionAvailablePoints(level100.professions, "mining")).toBe(99)
  })

  it("awards all swing rewards from effective damage and does not carry overkill", () => {
    const initial = createInitialGameState()
    const game = { ...initial, mining: { ...initial.mining, active: true, mode: "swinging" as const, swingTimerRemaining: 2, stageDurabilityRemaining: 4 } }
    const result = advanceMining(game, 2, { next: () => 1 })
    expect(result.summary.swings).toBe(1)
    expect(result.game.mining.currentStageId).toBe("exposed-seam")
    expect(result.game.mining.stageDurabilityRemaining).toBe(190)
    expect(result.game.mining.yieldRemainders["item.iron-ore"]).toBeCloseTo(0.14)
    expect(result.game.professions.skills.mining?.totalXp).toBeCloseTo(0.32)
    expect(result.game.professions.resourceMasteries["mastery.iron-vein"].totalXp).toBeCloseTo(0.16)
  })

  it("allows the low-stamina final swing, then rests and restores only through active time", () => {
    const initial = createInitialGameState()
    const started = { ...initial, mining: startMiningState({ ...initial.mining, miningStamina: 3 }, initial) }
    const afterSwing = advanceMining(started, 2, { next: () => 1 })
    expect(afterSwing.summary.swings).toBe(1)
    expect(afterSwing.game.mining.miningStamina).toBe(0)
    expect(afterSwing.game.mining.mode).toBe("resting")
    expect(afterSwing.game.mining.restTimerRemaining).toBe(10)
    const afterRest = advanceMining(afterSwing.game, 10, { next: () => 1 })
    expect(afterRest.game.mining.miningStamina).toBe(100)
    expect(afterRest.game.mining.mode).toBe("swinging")
    expect(afterRest.summary.swings).toBe(0)
  })

  it("scales the Iron Pickaxe without changing Combat stats", () => {
    const game = createInitialGameState()
    const worn = getMiningStats({ ...game, stageId: "outer-crust", resourceId: "mining-resource.iron-vein" })
    const iron = Object.values(game.inventory.instances).find((instance) => instance.definitionId === "item.iron-pickaxe")
    expect(iron).toBeUndefined()
    expect(worn.miningDamage).toBe(10)
    expect(getMiningStats({ ...game, stageId: "heart-of-iron", resourceId: "mining-resource.iron-vein" }).miningDamage).toBe(10)
    expect((game.progression.proficiencies as Record<string, unknown>).mining).toBeUndefined()
  })

  it("derives Iron Mastery levels from the scaled generic curve", () => {
    const game = createInitialGameState()
    const progress = { ...game.professions.resourceMasteries["mastery.iron-vein"], totalXp: ironMasteryXpForLevel(50) }
    expect(ironMasteryLevel(progress)).toBe(50)
    expect(ironMasteryLevel({ ...progress, totalXp: 0 })).toBe(1)
  })

  it("persists Mining, Mastery, stage, stamina and remainders in V18", () => {
    const game = createInitialGameState()
    const active = { ...game, mining: { ...game.mining, active: true, mode: "swinging" as const, currentStageId: "rich-core" as const, stageDurabilityRemaining: 17, miningStamina: 42, swingTimerRemaining: 1.25, yieldRemainders: { "item.iron-ore": 0.81 } } }
    const save = gameStateToSaveV18(active, { reducedMotion: false, showInspectorButton: true })
    const loaded = parseGameSaveJson(JSON.stringify(save))
    expect(loaded?.version).toBe(18)
    expect(loaded?.mining.stageDurabilityRemaining).toBe(17)
    expect(loaded?.mining.miningStamina).toBe(42)
    expect(loaded?.mining.yieldRemainders["item.iron-ore"]).toBe(0.81)
  })
})
