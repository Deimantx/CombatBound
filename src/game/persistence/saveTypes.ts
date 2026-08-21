import type { CollectionState } from "../collection/collectionTypes";
import type { EquipmentSlotId, EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { CombatProficiencyId, ProgressionState, ProficiencyProgress } from "../progression/progressionTypes";
import type { CombatAutomationState } from "../automation/automationTypes";
import type { CombatAutomationPresetsState } from "../automation/automationPresets";
import type { CombatAbilityLoadoutState } from "../combatAbilities/combatAbilityTypes";
import type { MagicArtsState } from "../magicArts/magicArtTypes";

/** Frozen V14 proficiency IDs. Never derive historical parsing from current content. */
export type LegacyCombatProficiencyIdV14 =
  | 'one-handed-sword' | 'one-handed-axe' | 'one-handed-mace' | 'dagger'
  | 'two-handed-sword' | 'two-handed-axe' | 'two-handed-hammer' | 'spear'
  | 'shortbow' | 'longbow' | 'crossbow'
  | 'fire-magic' | 'water-magic' | 'air-magic' | 'earth-magic' | 'darkness-magic'
  | 'light-armor' | 'medium-armor' | 'heavy-armor' | 'shield';

export interface LegacyProficiencyProgressV14 {
  proficiencyId: LegacyCombatProficiencyIdV14;
  totalXp: number;
}

export interface LegacyProgressionStateV14 {
  proficiencies: Partial<Record<LegacyCombatProficiencyIdV14, LegacyProficiencyProgressV14>>;
  hunterRankPoints: number;
  bonusPerkPoints: number;
  purchasedPerks: Record<string, number>;
}

export interface LegacyInventoryStateV10 { quantities: Record<string, number> }
export interface LegacyEquipmentStateV10 { slots: Partial<Record<EquipmentSlotId, string>> }
export interface LegacyItemInstanceV1 { id: string; definitionId: string; version: 1 }
export interface LegacyInventoryStateV11 { stackables: Record<string, number>; instances: Record<string, LegacyItemInstanceV1>; nextInstanceSequence: number }
export interface LegacyEquipmentStateV11 { slots: Partial<Record<EquipmentSlotId, string>> }
export interface LegacyItemAffixInstanceV15 {
  affixId: string;
  tierId: string;
  rolls: Record<string, number>;
}
export interface LegacyItemInstanceV2 {
  id: string;
  definitionId: string;
  version: 2;
  quality?: number;
  upgradeLevel?: number;
  affixes: LegacyItemAffixInstanceV15[];
}
export interface LegacyInventoryStateV12 {
  stackables: Record<string, number>;
  instances: Record<string, LegacyItemInstanceV2>;
  nextInstanceSequence: number;
}
export interface LegacyEquipmentStateV12 { slots: Partial<Record<EquipmentSlotId, string>> }
export interface LegacyInventoryStateV15 extends LegacyInventoryStateV12 {}
export interface LegacyEquipmentStateV15 extends LegacyEquipmentStateV12 {}
export interface ItemInstanceV16 {
  id: string;
  definitionId: string;
  version: 3;
  unlockedUpgradeNodeIds: string[];
}
export interface InventoryStateV16 {
  stackables: Record<string, number>;
  instances: Record<string, ItemInstanceV16>;
  nextInstanceSequence: number;
}
export interface EquipmentStateV16 { slots: Partial<Record<EquipmentSlotId, string>> }
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

/** Frozen final pre-Magic-Arts save fields. These must not import current runtime unions. */
export interface LegacySpellbookStateV14 {
  knownSpellIds: string[];
}

export interface LegacyCombatAbilityLoadoutStateV14 {
  slots: Array<string | null>;
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
export interface GameSaveV12 extends Omit<GameSaveV11, "version" | "inventory" | "equipment"> { version: 12; inventory: LegacyInventoryStateV12; equipment: LegacyEquipmentStateV12 }
export interface GameSaveV13 extends Omit<GameSaveV12, "version" | "progression"> { version: 13; progression: LegacyProgressionStateV14 }
export interface GameSaveV14 extends Omit<GameSaveV13, "version" | "progression" | "spellbook" | "combatAbilities"> {
  version: 14;
  progression: LegacyProgressionStateV14;
  spellbook: LegacySpellbookStateV14;
  combatAbilities: LegacyCombatAbilityLoadoutStateV14;
}

export interface GameSaveV15 {
  version: 15;
  progression: ProgressionState;
  inventory: LegacyInventoryStateV15;
  equipment: LegacyEquipmentStateV15;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  magicArts: MagicArtsState;
  combatAbilities: CombatAbilityLoadoutState;
  combatAutomation: CombatAutomationState;
  combatAutomationPresets: CombatAutomationPresetsState;
}
export interface GameSaveV16 {
  version: 16;
  progression: ProgressionState;
  inventory: InventoryStateV16;
  equipment: EquipmentStateV16;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
  magicArts: MagicArtsState;
  combatAbilities: CombatAbilityLoadoutState;
  combatAutomation: CombatAutomationState;
  combatAutomationPresets: CombatAutomationPresetsState;
}
export interface GameSaveV17 extends Omit<GameSaveV16, "version" | "inventory" | "equipment"> {
  version: 17;
  inventory: InventoryState;
  equipment: EquipmentState;
}
export type GameSaveV2 = GameSaveV3;
