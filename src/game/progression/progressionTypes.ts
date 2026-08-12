export type CombatSkillId = 'swordsmanship' | 'defense' | 'stances' | 'magic'
export interface SkillProgress { id: CombatSkillId; level: number; totalXp: number }
export interface ProgressionState { skills: Record<CombatSkillId, SkillProgress>; trainingFocus: CombatSkillId; hunterRank: number }
