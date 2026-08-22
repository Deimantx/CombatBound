import { getLevelProgress, levelForXp, xpForLevel } from "../../progression/levelCurve"
import type { ResourceMasteryProgress } from "../professionTypes"

export const RESOURCE_MASTERY_XP_SCALE = 0.6
export const IRON_MASTERY_MILESTONES = [
  { level: 10, name: "Hardened Technique", description: "+5% Mining Damage against Iron Vein", effects: { damage: 0.05 } },
  { level: 20, name: "Seam Reader", description: "+5% Iron Ore Yield", effects: { ore: 0.05 } },
  { level: 30, name: "Conditioned Delver", description: "+10 Max Mining Stamina while mining Iron", effects: { maxStamina: 10 } },
  { level: 40, name: "Gem Signs", description: "+15% relative Rough Gem chance from Iron", effects: { roughGem: 0.15 } },
  { level: 50, name: "Efficient Extraction", description: "-5% Mining Stamina Cost while mining Iron", effects: { cost: 0.05 } },
  { level: 60, name: "Rich Veins", description: "+10% Iron Ore Yield in Dense, Rich and Heart", effects: { deepOre: 0.1 } },
  { level: 70, name: "Deep Worker", description: "+10% Mining Damage in Rich and Heart", effects: { deepDamage: 0.1 } },
  { level: 80, name: "Prospector of Iron", description: "+20% relative all by-product chance from Iron", effects: { byproduct: 0.2 } },
  { level: 90, name: "Veteran of the Vein", description: "+5% Swing Speed and +5% Iron Ore Yield", effects: { speed: 0.05, ore: 0.05 } },
  { level: 100, name: "Master of Iron", description: "+15% Ore, +10% Damage, +25% Rough Gem and Black Stone chance", effects: { ore: 0.15, damage: 0.1, roughGem: 0.25, blackStone: 0.25 } },
] as const

export function ironMasteryLevel(progress: ResourceMasteryProgress) { return Math.max(1, levelForXp(progress.totalXp, 100, RESOURCE_MASTERY_XP_SCALE)) }
export function ironMasteryProgress(progress: ResourceMasteryProgress) { return { ...getLevelProgress(progress.totalXp, 100, RESOURCE_MASTERY_XP_SCALE), level: ironMasteryLevel(progress) } }
export function ironMasteryXpForLevel(level: number) { return xpForLevel(level, 100) * RESOURCE_MASTERY_XP_SCALE }
export function awardMasteryXp(progress: ResourceMasteryProgress, amount: number) { return { ...progress, totalXp: progress.totalXp + (Number.isFinite(amount) ? Math.max(0, amount) : 0) } }
export function activeIronMasteryMilestones(level: number) { return IRON_MASTERY_MILESTONES.filter((milestone) => milestone.level <= level) }
export function nextIronMasteryMilestone(level: number) { return IRON_MASTERY_MILESTONES.find((milestone) => milestone.level > level) }
