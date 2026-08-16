import { itemById, itemDefinitions } from "../data/items";
import type { ItemDefinitionId, ItemInstance, ItemInstanceId } from "./itemTypes";
import { isItemInstanceId, itemInstanceSequence } from "./itemTypes";
import type { InventoryState } from "../inventory/inventoryTypes";

export interface ItemGrantResult {
  inventory: InventoryState;
  definitionId: ItemDefinitionId;
  quantityGranted: number;
  stackableQuantityAdded: number;
  createdInstanceIds: ItemInstanceId[];
}

function safeQuantity(quantity: number) {
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
}

function inventoryModeFor(definition: { inventoryMode?: "stackable" | "instance"; equipmentSlotKind?: unknown }) {
  return definition.inventoryMode ?? (definition.equipmentSlotKind ? "instance" : "stackable");
}

export function allocateItemInstanceId(inventory: InventoryState) {
  const sequence = Math.max(1, Math.floor(inventory.nextInstanceSequence || 1));
  return {
    id: `item-instance-${String(sequence).padStart(8, "0")}` as ItemInstanceId,
    nextInstanceSequence: sequence + 1,
  };
}

export function createItemInstance(
  inventory: InventoryState,
  definitionId: ItemDefinitionId,
): { inventory: InventoryState; instance: ItemInstance | null } {
  const definition = itemById[definitionId];
  if (!definition || inventoryModeFor(definition) !== "instance")
    return { inventory, instance: null };
  const allocated = allocateItemInstanceId(inventory);
  const instance: ItemInstance = { id: allocated.id, definitionId, version: 1 };
  return {
    inventory: {
      ...inventory,
      instances: { ...inventory.instances, [instance.id]: instance },
      nextInstanceSequence: allocated.nextInstanceSequence,
    },
    instance,
  };
}

export function addStackableItem(
  inventory: InventoryState,
  definitionId: ItemDefinitionId,
  quantity: number,
): InventoryState {
  const definition = itemById[definitionId];
  const amount = safeQuantity(quantity);
  if (!definition || inventoryModeFor(definition) !== "stackable" || amount <= 0)
    return inventory;
  return {
    ...inventory,
    stackables: {
      ...inventory.stackables,
      [definitionId]: (inventory.stackables[definitionId] ?? 0) + amount,
    },
  };
}

export function removeStackableItem(
  inventory: InventoryState,
  definitionId: ItemDefinitionId,
  quantity: number,
): InventoryState {
  const definition = itemById[definitionId];
  const amount = safeQuantity(quantity);
  if (!definition || inventoryModeFor(definition) !== "stackable" || amount <= 0)
    return inventory;
  const next = Math.max(0, (inventory.stackables[definitionId] ?? 0) - amount);
  return {
    ...inventory,
    stackables: { ...inventory.stackables, [definitionId]: next },
  };
}

export function getStackableQuantity(inventory: InventoryState, definitionId: ItemDefinitionId) {
  return Math.max(0, Math.floor(inventory.stackables[definitionId] ?? 0));
}

export function grantItem(
  inventory: InventoryState,
  definitionId: ItemDefinitionId,
  quantity: number,
): ItemGrantResult {
  const amount = safeQuantity(quantity);
  const definition = itemById[definitionId];
  if (!definition || amount <= 0)
    return { inventory, definitionId, quantityGranted: 0, stackableQuantityAdded: 0, createdInstanceIds: [] };
  if (inventoryModeFor(definition) === "stackable") {
    return {
      inventory: addStackableItem(inventory, definitionId, amount),
      definitionId,
      quantityGranted: amount,
      stackableQuantityAdded: amount,
      createdInstanceIds: [],
    };
  }
  let next = inventory;
  const createdInstanceIds: ItemInstanceId[] = [];
  for (let index = 0; index < amount; index += 1) {
    const result = createItemInstance(next, definitionId);
    if (!result.instance) break;
    next = result.inventory;
    createdInstanceIds.push(result.instance.id);
  }
  return {
    inventory: next,
    definitionId,
    quantityGranted: createdInstanceIds.length,
    stackableQuantityAdded: 0,
    createdInstanceIds,
  };
}

export function getItemInstance(inventory: InventoryState, instanceId: ItemInstanceId) {
  return inventory.instances[instanceId];
}

export function getItemInstances(inventory: InventoryState) {
  return Object.values(inventory.instances).sort((a, b) => itemInstanceSequence(a.id) - itemInstanceSequence(b.id));
}

export function getInstancesByDefinitionId(inventory: InventoryState, definitionId: ItemDefinitionId) {
  return getItemInstances(inventory).filter((instance) => instance.definitionId === definitionId);
}

export function getOwnedItemCount(inventory: InventoryState, definitionId: ItemDefinitionId) {
  const definition = itemById[definitionId];
  if (!definition) return 0;
  return definition.inventoryMode === "stackable"
    ? getStackableQuantity(inventory, definitionId)
    : getInstancesByDefinitionId(inventory, definitionId).length;
}

export function removeItemInstance(inventory: InventoryState, instanceId: ItemInstanceId, equippedInstanceIds: ReadonlySet<ItemInstanceId> = new Set()) {
  if (!inventory.instances[instanceId] || equippedInstanceIds.has(instanceId)) return inventory;
  const instances = { ...inventory.instances };
  delete instances[instanceId];
  return { ...inventory, instances };
}

export function normalizeInventoryState(value: unknown): InventoryState {
  const raw = value && typeof value === "object" ? value as Partial<InventoryState> : {};
  const stackables: Record<string, number> = {};
  for (const definition of itemDefinitions) {
    if (inventoryModeFor(definition) !== "stackable") continue;
    const rawQuantity = raw.stackables?.[definition.id];
    if (typeof rawQuantity !== "number" || !Number.isFinite(rawQuantity)) continue;
    const quantity = Math.max(0, Math.floor(rawQuantity));
    if (quantity > 0) stackables[definition.id] = quantity;
  }
  const instances: Record<string, ItemInstance> = {};
  for (const [key, rawInstance] of Object.entries(raw.instances ?? {})) {
    if (!rawInstance || typeof rawInstance !== "object") continue;
    const instance = rawInstance as Partial<ItemInstance>;
    const id = typeof instance.id === "string" ? instance.id : key;
    const definition = typeof instance.definitionId === "string" ? itemById[instance.definitionId] : undefined;
    if (!isItemInstanceId(id) || !definition || inventoryModeFor(definition) !== "instance") continue;
    instances[id] = { id, definitionId: definition.id, version: 1 };
  }
  const highest = Object.keys(instances).reduce((max, id) => Math.max(max, itemInstanceSequence(id as ItemInstanceId)), 0);
  const savedNext = typeof raw.nextInstanceSequence === "number" && Number.isFinite(raw.nextInstanceSequence)
    ? Math.floor(raw.nextInstanceSequence)
    : 1;
  return { stackables, instances, nextInstanceSequence: Math.max(1, savedNext, highest + 1) };
}
