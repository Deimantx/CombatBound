export type LootContainerId = `loot-container.${string}`;

export interface LootQuantityRange {
  minQuantity: number;
  maxQuantity: number;
}

export interface LootEntry extends LootQuantityRange {
  itemId: string;
  chance: number;
}

export interface ArenaSharedLootEntry extends LootEntry {
  /** [TUNING] Per-target quantity ranges for authored arena-wide drops. */
  targetQuantityOverrides?: Readonly<Record<string, LootQuantityRange>>;
}

export interface LootContainerEntry extends LootQuantityRange {
  itemId: string;
  weight: number;
}

export interface LootContainerDefinition {
  id: LootContainerId;
  name: string;
  description: string;
  rolls: number;
  entries: readonly LootContainerEntry[];
}
