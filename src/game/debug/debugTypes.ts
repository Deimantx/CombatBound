import type { GameState } from "../gameState";

export type DebugResource = "health" | "stamina" | "mana";
export type DebugEffectTarget = "player" | "selected-enemy";
export type DebugMutation = (game: GameState) => GameState;
