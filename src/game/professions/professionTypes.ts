export type ProfessionSkillId = string
export type ResourceMasteryId = string

export interface ProfessionSkillProgress {
  skillId: ProfessionSkillId
  totalXp: number
  bonusSkillPoints: number
  purchasedPerks: Record<string, number>
}

export interface ResourceMasteryProgress {
  masteryId: ResourceMasteryId
  totalXp: number
}

export interface ProfessionState {
  skills: Partial<Record<ProfessionSkillId, ProfessionSkillProgress>>
  resourceMasteries: Record<ResourceMasteryId, ResourceMasteryProgress>
}
