import { Lock, PackageCheck, ShieldCheck } from "lucide-react";
import { itemById } from "../../../../../game/data/items";
import { getUpgradeNodeState, getUpgradeNodesForInstance } from "../../../../../game/items/itemUpgradeLogic";
import type { ItemInstanceId } from "../../../../../game/items/itemTypes";
import { getStackableQuantity } from "../../../../../game/items/itemOwnership";
import type { InventoryState } from "../../../../../game/inventory/inventoryTypes";

const stateLabel: Record<ReturnType<typeof getUpgradeNodeState> extends infer T ? Exclude<T, "unknown"> : never, string> = {
  purchased: "PURCHASED",
  available: "AVAILABLE",
  "prerequisite-locked": "PREREQUISITE LOCKED",
  "materials-locked": "MATERIALS LOCKED",
};

export function UpgradeTreePanel({ inventory, instanceId, combatLocked, onUnlock }: {
  inventory: InventoryState;
  instanceId: ItemInstanceId;
  combatLocked: boolean;
  onUnlock: (instanceId: ItemInstanceId, nodeId: string) => void;
}) {
  const instance = inventory.instances[instanceId];
  const definition = instance ? itemById[instance.definitionId] : undefined;
  const nodes = instance ? getUpgradeNodesForInstance(inventory, instanceId) : [];
  if (!instance || !definition || nodes.length === 0) return null;

  const branches = Array.from(new Set(nodes.map((node) => node.presentation.branch)));
  return <section className="item-upgrade-tree-panel" data-debug-kind="item-upgrade-tree" data-debug-instance-id={instanceId}>
    <header className="item-upgrade-tree-heading">
      <div><span className="tiny-label">UPGRADE TREE</span><strong>{definition.name}</strong><small>Exact instance: {instanceId}</small></div>
      <span>{instance.unlockedUpgradeNodeIds?.length ?? 0} / {nodes.length} unlocked</span>
    </header>
    {combatLocked && <p className="item-upgrade-tree-lock"><Lock size={13} /> Upgrades are locked during combat.</p>}
    <div className="item-upgrade-tree-branches">
      {branches.map((branch) => <section key={branch} className="item-upgrade-tree-branch" data-debug-branch={branch}>
        <div className="item-upgrade-tree-branch-heading"><span>{branch}</span><small>4 nodes</small></div>
        <div className="item-upgrade-tree-node-list">
          {nodes.filter((node) => node.presentation.branch === branch).sort((a, b) => a.presentation.column - b.presentation.column).map((node) => {
            const state = getUpgradeNodeState(inventory, instanceId, node.id);
            if (state === "unknown") return null;
            const actionable = state === "available" && !combatLocked;
            return <article key={node.id} className={`item-upgrade-node is-${state}`} data-debug-kind="item-upgrade-node" data-debug-node-id={node.id} data-debug-node-state={state}>
              <button type="button" className="item-upgrade-node-button" disabled={!actionable} onClick={() => onUnlock(instanceId, node.id)} aria-label={`${node.name} - ${stateLabel[state]}`}>
                {state === "purchased" ? <ShieldCheck size={15} /> : state === "available" ? <PackageCheck size={15} /> : <Lock size={15} />}
                <span><strong>{node.name}</strong><small>{stateLabel[state]}</small></span>
              </button>
              <p>{node.description}</p>
              <div className="item-upgrade-node-costs">
                {node.costs.map((cost) => {
                  const owned = getStackableQuantity(inventory, cost.itemId);
                  const costItem = itemById[cost.itemId];
                  return <span key={cost.itemId} className={owned >= cost.quantity ? "has-cost" : "missing-cost"}>{costItem?.name ?? cost.itemId} <strong>{owned} / {cost.quantity}</strong></span>;
                })}
              </div>
            </article>;
          })}
        </div>
      </section>)}
    </div>
  </section>;
}
