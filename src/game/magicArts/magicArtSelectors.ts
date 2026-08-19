import type { GameState } from "../gameState";
import { getMagicArt } from "./magicArtLogic";

export function getKnownMagicArts(game: Pick<GameState, "magicArts">) {
  return (game.magicArts?.knownArtIds ?? []).map((id) => getMagicArt(id)).filter((art): art is NonNullable<typeof art> => Boolean(art));
}

export function isMagicArtEquipped(game: Pick<GameState, "combatAbilities">, artId: string) {
  return game.combatAbilities.slots.includes(artId);
}
