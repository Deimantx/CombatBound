import { deepFreeze } from "./freeze";
import type { MagicArtDefinition } from "../magicArts/magicArtTypes";

export const magicArtDefinitions = deepFreeze<MagicArtDefinition[]>([
  {
    id: "magic-art.earth-shield",
    name: "Earth Shield",
    description: "Wrap yourself in an earthen barrier that absorbs incoming damage.",
    icon: "shield",
    manaCost: 35,
    cooldownSeconds: 10,
    durationSeconds: 12,
    targetMode: "self",
    barrier: {
      effectId: "effect.earth-shield",
      absorbAmount: 80,
    },
  },
]);

export const magicArtById = Object.fromEntries(
  magicArtDefinitions.map((definition) => [definition.id, definition]),
) as Record<string, MagicArtDefinition>;
