import { isItemInstanceId, type InventoryEntryRef } from "../items/itemTypes";

export interface InventoryManualOrderV1 {
  version: 1;
  keys: string[];
}

export type ManualOrderPlacement = "before" | "after";

export function orderInventoryEntriesByManual<T extends { ref: InventoryEntryRef }>(entries: readonly T[], order: readonly string[]) {
  const position = new Map(order.map((key, index) => [key, index]));
  return [...entries].sort((left, right) => {
    const leftPosition = position.get(serializeInventoryEntryRef(left.ref));
    const rightPosition = position.get(serializeInventoryEntryRef(right.ref));
    return (leftPosition ?? Number.MAX_SAFE_INTEGER) - (rightPosition ?? Number.MAX_SAFE_INTEGER);
  });
}

export const INVENTORY_MANUAL_ORDER_VERSION = 1 as const;

export function serializeInventoryEntryRef(ref: InventoryEntryRef) {
  return ref.kind === "instance" ? `instance:${ref.instanceId}` : `stack:${ref.definitionId}`;
}

export function parseInventoryEntryKey(key: unknown): InventoryEntryRef | undefined {
  if (typeof key !== "string") return undefined;
  if (key.startsWith("instance:")) {
    const instanceId = key.slice("instance:".length);
    return isItemInstanceId(instanceId) ? { kind: "instance", instanceId } : undefined;
  }
  if (key.startsWith("stack:")) {
    const definitionId = key.slice("stack:".length);
    return definitionId ? { kind: "stack", definitionId } : undefined;
  }
  return undefined;
}

export function normalizeInventoryManualOrder(value: unknown, ownedKeys: readonly string[]) {
  const owned = new Set(ownedKeys.filter((key) => Boolean(parseInventoryEntryKey(key))));
  const source = typeof value === "object" && value !== null && "keys" in value && Array.isArray(value.keys)
    ? value.keys
    : [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const key of source) {
    if (typeof key !== "string" || !owned.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  for (const key of ownedKeys) {
    if (!owned.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

export function reorderVisibleInventoryEntries(
  globalOrder: readonly string[],
  visibleKeys: readonly string[],
  draggedKey: string,
  targetKey: string,
  placement: ManualOrderPlacement,
) {
  if (draggedKey === targetKey) return [...globalOrder];
  const visibleSet = new Set(visibleKeys);
  if (!visibleSet.has(draggedKey) || !visibleSet.has(targetKey)) return [...globalOrder];
  const visibleOrder = globalOrder.filter((key) => visibleSet.has(key));
  const draggedIndex = visibleOrder.indexOf(draggedKey);
  if (draggedIndex < 0) return [...globalOrder];
  const moved = visibleOrder.filter((key) => key !== draggedKey);
  const targetIndex = moved.indexOf(targetKey);
  if (targetIndex < 0) return [...globalOrder];
  moved.splice(placement === "before" ? targetIndex : targetIndex + 1, 0, draggedKey);
  let visibleIndex = 0;
  return globalOrder.map((key) => visibleSet.has(key) ? moved[visibleIndex++] : key);
}

export function manualOrderStorageKey(profileId: string) {
  return `combatbound-inventory-order-v1:${profileId}`;
}

export function loadInventoryManualOrder(storageKey: string, ownedKeys: readonly string[], storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage) {
  if (!storage) return [...ownedKeys];
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return [...ownedKeys];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || (parsed as { version?: unknown }).version !== INVENTORY_MANUAL_ORDER_VERSION) return [...ownedKeys];
    return normalizeInventoryManualOrder(parsed, ownedKeys);
  } catch {
    return [...ownedKeys];
  }
}

export function saveInventoryManualOrder(storageKey: string, keys: readonly string[], storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage) {
  if (!storage) return;
  try {
    const value: InventoryManualOrderV1 = { version: INVENTORY_MANUAL_ORDER_VERSION, keys: [...keys] };
    storage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or quota-limited; manual ordering remains usable in memory.
  }
}
