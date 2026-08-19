import type { CollectionState } from "../collection/collectionTypes";
import type { EquipmentSlotId, EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { CombatProficiencyId, ProgressionState, ProficiencyProgress } from "../progression/progressionTypes";
import type { SpellbookState } from "../spellbook/spellbookTypes";
import type { CombatAutomationState } from "../automation/automationTypes";
import type { CombatAutomationPresetsState } from "../automation/automationPresets";
import type { CombatAbilityLoadoutState } from "../combatAbilities/combatAbilityTypes";

export interface LegacyInventoryStateV10 { quantities: Record<string, number> }
export interface LegacyEquipmentStateV10 { slots: Partial<Record<EquipmentSlotId, string>> }
export interface LegacyItemInstanceV1 { id: string; definitionId: string; version: 1 }
export interface LegacyInventoryStateV11 { stackables: Record<string, number>; instances: Record<string, LegacyItemInstanceV1>; nextInstanceSequence: number }
export interface LegacyEquipmentStateV11 { slots: Partial<Record<EquipmentSlotId, string>> }
export interface LegacyProgressionState {
  proficiencies: Partial<Record<CombatProficiencyId, ProficiencyProgress>>;
  masteryXp: number;
  bonusPerkPoints?: number;
  purchasedPerks: Record<string, number>;
}

/** Frozen pre-V14 spellbook shape. */
export interface LegacySpellbookStateV13 {
  knownSpellIds: string[];
  equippedSpellSlots: Array<string | null>;
}

/** Frozen pre-V14 combat ability shape, including retired techniques. */
export interface LegacyCombatAbilityLoadoutStateV13 {
  activeSlots: Array<string | null>;
  techniqueSlots: Array<string | null>;
}

export interface GameSaveV4 {
  version: 4; progression: LegacyProgressionState; inventory: LegacyInventoryStateV10; equipment: LegacyEquipmentStateV10; collection: CollectionState; gold: number; settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: LegacySpellbookStateV13; combatAutomation: CombatAutomationState;
}
export interface GameSaveV5 {
  version: 5; progression: LegacyProgressionState; inventory: LegacyInventoryStateV10; equipment: LegacyEquipmentStateV10; collection: CollectionState; gold: number; settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: LegacySpellbookStateV13; combatAutomation: CombatAutomationState;
}
export interface GameSaveV6 {
  version: 6; progression: LegacyProgressionState; inventory: LegacyInventoryStateV10; equipment: LegacyEquipmentStateV10; collection: CollectionState; gold: number; settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: LegacySpellbookStateV13; combatAutomation: CombatAutomationState; combatAbilities: LegacyCombatAbilityLoadoutStateV13;
}
export interface GameSaveV7 {
  version: 7; progression: LegacyProgressionState; inventory: LegacyInventoryStateV10; equipment: LegacyEquipmentStateV10; collection: CollectionState; gold: number; settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: LegacySpellbookStateV13; combatAutomation: CombatAutomationState; combatAutomationPresets: CombatAutomationPresetsState; combatAbilities: LegacyCombatAbilityLoadoutStateV13;
}
export interface GameSaveV8 {
  version: 8; progression: LegacyProgressionState; inventory: LegacyInventoryStateV10; equipment: LegacyEquipmentStateV10; collection: CollectionState; gold: number; settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: LegacySpellbookStateV13; combatAutomation: CombatAutomationState; combatAutomationPresets: CombatAutomationPresetsState; combatAbilities: LegacyCombatAbilityLoadoutStateV13;
}
export interface GameSaveV3 {
  version: 3; progression: LegacyProgressionState; inventory: LegacyInventoryStateV10; equipment: LegacyEquipmentStateV10; collection: CollectionState; gold: number; settings: { reducedMotion: boolean; showInspectorButton: boolean };
}
export interface GameSaveV9 {
  version: 9; progression: LegacyProgressionState; inventory: LegacyInventoryStateV10; equipment: LegacyEquipmentStateV10; collection: CollectionState; gold: number; settings: { reducedMotion: boolean; showInspectorButton: boolean };
  spellbook: LegacySpellbookStateV13; combatAutomation: CombatAutomationState; combatAutomationPresets: CombatAutomationPresetsState; combatAbilities: LegacyCombatAbilityLoadoutStateV13;
}
export interface GameSaveV10 extends Omit<GameSaveV9, "version"> { version: 10 }
export interface GameSaveV11 extends Omit<GameSaveV9, "version" | "inventory" | "equipment"> { version: 11; inventory: LegacyInventoryStateV11; equipment: LegacyEquipmentStateV11 }
export interface GameSaveV12 extends Omit<GameSaveV11, "version" | "inventory" | "equipment"> { version: 12; inventory: InventoryState; equipment: EquipmentState }
export interface GameSaveV13 extends Omit<GameSaveV12, "version" | "progression"> { version: 13; progression: ProgressionState }
export interface GameSaveV14 extends Omit<GameSaveV13, "version" | "spellbook" | "combatAbilities"> {
  version: 14;
  spellbook: SpellbookState;
  combatAbilities: CombatAbilityLoadoutState;
}
export type GameSaveV2 = GameSaveV3;
