import { itemById } from "../data/items"
import { itemUpgradeNodeById, itemUpgradeTreeById } from "../data/gear/itemUpgradeTrees"
import { getItemInstance } from "../items/itemOwnership"
import { purchaseItemUpgradeNode } from "../items/itemUpgradeLogic"
import { getProfessionLevel } from "./professionProgression"
import type { ProfessionSkillId } from "./professionTypes"
import type { GameState } from "../gameState"
import type { ItemUpgradePurchaseResult } from "../items/itemUpgradeTypes"

export type ProfessionItemUpgradeOutcome = ItemUpgradePurchaseResult["outcome"] | "wrong-profession" | "profession-level-locked"

export interface ProfessionItemUpgradeResult {
  game: GameState
  outcome: ProfessionItemUpgradeOutcome
  nodeId: string
  requiredProfessionLevel?: number
}

export function purchaseProfessionItemUpgrade({
  game,
  professionId,
  instanceId,
  nodeId,
  combatLocked = false,
}: {
  game: GameState
  professionId: ProfessionSkillId
  instanceId: string
  nodeId: string
  combatLocked?: boolean
}): ProfessionItemUpgradeResult {
  const unchanged = (outcome: ProfessionItemUpgradeOutcome, requiredProfessionLevel?: number): ProfessionItemUpgradeResult => ({ game, outcome, nodeId, requiredProfessionLevel })
  const instance = getItemInstance(game.inventory, instanceId)
  if (!instance) return unchanged("unknown-instance")
  const definition = itemById[instance.definitionId]
  if (!definition?.upgradeTreeId) return unchanged("unknown-tree")
  if (definition.upgradeProfessionId !== professionId) return unchanged("wrong-profession")
  const tree = itemUpgradeTreeById[definition.upgradeTreeId]
  const node = itemUpgradeNodeById[nodeId]
  if (!tree || !node || !tree.nodeIds.includes(nodeId)) return unchanged("unknown-node")
  if (getProfessionLevel(game.professions, professionId) < node.requiredProfessionLevel) return unchanged("profession-level-locked", node.requiredProfessionLevel)
  const result = purchaseItemUpgradeNode({ inventory: game.inventory, instanceId, nodeId, combatLocked })
  return { game: result.outcome === "purchased" ? { ...game, inventory: result.inventory } : game, outcome: result.outcome, nodeId, requiredProfessionLevel: node.requiredProfessionLevel }
}
