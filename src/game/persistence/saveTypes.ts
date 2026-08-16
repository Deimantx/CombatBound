import type { CollectionState } from "../collection/collectionTypes";
import type { EquipmentSlotId, EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { LegacyProgressionState, ProgressionState } from "../progression/progressionTypes";
import type { SpellbookState } from "../spellbook/spellbookTypes";
import type { CombatAutomationState } from "../automation/automationTypes";
import type { CombatAutomationPresetsState } from "../automation/automationPresets";
import type { CombatAbilityLoadoutState } from "../combatAbilities/combatAbilityTypes";

export interface LegacyInventoryStateV10 { quantities: Record<string, number> }
export interface LegacyEquipmentStateV10 { slots: Partial<Record<EquipmentSlotId, string>> }
export interface LegacyItemInstanceV1 { id: string; definitionId: string; version: 1 }
export interface LegacyInventoryStateV11 { stackables: Record<string, number>; instances: Record<string, LegacyItemInstanceV1>; nextInstanceSequence: number }
export interface LegacyEquipmentStateV11 { slots: Partial<Record<EquipmentSlotId, string>> }

export interface GameSaveV4 {
  version: 4;
  progression: LegacyProgressionState;
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
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
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: SpellbookState;
  combatAutomation: CombatAutomationState;
}

export interface GameSaveV6 {
  version: 6;
  progression: LegacyProgressionState;
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
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
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
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
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
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
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
}

export interface GameSaveV9 {
  version: 9;
  progression: ProgressionState;
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
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

export interface GameSaveV11 extends Omit<GameSaveV9, "version" | "inventory" | "equipment"> {
  version: 11;
  inventory: LegacyInventoryStateV11;
  equipment: LegacyEquipmentStateV11;
}

export interface GameSaveV12 extends Omit<GameSaveV11, "version" | "inventory" | "equipment"> {
  version: 12;
  inventory: InventoryState;
  equipment: EquipmentState;
}

/** Compatibility name for callers that only need the save shape. */
export type GameSaveV2 = GameSaveV3;
