import { magicArtById, magicArtDefinitions } from "../data/magicArts";
import type { MagicArtId, MagicArtsState } from "./magicArtTypes";

export function createInitialMagicArts(): MagicArtsState {
  return { knownArtIds: ["magic-art.earth-shield"] };
}

export function normalizeMagicArts(value: unknown): MagicArtsState {
  const raw = value && typeof value === "object" ? value as { knownArtIds?: unknown } : {};
  const knownArtIds = Array.isArray(raw.knownArtIds)
    ? raw.knownArtIds.filter((id, index, all): id is MagicArtId =>
        typeof id === "string" && id in magicArtById && all.indexOf(id) === index,
      )
    : [];
  return { knownArtIds };
}

export function isMagicArtId(value: string): value is MagicArtId {
  return Boolean(magicArtById[value]);
}

export function isMagicArtKnown(state: MagicArtsState, artId: string): artId is MagicArtId {
  return isMagicArtId(artId) && state.knownArtIds.includes(artId);
}

export function getMagicArt(artId: string) {
  return magicArtById[artId];
}

export function authoredMagicArtIds(): MagicArtId[] {
  return magicArtDefinitions.map((definition) => definition.id);
}
