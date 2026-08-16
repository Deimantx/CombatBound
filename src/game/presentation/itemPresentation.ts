import { itemAffixById } from "../data/itemAffixes";
import { equipmentSlotKindLabel } from "../equipment/equipmentTypes";
import type { ResolvedItemInstance, ItemInstance } from "../items/itemTypes";
import type { ItemAffixModifierDefinition } from "../items/itemModifierTypes";
import { formatItemStats, labelForStatKey } from "./statFormatting";

export interface ItemModifierDisplay {
  id: string;
  source: "quality" | "upgrade" | "affix";
  label: string;
  value: string;
  kind?: "prefix" | "suffix";
  tier?: number;
  tone?: "gold" | "green" | "blue" | "default";
}

export interface ItemPresentation {
  name: string;
  rarity: string;
  typeLabel: string;
  slotLabel?: string;
  masteryRequirement?: number;
  equipped: boolean;
  quantity: number;
  modified: boolean;
  modifiers: ItemModifierDisplay[];
  effectiveStats?: ReturnType<typeof formatItemStats>;
  baseStats?: ReturnType<typeof formatItemStats>;
  technical?: {
    instanceId: string;
    definitionId: string;
    affixes: Array<{ affixId: string; tierId: string; rolls: Record<string, number> }>;
  };
}

const localLabels: Record<string, string> = {
  physicalDamage: "Physical Damage",
  attackSpeed: "Attack Speed",
  criticalChance: "Critical Strike Chance",
  armour: "Armour",
  evasion: "Evasion",
};

function signedNumber(value: number) {
  return `${value >= 0 ? "+" : ""}${Number.isInteger(value) ? value : Number(value.toFixed(2))}`;
}

function formatModifierValue(modifier: ItemAffixModifierDefinition, value: number) {
  if (modifier.roll.valueType === "integer") return signedNumber(value);
  return `${value >= 0 ? "+" : ""}${Number((value * 100).toFixed(2))}%`;
}

function modifierLabel(modifier: ItemAffixModifierDefinition) {
  const target = modifier.scope === "local" ? localLabels[modifier.target] : labelForStatKey(modifier.stat);
  if (modifier.operation === "increased") return `Increased ${target}`;
  if (modifier.operation === "more") return `More ${target}`;
  return target;
}

export function itemModifierDisplays(resolved: ResolvedItemInstance): ItemModifierDisplay[] {
  const displays: ItemModifierDisplay[] = [];
  if (resolved.instance.quality > 0) displays.push({ id: "quality", source: "quality", label: "Quality", value: `+${resolved.instance.quality}%`, tone: "green" });
  if (resolved.instance.upgradeLevel > 0) displays.push({ id: "upgrade", source: "upgrade", label: "Upgrade", value: `+${resolved.instance.upgradeLevel}`, tone: "green" });
  for (const affixInstance of resolved.instance.affixes) {
    const affix = itemAffixById[affixInstance.affixId];
    const tier = affix?.tiers.find((candidate) => candidate.id === affixInstance.tierId);
    if (!affix || !tier) continue;
    for (const modifier of tier.modifiers) {
      const roll = affixInstance.rolls[modifier.id];
      if (typeof roll !== "number") continue;
      displays.push({
        id: `${affixInstance.affixId}.${modifier.id}`,
        source: "affix",
        label: `${affix.name}: ${modifierLabel(modifier)}`,
        value: formatModifierValue(modifier, roll),
        kind: affix.kind,
        tier: tier.tier,
        tone: "blue",
      });
    }
  }
  return displays;
}

export function buildItemPresentation(
  resolved: ResolvedItemInstance,
  options: { equipped?: boolean; quantity?: number; includeBaseStats?: boolean; technical?: boolean } = {},
): ItemPresentation {
  const { definition, instance } = resolved;
  return {
    name: definition.name,
    rarity: definition.rarity,
    typeLabel: definition.category[0].toUpperCase() + definition.category.slice(1),
    slotLabel: definition.equipmentSlotKind ? equipmentSlotKindLabel(definition.equipmentSlotKind) : undefined,
    masteryRequirement: definition.requiredMasteryLevel,
    equipped: Boolean(options.equipped),
    quantity: options.quantity ?? 1,
    modified: instance.quality > 0 || instance.upgradeLevel > 0 || instance.affixes.length > 0,
    modifiers: itemModifierDisplays(resolved),
    effectiveStats: formatItemStats(resolved.effectiveStats),
    baseStats: options.includeBaseStats ? formatItemStats(resolved.baseStats) : undefined,
    technical: options.technical ? { instanceId: instance.id, definitionId: instance.definitionId, affixes: instance.affixes } : undefined,
  };
}

export function buildStackableItemPresentation(definition: ResolvedItemInstance["definition"], quantity: number): ItemPresentation {
  return {
    name: definition.name,
    rarity: definition.rarity,
    typeLabel: definition.category[0].toUpperCase() + definition.category.slice(1),
    slotLabel: undefined,
    masteryRequirement: undefined,
    equipped: false,
    quantity,
    modified: false,
    modifiers: [],
    effectiveStats: undefined,
    baseStats: undefined,
  };
}

export function itemInstanceIsModified(instance: ItemInstance) {
  return instance.quality > 0 || instance.upgradeLevel > 0 || instance.affixes.length > 0;
}
