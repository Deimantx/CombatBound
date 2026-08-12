import type { CollectionState } from '../collection/collectionTypes'
import type { EquipmentState } from '../equipment/equipmentTypes'
import type { InventoryState } from '../inventory/inventoryTypes'
import type { ProgressionState } from '../progression/progressionTypes'

export interface GameSaveV1 { version: 1; progression: ProgressionState; inventory: InventoryState; equipment: EquipmentState; collection: CollectionState; gold: number; settings: { reducedMotion: boolean; showInspectorButton: boolean } }
