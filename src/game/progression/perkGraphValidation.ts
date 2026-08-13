import type { CombatProficiencyId, ProficiencyPerkDefinition } from './progressionTypes'

export interface PerkGraphValidationResult {
  valid: boolean
  errors: string[]
}

const validColumns = (column: number) => Number.isInteger(column) && column >= 0 && column <= 8
const validRows = (row: number) => Number.isInteger(row) && row >= 0 && row <= 10

/** Validates authored graph content without mutating the definitions. */
export function validatePerkGraph(definitions: ProficiencyPerkDefinition[], proficiencyId?: CombatProficiencyId): PerkGraphValidationResult {
  const scoped = proficiencyId ? definitions.filter((perk) => perk.proficiencyId === proficiencyId) : definitions
  const errors: string[] = []
  const byId = new Map<string, ProficiencyPerkDefinition>()

  for (const perk of scoped) {
    if (byId.has(perk.id)) errors.push(`Duplicate perk id: ${perk.id}`)
    byId.set(perk.id, perk)
    if (!perk.id || !perk.name || !perk.branch) errors.push(`Incomplete perk definition: ${perk.id || '(missing id)'}`)
    if (!Number.isInteger(perk.requiredProficiencyLevel) || perk.requiredProficiencyLevel < 1 || perk.requiredProficiencyLevel > 100) errors.push(`Invalid required level: ${perk.id}`)
    if (!Number.isInteger(perk.maxRank) || perk.maxRank < 1) errors.push(`Invalid max rank: ${perk.id}`)
    if (!Number.isFinite(perk.costPerRank) || perk.costPerRank < 1) errors.push(`Invalid point cost: ${perk.id}`)
    if (!validColumns(perk.presentation.column) || !validRows(perk.presentation.row)) errors.push(`Invalid presentation coordinate: ${perk.id}`)
  }

  for (const perk of scoped) {
    for (const rule of perk.prerequisiteRules) {
      if (rule.mode === 'any' && (!Number.isInteger(rule.minimumSatisfied) || (rule.minimumSatisfied ?? 1) < 1 || (rule.minimumSatisfied ?? 1) > rule.requirements.length)) errors.push(`Invalid any-rule minimum: ${perk.id}`)
      for (const requirement of rule.requirements) {
        const parent = byId.get(requirement.perkId)
        if (!parent) {
          errors.push(`Missing prerequisite ${requirement.perkId} referenced by ${perk.id}`)
          continue
        }
        if (parent.proficiencyId !== perk.proficiencyId) errors.push(`Cross-proficiency prerequisite ${requirement.perkId} referenced by ${perk.id}`)
        if (!Number.isInteger(requirement.requiredRank) || requirement.requiredRank < 1 || requirement.requiredRank > parent.maxRank) errors.push(`Invalid prerequisite rank ${requirement.perkId} -> ${perk.id}`)
      }
    }
  }

  const roots = scoped.filter((perk) => perk.prerequisiteRules.length === 0)
  if (scoped.length > 0 && roots.length !== 1) errors.push(`Expected exactly one root, found ${roots.length}`)
  if (roots.length === 1 && roots[0].presentation.row !== 0) errors.push(`Root must be on row 0: ${roots[0].id}`)
  const apexes = scoped.filter((perk) => perk.presentation.row === 10)
  if (scoped.length > 0 && apexes.length === 0) errors.push('Expected at least one apex node')

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (perk: ProficiencyPerkDefinition) => {
    if (visiting.has(perk.id)) {
      errors.push(`Prerequisite cycle detected at ${perk.id}`)
      return
    }
    if (visited.has(perk.id)) return
    visiting.add(perk.id)
    for (const rule of perk.prerequisiteRules) for (const requirement of rule.requirements) {
      const parent = byId.get(requirement.perkId)
      if (parent) visit(parent)
    }
    visiting.delete(perk.id)
    visited.add(perk.id)
  }
  for (const perk of scoped) visit(perk)

  return { valid: errors.length === 0, errors: [...new Set(errors)] }
}

export function validateAllPerkGraphs(definitions: ProficiencyPerkDefinition[]) {
  const proficiencyIds = [...new Set(definitions.map((perk) => perk.proficiencyId))]
  const results = proficiencyIds.map((proficiencyId) => ({ proficiencyId, result: validatePerkGraph(definitions, proficiencyId) }))
  return { valid: results.every(({ result }) => result.valid), results }
}

export function assertValidPerkGraph(definitions: ProficiencyPerkDefinition[], proficiencyId?: CombatProficiencyId) {
  const result = validatePerkGraph(definitions, proficiencyId)
  if (!result.valid) throw new Error(`Invalid proficiency perk graph${proficiencyId ? ` for ${proficiencyId}` : ''}: ${result.errors.join('; ')}`)
  return result
}
