import { miningPerkById } from "./mining/miningPerks"
import type { ProfessionPerkDefinition } from "./professionPerkTypes"
import type { ProfessionSkillId } from "./professionTypes"

export type ProfessionPerkDefinitions = Record<string, ProfessionPerkDefinition>
export type ProfessionPerkRegistry = Partial<Record<ProfessionSkillId, ProfessionPerkDefinitions>>

export const professionPerkDefinitionsBySkill: ProfessionPerkRegistry = {
  mining: miningPerkById,
}

export function getProfessionPerkDefinitions(skillId: ProfessionSkillId, registry: ProfessionPerkRegistry = professionPerkDefinitionsBySkill): ProfessionPerkDefinitions {
  return registry[skillId] ?? {}
}
