import { useState } from "react";
import { Lock, PackageCheck, ShieldCheck } from "lucide-react";
import { itemById } from "../../../game/data/items";
import { itemUpgradeBranchById, itemUpgradeNodeById, itemUpgradeTreeById } from "../../../game/data/gear/itemUpgradeTrees";
import { getItemUpgradeSpecialization, getUpgradeNodeState, getUpgradeNodesForInstance } from "../../../game/items/itemUpgradeLogic";
import type { ItemInstanceId } from "../../../game/items/itemTypes";
import { getStackableQuantity } from "../../../game/items/itemOwnership";
import type { InventoryState } from "../../../game/inventory/inventoryTypes";
import { ConfirmDialog } from "../ConfirmDialog";

const stateLabel = {
  purchased: "PURCHASED",
  available: "AVAILABLE",
  "prerequisite-locked": "PREREQUISITE LOCKED",
  "materials-locked": "MATERIALS LOCKED",
  "branch-locked": "BRANCH LOCKED",
} as const;

export function ItemUpgradeTreePanel({ inventory, instanceId, combatLocked, onUnlock }: {
  inventory: InventoryState;
  instanceId: ItemInstanceId;
  combatLocked: boolean;
  onUnlock: (instanceId: ItemInstanceId, nodeId: string) => void;
}) {
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const instance = inventory.instances[instanceId];
  const definition = instance ? itemById[instance.definitionId] : undefined;
  const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined;
  const nodes = instance ? getUpgradeNodesForInstance(inventory, instanceId) : [];
  if (!instance || !definition || !tree || nodes.length === 0) return null;
  const specialization = getItemUpgradeSpecialization(instance, tree);
  const chosenBranch = specialization.state === "specialized" ? itemUpgradeBranchById[specialization.branchId] : undefined;
  const progressTotal = chosenBranch ? nodes.filter((node) => node.branchId === chosenBranch.id).length : Math.max(...tree.branchIds.map((branchId) => nodes.filter((node) => node.branchId === branchId).length));
  const pendingNode = pendingNodeId ? itemUpgradeNodeById[pendingNodeId] : undefined;
  const confirmPurchase = () => {
    if (pendingNode) onUnlock(instanceId, pendingNode.id);
    setPendingNodeId(null);
  };
  return <section className="item-upgrade-tree-panel" data-debug-kind="item-upgrade-tree" data-debug-instance-id={instanceId}>
    <header className="item-upgrade-tree-heading">
      <div><span className="tiny-label">DEV UPGRADE TREE</span><strong>{definition.name}</strong><small>{specialization.state === "specialized" ? `${chosenBranch?.name ?? "Specialized"} - ${instance.unlockedUpgradeNodeIds.length} / ${progressTotal}` : "Unspecialized - choose one permanent specialization"}</small></div>
      <span>{instance.unlockedUpgradeNodeIds.length} / {progressTotal} upgrades</span>
    </header>
    {specialization.state === "unspecialized" && <div className="item-upgrade-tree-warning"><strong>CHOOSE A SPECIALIZATION</strong><span>Your first upgrade permanently specializes this exact item. Other branches will become unavailable.</span></div>}
    {combatLocked && <p className="item-upgrade-tree-lock"><Lock size={13} /> Upgrades are locked during combat.</p>}
    <div className="item-upgrade-tree-branches">
      {tree.branchIds.map((branchId) => {
        const branch = itemUpgradeBranchById[branchId];
        const branchLocked = specialization.state === "specialized" && specialization.branchId !== branchId;
        const branchNodes = nodes.filter((node) => node.branchId === branchId).sort((a, b) => a.presentation.column - b.presentation.column);
        return <section key={branchId} className={`item-upgrade-tree-branch ${branchLocked ? "is-branch-locked" : ""}`} data-debug-branch={branchId}>
          <div className="item-upgrade-tree-branch-heading"><span>{branch?.name ?? branchId}</span><small>{branchLocked ? <><Lock size={10} aria-hidden="true" /> BRANCH LOCKED</> : `${branchNodes.length} nodes`}</small></div>
          {branch?.description && <p className="item-upgrade-tree-branch-description">{branch.description}</p>}
          <div className="item-upgrade-tree-node-list">
            {branchNodes.map((node) => {
              const state = getUpgradeNodeState(inventory, instanceId, node.id);
              if (state === "unknown") return null;
              const actionable = state === "available" && !combatLocked;
              return <article key={node.id} className={`item-upgrade-node is-${state}`} data-debug-kind="item-upgrade-node" data-debug-node-id={node.id} data-debug-node-state={state}>
                <button type="button" className="item-upgrade-node-button" disabled={!actionable} onClick={() => specialization.state === "unspecialized" ? setPendingNodeId(node.id) : onUnlock(instanceId, node.id)} aria-label={`${node.name} - ${stateLabel[state]}`}>
                  {state === "purchased" ? <ShieldCheck size={15} /> : state === "available" ? <PackageCheck size={15} /> : <Lock size={15} />}
                  <span><strong>{node.name}</strong><small>{stateLabel[state]}</small></span>
                </button>
                <p>{node.description}</p>
                <div className="item-upgrade-node-costs">{node.costs.map((cost) => { const owned = getStackableQuantity(inventory, cost.itemId); const costItem = itemById[cost.itemId]; return <span key={cost.itemId} className={owned >= cost.quantity ? "has-cost" : "missing-cost"}>{costItem?.name ?? cost.itemId} <strong>{owned} / {cost.quantity}</strong></span>; })}</div>
              </article>;
            })}
          </div>
        </section>;
      })}
    </div>
    <ConfirmDialog open={Boolean(pendingNode)} title={`Specialize ${definition.name} as ${pendingNode ? itemUpgradeBranchById[pendingNode.branchId]?.name ?? "this branch" : "this branch"}?`} message="This choice is permanent for this item. The other specialization branches will be locked." confirmLabel="Choose Specialization" onCancel={() => setPendingNodeId(null)} onConfirm={confirmPurchase} />
  </section>;
}
