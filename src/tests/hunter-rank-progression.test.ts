import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game/gameState'
import { awardHunterRankPoints, getHunterRankProgress, hunterRankForPoints, hunterRankPointCostForRank, hunterRankPointsForProfessionLevelGain, totalHunterRankPointsForRank } from '../game/progression/hunterRankProgression'
import { awardProficiencyXp, proficiencyXpForLevel } from '../game/progression/proficiencyProgression'

describe('Hunter Rank progression', () => {
  it('uses the exact repeated rounded 1.25 point curve', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(hunterRankPointCostForRank)).toEqual([0, 10, 13, 16, 20, 25, 31])
    expect(totalHunterRankPointsForRank(1)).toBe(0)
    expect(totalHunterRankPointsForRank(5)).toBe(59)
    expect(totalHunterRankPointsForRank(30)).toBeGreaterThan(totalHunterRankPointsForRank(29))
  })

  it('maps points to rank and exposes honest progress', () => {
    expect(hunterRankForPoints(0)).toBe(1)
    expect(hunterRankForPoints(9)).toBe(1)
    expect(hunterRankForPoints(10)).toBe(2)
    expect(getHunterRankProgress(15)).toMatchObject({ rank: 2, currentRankStartPoints: 10, pointsIntoRank: 5, pointsToNextRank: 8, isMaxRank: false })
  })

  it('awards only explicit rank points and never couples them to Proficiency XP', () => {
    const initial = createInitialGameState().progression
    const awarded = awardHunterRankPoints(initial, 10)
    expect(awarded.newRank).toBe(2)
    expect(awarded.progression.hunterRankPoints).toBe(10)
    const proficiency = awardProficiencyXp(awarded.progression, 'one-handed-sword', proficiencyXpForLevel(4))
    expect(proficiency.progression.hunterRankPoints).toBe(10)
    expect(hunterRankPointsForProfessionLevelGain(4, 7)).toBe(3)
  })
})
