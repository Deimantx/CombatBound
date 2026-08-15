import type { CollectionState } from "../collection/collectionTypes";
import type { EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { LegacyProgressionState, ProgressionState } from "../progression/progressionTypes";
import type { SpellbookState } from "../spellbook/spellbookTypes";
import type { CombatAutomationState } from "../automation/automationTypes";
import type { CombatAutomationPresetsState } from "../automation/automationPresets";
import type { CombatAbilityLoadoutState } from "../combatAbilities/combatAbilityTypes";

export interface GameSaveV4 {
  version: 4;
  progression: LegacyProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  /** V4 deliberately retained the six-slot loadout shape. */
  spellbook: { knownSpellIds: string[]; equippedSpellSlots: Array<string | null> };
  combatAutomation: CombatAutomationState;
}

export interface GameSaveV5 {
  version: 5;
  progression: LegacyProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: SpellbookState;
  combatAutomation: CombatAutomationState;
}

export interface GameSaveV6 {
  version: 6;
  progression: LegacyProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: SpellbookState;
  combatAutomation: CombatAutomationState;
  combatAbilities: CombatAbilityLoadoutState;
}

export interface GameSaveV7 {
  version: 7;
  progression: LegacyProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: SpellbookState;
  combatAutomation: CombatAutomationState;
  combatAutomationPresets: CombatAutomationPresetsState;
  combatAbilities: CombatAbilityLoadoutState;
}

export interface GameSaveV8 {
  version: 8;
  progression: LegacyProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: SpellbookState;
  combatAutomation: CombatAutomationState;
  combatAutomationPresets: CombatAutomationPresetsState;
  combatAbilities: CombatAbilityLoadoutState;
}

export interface GameSaveV3 {
  version: 3;
  progression: LegacyProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
}

export interface GameSaveV9 {
  version: 9;
  progression: ProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: SpellbookState;
  combatAutomation: CombatAutomationState;
  combatAutomationPresets: CombatAutomationPresetsState;
  combatAbilities: CombatAbilityLoadoutState;
}

/** V10 is the first save schema after the canonical combat migration. */
export interface GameSaveV10 extends Omit<GameSaveV9, "version"> {
  version: 10;
}

/** Compatibility name for callers that only need the save shape. */
export type GameSaveV2 = GameSaveV3;
