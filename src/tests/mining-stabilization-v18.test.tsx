import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { OfflineSimulationResultsModal } from "../app/offline/OfflineSimulationResultsModal"
import { requestOfflineSkip } from "../app/offline/offlineActivityCoordinator"
import { commitOfflineActivitySimulation } from "../app/offline/commitOfflineActivitySimulation"
import { createAndEnterProfile, loadAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController"
import { loadProfileGameSave } from "../game/profiles/profileStorage"
import { gameStateToSaveV17, gameStateToSaveV18, parseGameSaveJson } from "../game/persistence/saveGame"
import { isGameSaveV17 } from "../game/persistence/saveValidation"
import { createInitialGameState, type GameState } from "../game/gameState"
import { ironVein, miningResourceById } from "../game/professions/mining/miningData"
import { ironMasteryDefinition, resourceMasteryById, type ResourceMasteryDefinition } from "../game/professions/mining/miningMastery"
import { advanceMining, startMiningState, stopMiningState } from "../game/professions/mining/miningRuntime"
import type { MiningResourceDefinition, MiningResourceId } from "../game/professions/mining/miningTypes"
import { estimateMiningRates } from "../game/professions/mining/miningRates"
import { getMiningStats } from "../game/professions/mining/miningStats"
import { getProfessionPerkDefinitions, type ProfessionPerkRegistry } from "../game/professions/professionPerkRegistry"
import { getProfessionLevel, normalizeProfessionState, professionAvailablePoints, professionPointsSpent, setProfessionLevel } from "../game/professions/professionProgression"
import { purchaseProfessionPerk, resetProfessionPerks } from "../game/professions/professionPerkValidation"
import type { ProfessionPerkDefinition } from "../game/professions/professionPerkTypes"
import type { ResourceMasteryId } from "../game/professions/professionTypes"
import { createDeterministicOfflineRng, OfflineActivityRegistry, runOfflineActivityTransaction } from "../game/offline/offlineActivityContract"
import { createMiningActivityAdapter, type MiningOfflineSummary } from "../game/offline/miningActivity"
import { getProfileSessionOwnerId, hasValidOwnedProfileSessionLease } from "../game/profiles/profileSessionLease"
import { isCombatHuntOfflineSummary } from "../app/offline/offlineActivityTypes"
import { useGameStore } from "../state/gameStore"
import { useOfflineActivityRuntimeStore } from "../state/offlineActivityRuntimeStore"
import { useProfileStore } from "../state/profileStore"

function resetStores() {
  cleanup()
  localStorage.clear()
  useOfflineActivityRuntimeStore.getState().reset()
  useGameStore.getState().unloadProfile()
  useProfileStore.getState().refreshProfiles()
}

beforeEach(resetStores)
afterEach(() => {
  cleanup()
  try { returnToProfileSelect() } catch { /* test teardown */ }
  useOfflineActivityRuntimeStore.getState().reset()
  localStorage.clear()
  useGameStore.getState().unloadProfile()
  useProfileStore.getState().refreshProfiles()
})

function miningGame(overrides: Partial<GameState["mining"]> = {}) {
  const game = createInitialGameState()
  return { ...game, mining: startMiningState({ ...game.mining, ...overrides }, game) }
}

describe("Mining V18 stabilization runtime", () => {
  it("preserves the exact remaining swing when paused and resumed", () => {
    const game = miningGame({ swingTimerRemaining: 0.73 })
    const paused = { ...game, mining: stopMiningState(game.mining) }
    expect(paused.mining.active).toBe(false)
    expect(paused.mining.mode).toBe("swinging")
    expect(paused.mining.swingTimerRemaining).toBeCloseTo(0.73)
    const resumed = { ...paused, mining: startMiningState(paused.mining, paused) }
    const beforeSwing = advanceMining(resumed, 0.72)
    expect(beforeSwing.summary.swings).toBe(0)
    const atSwing = advanceMining(beforeSwing.game, 0.02)
    expect(atSwing.summary.swings).toBe(1)
  })

  it("preserves a paused swing phase through V18 save/load", () => {
    const game = miningGame({ swingTimerRemaining: 0.73 })
    const paused = { ...game, mining: stopMiningState(game.mining) }
    const loaded = parseGameSaveJson(JSON.stringify(gameStateToSaveV18(paused, { reducedMotion: false, showInspectorButton: true })))!
    expect(loaded.mining.active).toBe(false)
    expect(loaded.mining.mode).toBe("swinging")
    expect(loaded.mining.swingTimerRemaining).toBeCloseTo(0.73)
    const resumed = { ...loaded, mining: startMiningState(loaded.mining, loaded) }
    expect(advanceMining(resumed, 0.72).summary.swings).toBe(0)
    expect(advanceMining(advanceMining(resumed, 0.72).game, 0.02).summary.swings).toBe(1)
  })

  it("preserves a paused rest phase through V18 save/load without resetting it", () => {
    const game = miningGame({ mode: "resting", miningStamina: 0, swingTimerRemaining: 0, restTimerRemaining: 4.3, exhaustionRestsThisDeposit: 1 })
    const paused = { ...game, mining: stopMiningState(game.mining) }
    const loaded = parseGameSaveJson(JSON.stringify(gameStateToSaveV18(paused, { reducedMotion: false, showInspectorButton: true })))!
    expect(loaded.mining.active).toBe(false)
    expect(loaded.mining.mode).toBe("resting")
    expect(loaded.mining.restTimerRemaining).toBeCloseTo(4.3)
    expect(loaded.mining.exhaustionRestsThisDeposit).toBe(1)
    const resumed = { ...loaded, mining: startMiningState(loaded.mining, loaded) }
    expect(resumed.mining.restTimerRemaining).toBeCloseTo(4.3)
    const partial = advanceMining(resumed, 1)
    expect(partial.game.mining.restTimerRemaining).toBeCloseTo(3.3)
    expect(partial.game.mining.exhaustionRestsThisDeposit).toBe(1)
  })

  it("preserves the exact remaining rest and does not duplicate Second Wind", () => {
    const game = createInitialGameState()
    const withSecondWind: GameState = { ...game, professions: { ...game.professions, skills: { ...game.professions.skills, mining: { ...game.professions.skills.mining!, purchasedPerks: { "mining-perk.second-wind": 1 } } } } }
    const exhausted = { ...withSecondWind, mining: startMiningState({ ...withSecondWind.mining, miningStamina: 0 }, withSecondWind) }
    expect(exhausted.mining.restTimerRemaining).toBe(6)
    const paused = { ...exhausted, mining: stopMiningState(exhausted.mining) }
    const resumed = { ...paused, mining: startMiningState(paused.mining, paused) }
    expect(resumed.mining.mode).toBe("resting")
    expect(resumed.mining.restTimerRemaining).toBe(6)
    const afterFirstRest = advanceMining(resumed, 6)
    expect(afterFirstRest.game.mining.mode).toBe("swinging")
    const secondExhaustion = { ...afterFirstRest.game, mining: startMiningState({ ...afterFirstRest.game.mining, miningStamina: 0 }, afterFirstRest.game) }
    expect(secondExhaustion.mining.mode).toBe("resting")
    expect(secondExhaustion.mining.restTimerRemaining).toBe(10)
  })

  it("preserves Second Wind through a paused-rest reload", () => {
    const base = createInitialGameState()
    const withSecondWind: GameState = { ...base, professions: { ...base.professions, skills: { ...base.professions.skills, mining: { ...base.professions.skills.mining!, purchasedPerks: { "mining-perk.second-wind": 1 } } } } }
    const exhausted = { ...withSecondWind, mining: startMiningState({ ...withSecondWind.mining, miningStamina: 0 }, withSecondWind) }
    const paused = { ...exhausted, mining: stopMiningState(exhausted.mining) }
    const loaded = parseGameSaveJson(JSON.stringify(gameStateToSaveV18(paused, { reducedMotion: false, showInspectorButton: true })))!
    expect(loaded.mining.mode).toBe("resting")
    expect(loaded.mining.restTimerRemaining).toBeCloseTo(6)
    expect(loaded.mining.exhaustionRestsThisDeposit).toBe(1)
    const resumed = { ...loaded, mining: startMiningState(loaded.mining, loaded) }
    const afterRest = advanceMining(resumed, 6)
    expect(afterRest.game.mining.mode).toBe("swinging")
    const nextExhaustion = { ...afterRest.game, mining: startMiningState({ ...afterRest.game.mining, miningStamina: 0 }, afterRest.game) }
    expect(nextExhaustion.mining.restTimerRemaining).toBe(10)
    expect(nextExhaustion.mining.exhaustionRestsThisDeposit).toBe(2)
  })

  it("freezes Mining rest while Combat is active", () => {
    const game = miningGame({ mode: "resting", active: true, miningStamina: 0, swingTimerRemaining: 0, restTimerRemaining: 4.3, exhaustionRestsThisDeposit: 1 })
    const combatSwitch = { ...game, mining: stopMiningState(game.mining) }
    const advancedWhileCombatRuns = advanceMining(combatSwitch, 60)
    expect(advancedWhileCombatRuns.summary.seconds).toBe(0)
    expect(advancedWhileCombatRuns.game.mining.restTimerRemaining).toBe(4.3)
    const resumed = { ...combatSwitch, mining: startMiningState(combatSwitch.mining, combatSwitch) }
    expect(resumed.mining.restTimerRemaining).toBe(4.3)
  })

  it("does not count a starting ore remainder as new production", () => {
    const base = miningGame()
    const zero = estimateMiningRates({ ...base, mining: { ...base.mining, yieldRemainders: { "item.iron-ore": 0 } } })
    const high = estimateMiningRates({ ...base, mining: { ...base.mining, yieldRemainders: { "item.iron-ore": 0.93 } } })
    expect(high.ironOrePerHour).toBeCloseTo(zero.ironOrePerHour, 6)
    expect(high.roughGemPerHour).toBeCloseTo(zero.roughGemPerHour, 6)
    expect(high.blackStonePerHour).toBeCloseTo(zero.blackStonePerHour, 6)
    expect(estimateMiningRates(base)).toEqual(zero)
  })

  it("reports a safety stop without charging unsimulated bank time", () => {
    const result = advanceMining(miningGame(), 60, { next: () => 1 }, { maxEvents: 1 })
    expect(result.stopReason).toBe("safety-limit")
    expect(result.summary.seconds).toBeLessThan(60)
    expect(Math.floor(result.summary.seconds)).toBeLessThan(60)
  })

  it("charges only accepted safety-limit time through the real profile transaction", () => {
    const fractionalAdapter = createMiningActivityAdapter({ maxEvents: 1 })
    const fractional = fractionalAdapter.simulate(miningGame({ swingTimerRemaining: 0.73 }), { requestedSeconds: 60 }, createDeterministicOfflineRng(11))
    expect(fractional.activitySeconds).toBe(0)
    expect(fractional.bankSpentSeconds).toBe(0)
    expect(fractional.state.mining.swingTimerRemaining).toBeCloseTo(0.73)
    expect(fractional.state.mining.totalSwings).toBe(0)

    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true)
    const profileId = useGameStore.getState().activeProfileId!
    useGameStore.getState().startMining()
    expect(useProfileStore.getState().setOfflineBankForDebug(profileId, 60)).toBe(true)
    const ownerId = getProfileSessionOwnerId()
    const previousGame = useGameStore.getState().game
    const adapter = createMiningActivityAdapter({ maxEvents: 1 })
    const result = runOfflineActivityTransaction<GameState, MiningOfflineSummary>({
      requestedSeconds: 60,
      availableBankSeconds: 60,
      registry: new OfflineActivityRegistry([adapter]),
      snapshot: () => useGameStore.getState().game,
      verifyLease: () => hasValidOwnedProfileSessionLease(profileId, ownerId),
      isRunning: () => false,
      setRunning: () => undefined,
      rng: createDeterministicOfflineRng(17),
      seed: 17,
      commit: ({ result: simulation }) => commitOfflineActivitySimulation({
        profileId,
        ownerId,
        previousGame,
        nextGame: simulation.state,
        bankSpentSeconds: simulation.bankSpentSeconds,
        reducedMotion: useGameStore.getState().reducedMotion,
        showInspectorButton: useGameStore.getState().showInspectorButton,
      }),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.simulation.stopReason).toBe("safety-limit")
    expect(result.simulation.activitySeconds).toBeLessThan(60)
    expect(result.simulation.bankSpentSeconds).toBe(result.simulation.activitySeconds)
    expect(result.simulation.wastedSeconds).toBe(result.simulation.bankSpentSeconds - result.simulation.activitySeconds)
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(60 - result.simulation.bankSpentSeconds)
  })
})

describe("Generic profession and resource registries", () => {
  const syntheticPerk: ProfessionPerkDefinition = {
    id: "blacksmithing-perk.test", skillId: "blacksmithing", name: "Test Temper", branch: "Test", description: "Synthetic registry fixture", type: "small", maxRank: 3, costPerRank: 3, requiredSkillLevel: 1, prerequisiteRules: [], effects: [], position: { x: 0, y: 0 },
  }

  it("normalizes, spends, purchases and resets a non-Mining profession using its own registry", () => {
    const registry: ProfessionPerkRegistry = { blacksmithing: { [syntheticPerk.id]: syntheticPerk }, mining: {} }
    const state = normalizeProfessionState({ skills: { blacksmithing: { skillId: "blacksmithing", totalXp: 0, bonusSkillPoints: 0, purchasedPerks: { [syntheticPerk.id]: 9 } } } }, registry)
    expect(state.skills.blacksmithing?.purchasedPerks[syntheticPerk.id]).toBe(3)
    const leveled = setProfessionLevel(state, "blacksmithing", 10)
    expect(getProfessionLevel(leveled, "blacksmithing")).toBe(10)
    expect(professionPointsSpent(leveled, "blacksmithing", registry)).toBe(9)
    expect(professionAvailablePoints(leveled, "blacksmithing", registry)).toBe(0)
    const purchased = purchaseProfessionPerk({ ...leveled, skills: { ...leveled.skills, blacksmithing: { ...leveled.skills.blacksmithing!, purchasedPerks: {} } } }, syntheticPerk.id, getProfessionPerkDefinitions("blacksmithing", registry))
    expect(purchased.outcome).toBe("purchased")
    expect(resetProfessionPerks(purchased.state, "blacksmithing").skills.blacksmithing?.purchasedPerks).toEqual({})
  })

  it("resolves Mining stats from a synthetic resource and mastery definition", () => {
    const game = createInitialGameState()
    const resource: MiningResourceDefinition = { ...ironVein, id: "mining-resource.synthetic" as MiningResourceId, name: "Synthetic Seam", baseSwingTimeSeconds: 4, baseMaxStamina: 77, baseStaminaCostPerSwing: 3, baseRestDurationSeconds: 9, masteryId: "mastery.synthetic" as ResourceMasteryId }
    const mastery: ResourceMasteryDefinition = { ...ironMasteryDefinition, id: "mastery.synthetic" as ResourceMasteryId, resourceId: resource.id, milestones: [] }
    const professions = { ...game.professions, resourceMasteries: { ...game.professions.resourceMasteries, [mastery.id]: { masteryId: mastery.id, totalXp: 0 } } }
    const stats = getMiningStats({ ...game, professions, resourceId: resource.id, resourceRegistry: { ...miningResourceById, [resource.id]: resource }, masteryRegistry: { ...resourceMasteryById, [mastery.id]: mastery } })
    expect(stats.swingInterval).toBe(4)
    expect(stats.maxMiningStamina).toBe(77)
    expect(stats.staminaCost).toBe(3)
    expect(stats.restDuration).toBe(9)
    expect(stats.miningDamage).toBe(10)
  })
})

describe("Mining Time Bank integration", () => {
  it("renders Mining results, preserves the active profile, charges once, and reloads V18", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true)
    const profileId = useGameStore.getState().activeProfileId!
    useGameStore.getState().setScreen("mining")
    useGameStore.getState().startMining()
    expect(useGameStore.getState().game.mining.active).toBe(true)
    expect(useProfileStore.getState().setOfflineBankForDebug(profileId, 60)).toBe(true)

    const result = requestOfflineSkip(60)
    expect(result.ok).toBe(true)
    expect(useGameStore.getState().activeProfileId).toBe(profileId)
    expect(useGameStore.getState().screen).toBe("mining")
    expect(useGameStore.getState().game.mining.active).toBe(true)
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(0)

    render(<OfflineSimulationResultsModal />)
    expect(screen.getByRole("heading", { name: "Mining / Iron Vein" })).toBeInTheDocument()
    expect(screen.getByText("Mining XP")).toBeInTheDocument()
    expect(screen.getByText("Iron Ore")).toBeInTheDocument()
    expect(screen.queryByText("Combat Summary")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "CONTINUE" }))
    expect(useOfflineActivityRuntimeStore.getState().resultsOpen).toBe(false)
    expect(useGameStore.getState().activeProfileId).toBe(profileId)
    expect(useGameStore.getState().screen).toBe("mining")
    expect(useGameStore.getState().game.mining.active).toBe(true)

    const saved = loadProfileGameSave(profileId)
    expect(saved?.version).toBe(19)
    expect(parseGameSaveJson(JSON.stringify(saved))?.mining.active).toBe(true)
    returnToProfileSelect()
    expect(loadAndEnterProfile(profileId).ok).toBe(true)
    expect(useGameStore.getState().game.mining.active).toBe(true)
  })

  it("keeps the Combat Time Bank renderer and profile path working", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true)
    const profileId = useGameStore.getState().activeProfileId!
    useGameStore.getState().startHunt()
    expect(useProfileStore.getState().setOfflineBankForDebug(profileId, 60)).toBe(true)
    expect(requestOfflineSkip(60).ok).toBe(true)
    expect(useGameStore.getState().activeProfileId).toBe(profileId)
    render(<OfflineSimulationResultsModal />)
    expect(screen.getByText("Combat Summary")).toBeInTheDocument()
    expect(screen.queryByText("Mining Summary")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "CONTINUE" }))
    expect(useGameStore.getState().activeProfileId).toBe(profileId)
  })

  it("renders a safe fallback for malformed Combat results and keeps both close paths usable", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true)
    const profileId = useGameStore.getState().activeProfileId!
    const malformedSummary = {
      enemiesDefeated: 1,
      damageDealt: 10,
      damageTaken: 2,
      healing: 0,
      highestHit: 5,
      progressionRows: [{ progressionId: "combat", name: "Combat", xpGained: 0, xpPerHour: 0, levelBefore: 1, levelAfter: 1 }],
      lootGained: {},
      // Intentionally omit gold: this must fail the renderer guard.
    }
    expect(isCombatHuntOfflineSummary(malformedSummary)).toBe(false)
    useOfflineActivityRuntimeStore.getState().setLastResult({
      profileId,
      activityType: "combat-hunt",
      simulation: {
        requestedSeconds: 60,
        activitySeconds: 60,
        bankSpentSeconds: 60,
        wastedSeconds: 0,
        stopReason: "requested-time-complete",
        state: useGameStore.getState().game,
        summary: malformedSummary,
      },
    } as never)
    useOfflineActivityRuntimeStore.getState().openResults()
    render(<OfflineSimulationResultsModal />)
    expect(screen.getByText("Unable to display this activity result.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close results" }))
    expect(useOfflineActivityRuntimeStore.getState().resultsOpen).toBe(false)
    cleanup()
    useOfflineActivityRuntimeStore.getState().openResults()
    render(<OfflineSimulationResultsModal />)
    fireEvent.click(screen.getByRole("button", { name: "CONTINUE" }))
    expect(useOfflineActivityRuntimeStore.getState().resultsOpen).toBe(false)
    expect(useGameStore.getState().activeProfileId).toBe(profileId)
  })
})

