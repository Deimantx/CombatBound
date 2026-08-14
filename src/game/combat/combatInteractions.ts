import type {
  ActiveEffectInstance,
  EffectDefinition,
} from "./combatEffectTypes";
import type { DamagePacket } from "./combatDamage";
import type { DamageType } from "./combatTypes";

export interface CombatInteractionDefinition {
  id: string;
  name: string;
  description: string;
  trigger: {
    sourceKind: "spell" | "defensive";
    damageType?: DamageType;
    sourceActionId?: string;
  };
  requirements: {
    targetHasEffectIds?: string[];
    targetHasEffectTags?: string[];
    sourceHasEffectTags?: string[];
  };
  result: {
    damageMultiplier?: number;
    consumeEffectIds?: string[];
    consumeEffectTags?: string[];
    applyEffectIds?: string[];
  };
}

export const combatInteractionDefinitions: CombatInteractionDefinition[] = [
  {
    id: "interaction.thermal-shock",
    name: "Thermal Shock",
    description:
      "Fire damage against Chilled targets deals +25% damage and consumes Chilled.",
    trigger: { sourceKind: "spell", damageType: "fire" },
    requirements: { targetHasEffectIds: ["effect.chilled"] },
    result: { damageMultiplier: 1.25, consumeEffectIds: ["effect.chilled"] },
  },
  {
    id: "interaction.steam-burst",
    name: "Steam Burst",
    description:
      "Water damage against Burning targets deals +15% damage, consumes Burn, and applies Exposed.",
    trigger: { sourceKind: "spell", damageType: "water" },
    requirements: { targetHasEffectIds: ["effect.burn"] },
    result: {
      damageMultiplier: 1.15,
      consumeEffectIds: ["effect.burn"],
      applyEffectIds: ["effect.exposed"],
    },
  },
  {
    id: "interaction.conductive-disruption",
    name: "Conductive Disruption",
    description: "Disrupting Pulse applies Shocked to a Chilled target.",
    trigger: { sourceKind: "spell", sourceActionId: "spell.disrupting-pulse" },
    requirements: { targetHasEffectIds: ["effect.chilled"] },
    result: { applyEffectIds: ["effect.shocked"] },
  },
  {
    id: "interaction.grounding-blow",
    name: "Grounding Blow",
    description:
      "Earth damage against Shocked targets deals +20% damage and consumes Shocked.",
    trigger: { sourceKind: "spell", damageType: "earth" },
    requirements: { targetHasEffectIds: ["effect.shocked"] },
    result: { damageMultiplier: 1.2, consumeEffectIds: ["effect.shocked"] },
  },
  {
    id: "interaction.umbral-exploit-exposed",
    name: "Umbral Exploit",
    description: "Darkness damage against Exposed targets deals +15% damage.",
    trigger: { sourceKind: "spell", damageType: "darkness" },
    requirements: { targetHasEffectIds: ["effect.exposed"] },
    result: { damageMultiplier: 1.15 },
  },
  {
    id: "interaction.umbral-exploit-armor",
    name: "Umbral Exploit",
    description:
      "Darkness damage against Armor Broken targets deals +15% damage.",
    trigger: { sourceKind: "spell", sourceActionId: "spell.shadow-bolt" },
    requirements: { targetHasEffectIds: ["effect.armor-broken"] },
    result: { damageMultiplier: 1.15 },
  },
  {
    id: "interaction.purifying-ward",
    name: "Purifying Ward",
    description:
      "Protective Sign cleanses one harmful Darkness or Curse effect.",
    trigger: { sourceKind: "spell", sourceActionId: "spell.protective-sign" },
    requirements: { targetHasEffectTags: ["darkness", "curse"] },
    result: { consumeEffectTags: ["darkness", "curse"] },
  },
];

export function resolveCombatInteractions(
  packet: Pick<
    DamagePacket,
    "damageType" | "sourceActionId" | "progressionSource"
  >,
  targetEffects: ActiveEffectInstance[],
  effects: Record<string, EffectDefinition>,
  definitions = combatInteractionDefinitions,
) {
  const sourceKind =
    packet.progressionSource?.type === "spell" ? "spell" : undefined;
  return definitions.filter((definition) => {
    if (definition.trigger.sourceKind !== sourceKind) return false;
    if (
      definition.trigger.damageType &&
      definition.trigger.damageType !== packet.damageType
    )
      return false;
    if (
      definition.trigger.sourceActionId &&
      definition.trigger.sourceActionId !== packet.sourceActionId
    )
      return false;
    const ids = targetEffects.map((effect) => effect.effectId);
    const tags = targetEffects.flatMap(
      (effect) => effects[effect.effectId]?.tags ?? [],
    );
    if (
      definition.requirements.targetHasEffectIds?.some(
        (id) => !ids.includes(id),
      )
    )
      return false;
    if (
      definition.requirements.targetHasEffectTags?.length &&
      !definition.requirements.targetHasEffectTags.some((tag) =>
        tags.includes(tag),
      )
    )
      return false;
    return true;
  });
}
