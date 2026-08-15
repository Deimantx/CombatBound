import type { GameState } from "../../../game/gameState";

export interface DebugScenarioSnapshotV1 {
  version: 1;
  game: Pick<GameState, "progression" | "inventory" | "equipment" | "gold" | "spellbook" | "combatAutomation" | "combatAbilities"> & { combat: GameState["combat"] };
  world: { continentId: string; regionId: string; areaId: string; combatLocationId: string };
}

export interface DebugScenarioSlot {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: DebugScenarioSnapshotV1;
}
