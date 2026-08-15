import type { GameState } from "../../../game/gameState";
import type { DebugStoreApi } from "../../../state/gameStore";

export type DebugTab = "overview" | "player" | "progression" | "items" | "collection" | "combat" | "spellbook" | "state";
export type DebugRun = (label: string, action: () => void) => void;
export interface DebugTabProps { game: GameState; debug: DebugStoreApi; run: DebugRun }