describe("Historical V17 persistence freeze", () => {
  it("serializes exactly 13 historical slots and migrates without losing specialized gear", () => {
    const game = createInitialGameState()
    const v17 = gameStateToSaveV17(game, { reducedMotion: false, showInspectorButton: true })
    const historicalSlots = ["weapon", "offhand", "head", "armor", "gloves", "boots", "belt", "cape", "necklace", "ring1", "ring2", "earring1", "earring2"]
    expect(historicalSlots).toHaveLength(13)
    expect(Object.keys(v17.equipment.slots)).not.toContain("tool")
    expect(Object.keys(v17.equipment.slots).every((slot) => historicalSlots.includes(slot))).toBe(true)
    expect(Object.values(v17.inventory.instances).every((instance) => Object.keys(instance).sort().join(",") === "definitionId,id,unlockedUpgradeNodeIds,version")).toBe(true)
    expect(isGameSaveV17(v17)).toBe(true)
    expect("professions" in v17).toBe(false)
    expect("mining" in v17).toBe(false)
    const migrated = parseGameSaveJson(JSON.stringify({ ...v17, inventory: { ...v17.inventory, instances: {}, nextInstanceSequence: 1 }, equipment: { slots: {} } }))
    expect(migrated?.version).toBe(19)
    expect(Object.values(migrated?.inventory.instances ?? {}).filter((instance) => instance.definitionId === "item.worn-pickaxe")).toHaveLength(1)
    expect(migrated?.equipment.slots.tool).toBeDefined()
  })

  it("preserves specialized Iron Sword, Armor and Shield copies through V17 migration", () => {
    const base = createInitialGameState()
    const swordId = "item-instance-00000101"
    const armorId = "item-instance-00000102"
    const shieldId = "item-instance-00000103"
    const specializedInstances = {
      [swordId]: { id: swordId, definitionId: "item.iron-sword", version: 3 as const, unlockedUpgradeNodeIds: ["upgrade-node.iron-sword.tempered-edge-1"] },
      [armorId]: { id: armorId, definitionId: "item.iron-armor", version: 3 as const, unlockedUpgradeNodeIds: ["upgrade-node.iron-armor.reinforced-plates"] },
      [shieldId]: { id: shieldId, definitionId: "item.iron-shield", version: 3 as const, unlockedUpgradeNodeIds: ["upgrade-node.iron-shield.broad-guard"] },
    }
    const v17 = gameStateToSaveV17({
      ...base,
      inventory: { ...base.inventory, instances: specializedInstances, nextInstanceSequence: 104 },
      equipment: { slots: { weapon: swordId, armor: armorId, offhand: shieldId } },
    }, { reducedMotion: false, showInspectorButton: true })
    const migrated = parseGameSaveJson(JSON.stringify(v17))
    expect(migrated?.version).toBe(19)
    expect([swordId, armorId, shieldId].every((id) => migrated?.inventory.instances[id])).toBe(true)
    expect(migrated?.inventory.instances[swordId]).toMatchObject({ definitionId: "item.iron-sword", unlockedUpgradeNodeIds: specializedInstances[swordId].unlockedUpgradeNodeIds })
    expect(migrated?.inventory.instances[armorId]).toMatchObject({ definitionId: "item.iron-armor", unlockedUpgradeNodeIds: specializedInstances[armorId].unlockedUpgradeNodeIds })
    expect(migrated?.inventory.instances[shieldId]).toMatchObject({ definitionId: "item.iron-shield", unlockedUpgradeNodeIds: specializedInstances[shieldId].unlockedUpgradeNodeIds })
    expect(migrated?.equipment.slots.weapon).toBe(swordId)
    expect(migrated?.equipment.slots.armor).toBe(armorId)
    expect(migrated?.equipment.slots.offhand).toBe(shieldId)
    expect(Object.values(migrated?.inventory.instances ?? {}).filter((instance) => instance.definitionId === "item.worn-pickaxe")).toHaveLength(1)
    expect(migrated?.equipment.slots.tool).toBeDefined()
  })

  it("does not resurrect a deliberately empty V18 tool slot", () => {
    const game = createInitialGameState()
    const instances = Object.fromEntries(Object.entries(game.inventory.instances).filter(([, instance]) => instance.definitionId !== "item.worn-pickaxe"))
    const save = gameStateToSaveV18({ ...game, inventory: { ...game.inventory, instances }, equipment: { slots: {} } }, { reducedMotion: false, showInspectorButton: true })
    const loaded = parseGameSaveJson(JSON.stringify(save))
    expect(loaded?.equipment.slots.tool).toBeUndefined()
    expect(Object.values(loaded?.inventory.instances ?? {}).some((instance) => instance.definitionId === "item.worn-pickaxe")).toBe(false)
  })
})
