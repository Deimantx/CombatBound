import type { CollectionState } from "../collection/collectionTypes";
import type { EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { ProgressionState } from "../progression/progressionTypes";
import type { SpellbookState } from "../spellbook/spellbookTypes";
import type { CombatAutomationState } from "../automation/automationTypes";

export interface GameSaveV4 {
  version: 4;
  progression: ProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: SpellbookState;
  combatAutomation: CombatAutomationState;
}

export interface GameSaveV3 {
  version: 3;
  progression: ProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
}

/** Compatibility name for callers that only need the save shape. */
export type GameSaveV2 = GameSaveV3;
