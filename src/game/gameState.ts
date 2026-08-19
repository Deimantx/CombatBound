import { createInitialCollection } from "./collection/collectionTypes";
import {
  createInitialEquipment,
  type EquipmentState,
} from "./equipment/equipmentTypes";
import type { CombatState } from "./combat/combatTypes";
import { createCombatState } from "./combat/combatState";
import { enemyDefinitions } from "./data/enemies";
import {
  createInitialInventory,
  type InventoryState,
} from "./inventory/inventoryTypes";
import { createInitialProgression } from "./progression/proficiencyProgression";
import type { ProgressionState } from "./progression/progressionTypes";
import type { SpellbookState } from "./spellbook/spellbookTypes";
import {
  createInitialCombatAutomation,
  type CombatAutomationState,
} from "./automation/automationTypes";
import {
  createInitialCombatAutomationPresets,
  type CombatAutomationPresetsState,
} from "./automation/automationPresets";
import {
  createInitialCombatAbilityLoadout,
} from "./combatAbilities/combatAbilityLogic";
import type { CombatAbilityLoadoutState } from "./combatAbilities/combatAbilityTypes";
import { createInitialMagicArts } from "./magicArts/magicArtLogic";
import type { MagicArtsState } from "./magicArts/magicArtTypes";

export interface GameState {
  combat: CombatState;
  progression: ProgressionState;
  inventory: InventoryState;
  equipment: EquipmentState;
  collection: ReturnType<typeof createInitialCollection>;
  gold: number;
  spellbook: SpellbookState;
  /** Current authored Magic Arts knowledge. The legacy spellbook is compatibility-only. */
  magicArts: MagicArtsState;
  combatAutomation: CombatAutomationState;
  combatAutomationPresets: CombatAutomationPresetsState;
  combatAbilities: CombatAbilityLoadoutState;
}

export function createInitialGameState(): GameState {
  const inventory = createInitialInventory();
  const spellbook: SpellbookState = { knownSpellIds: [] };
  return {
    combat: createCombatState(),
    progression: createInitialProgression(),
    inventory,
    equipment: createInitialEquipment(inventory),
    collection: {
      ...createInitialCollection(enemyDefinitions.map((enemy) => enemy.id)),
      discoveredItems: [
        "item.training-sword",
        "item.training-armor",
        "item.training-hood",
        "item.training-gloves",
        "item.training-boots",
        "item.training-shield",
        "item.healing-potion",
      ],
    },
    gold: 0,
    spellbook,
    magicArts: createInitialMagicArts(),
    combatAutomation: createInitialCombatAutomation(),
    combatAutomationPresets: createInitialCombatAutomationPresets(),
    combatAbilities: createInitialCombatAbilityLoadout(["magic-art.earth-shield"]),
  };
}
