import type { CollectionState } from "../collection/collectionTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import { itemById, itemDefinitions } from "../data/items";
import { grantItem } from "../items/itemOwnership";
import { canEquipItemToSlot } from "../equipment/equipmentRules";
import { proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";
import type {
  CombatProficiencyId,
  ProgressionState,
} from "../progression/progressionTypes";
import type { GameSaveV3, GameSaveV4, GameSaveV5, GameSaveV6, GameSaveV7, GameSaveV8, GameSaveV9, GameSaveV10, GameSaveV11, LegacyEquipmentStateV10, LegacyInventoryStateV10 } from "./saveTypes";
import { createInitialCombatAutomation } from "../automation/automationTypes";
import { normalizeSpellbook } from "../spellbook/spellbookLogic";
import { spellDefinitions } from "../data/spells";
import { normalizeCombatAutomation } from "../automation/automationLogic";
import { createInitialCombatAbilityLoadout, normalizeCombatAbilityLoadout } from "../combatAbilities/combatAbilityLogic";
import { createInitialCombatAutomationPresets, normalizeCombatAutomationPresets } from "../automation/automationPresets";
import { EQUIPMENT_SLOT_IDS } from "../equipment/equipmentTypes";

interface LegacySkillProgress {
  totalXp?: number;
}
interface LegacySaveV1 {
  version: 1;
  progression: {
    skills: Record<string, LegacySkillProgress>;
    trainingFocus?: string;
    hunterRank?: number;
  };
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
}

interface LegacySaveV2 {
  version: 2;
  progression: {
    proficiencies: Record<string, { proficiencyId?: string; totalXp?: number }>;
    masteryXp?: number;
    purchasedPerks?: Record<string, number>;
  };
  inventory: LegacyInventoryStateV10;
  equipment: LegacyEquipmentStateV10;
  collection: CollectionState;
  gold: number;
  settings: { reducedMotion: boolean; showInspectorButton: boolean };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function xp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}
function sharedSaveShape(value: Record<string, unknown>) {
  return (
    typeof value.gold === "number" &&
    isRecord(value.inventory) &&
    isRecord(value.equipment) &&
    isRecord(value.collection) &&
    isRecord(value.settings)
  );
}

export function migrateEquipment(value: unknown, quantities?: Record<string, number>): LegacyEquipmentStateV10 {
  const rawSlots = isRecord(value) && isRecord(value.slots) ? value.slots : {};
  const slots: Record<string, unknown> = {};
  for (const slot of EQUIPMENT_SLOT_IDS) {
    if (typeof rawSlots[slot] === "string") slots[slot] = rawSlots[slot];
  }
  if (typeof slots.armor !== "string") {
    const historicalArmor = typeof rawSlots.armor === "string" ? rawSlots.armor : rawSlots.chest;
    if (typeof historicalArmor === "string") slots.armor = historicalArmor;
  }
  if (typeof slots.gloves !== "string" && typeof rawSlots.hands === "string") slots.gloves = rawSlots.hands;
  if (typeof slots.boots !== "string" && typeof rawSlots.feet === "string") slots.boots = rawSlots.feet;
  const normalized: Partial<Record<typeof EQUIPMENT_SLOT_IDS[number], string>> = {};
  const usedCopies: Record<string, number> = {};
  for (const slot of EQUIPMENT_SLOT_IDS) {
    const definitionId = slots[slot];
    if (typeof definitionId !== "string") continue;
    const item = itemById[definitionId];
    if (!item || !item.equipmentSlotKind || !canEquipItemToSlot(item, slot)) continue;
    const maxCopies = quantities ? Math.max(0, Math.floor(quantities[definitionId] ?? 0)) : Number.POSITIVE_INFINITY;
    if ((usedCopies[definitionId] ?? 0) >= maxCopies) continue;
    normalized[slot] = definitionId;
    usedCopies[definitionId] = (usedCopies[definitionId] ?? 0) + 1;
  }
  return { slots: normalized };
}

function migrateProgression(
  raw: LegacySaveV2["progression"],
): ProgressionState {
  const proficiencies: ProgressionState["proficiencies"] = {};
  for (const [rawId, value] of Object.entries(raw.proficiencies ?? {})) {
    if (rawId === "warding-magic" || rawId === "light-magic") continue;
    const migratedId = rawId === "disruption-magic" ? "air-magic" : rawId;
    if (!proficiencyById[migratedId] || !isRecord(value)) continue;
    const proficiencyId = migratedId as CombatProficiencyId;
    const current = proficiencies[proficiencyId]?.totalXp ?? 0;
    proficiencies[proficiencyId] = {
      proficiencyId,
      totalXp: current + xp(value.totalXp),
    };
  }
  const purchasedPerks: Record<string, number> = {};
  for (const [perkId, rank] of Object.entries(raw.purchasedPerks ?? {})) {
    const perk = perkById[perkId];
    if (
      !perk ||
      perkId.includes("warding-magic") ||
      perkId.includes("disruption-magic")
    )
      continue;
    if (Number.isInteger(rank) && rank > 0 && rank <= perk.maxRank)
      purchasedPerks[perkId] = rank;
  }
  return { proficiencies, masteryXp: xp(raw.masteryXp), bonusPerkPoints: 0, purchasedPerks };
}

export function migrateCurrentSave(value: unknown): GameSaveV3 | null {
  if (
    !isRecord(value) ||
    value.version !== 2 ||
    !isRecord(value.progression) ||
    !isRecord(value.progression.proficiencies) ||
    !sharedSaveShape(value)
  )
    return null;
  const old = value as unknown as LegacySaveV2;
  return {
    version: 3,
    progression: migrateProgression(old.progression),
    inventory: old.inventory,
    equipment: migrateEquipment(old.equipment),
    collection: old.collection,
    gold: old.gold,
    settings: old.settings,
  };
}

export function migrateV3Save(value: unknown): GameSaveV4 | null {
  if (
    !isRecord(value) ||
    value.version !== 3 ||
    !isRecord(value.progression) ||
    !sharedSaveShape(value)
  )
    return null;
  const old = value as unknown as GameSaveV3;
  return {
    ...old,
    version: 4,
    equipment: migrateEquipment(old.equipment),
    spellbook: {
      knownSpellIds: spellDefinitions.map((spell) => spell.id),
      equippedSpellSlots: spellDefinitions.map((spell) => spell.id),
    },
    combatAutomation: createInitialCombatAutomation(),
  };
}

export function migrateV4Save(value: unknown): GameSaveV5 | null {
  if (
    !isRecord(value) ||
    value.version !== 4 ||
    !isRecord(value.progression) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation) ||
    !sharedSaveShape(value)
  )
    return null;
  const old = value as unknown as GameSaveV4;
  return {
    ...old,
    version: 5,
    equipment: migrateEquipment(old.equipment),
    spellbook: normalizeSpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
  };
}

export function migrateV5Save(value: unknown): GameSaveV6 | null {
  if (
    !isRecord(value) ||
    value.version !== 5 ||
    !isRecord(value.progression) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation) ||
    !sharedSaveShape(value)
  )
    return null;
  const old = value as unknown as GameSaveV5;
  return {
    ...old,
    version: 6,
    equipment: migrateEquipment(old.equipment),
    spellbook: normalizeSpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAbilities: normalizeCombatAbilityLoadout(
      "combatAbilities" in old
        ? old.combatAbilities
        : createInitialCombatAbilityLoadout(),
    ),
  };
}

export function migrateV6Save(value: unknown): GameSaveV7 | null {
  if (
    !isRecord(value) ||
    value.version !== 6 ||
    !isRecord(value.progression) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation) ||
    !isRecord(value.combatAbilities) ||
    !sharedSaveShape(value)
  )
    return null;
  const old = value as unknown as GameSaveV6;
  return {
    ...old,
    version: 7,
    equipment: migrateEquipment(old.equipment),
    spellbook: normalizeSpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAutomationPresets: createInitialCombatAutomationPresets(),
    combatAbilities: normalizeCombatAbilityLoadout(old.combatAbilities),
  };
}

export function migrateV7Save(value: unknown): GameSaveV8 | null {
  if (
    !isRecord(value) ||
    value.version !== 7 ||
    !isRecord(value.progression) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation) ||
    !isRecord(value.combatAutomationPresets) ||
    !isRecord(value.combatAbilities) ||
    !sharedSaveShape(value)
  )
    return null;
  const old = value as unknown as GameSaveV7;
  return {
    ...old,
    version: 8,
    equipment: migrateEquipment(old.equipment, old.inventory.quantities),
    spellbook: normalizeSpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAutomationPresets: normalizeCombatAutomationPresets(old.combatAutomationPresets),
    combatAbilities: normalizeCombatAbilityLoadout(old.combatAbilities),
  };
}

export function migrateV8Save(value: unknown): GameSaveV9 | null {
  if (
    !isRecord(value) ||
    value.version !== 8 ||
    !isRecord(value.progression) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation) ||
    !isRecord(value.combatAutomationPresets) ||
    !isRecord(value.combatAbilities) ||
    !sharedSaveShape(value)
  )
    return null;
  const old = value as unknown as GameSaveV8;
  return {
    ...old,
    version: 9,
    progression: {
      ...old.progression,
      bonusPerkPoints: Number.isFinite(old.progression.bonusPerkPoints)
        ? Math.max(0, Math.floor(old.progression.bonusPerkPoints ?? 0))
        : 0,
    },
    equipment: migrateEquipment(old.equipment, old.inventory.quantities),
    spellbook: normalizeSpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAutomationPresets: normalizeCombatAutomationPresets(old.combatAutomationPresets),
    combatAbilities: normalizeCombatAbilityLoadout(old.combatAbilities),
  };
}

/**
 * V10 removes the retired Light Magic content and normalizes all loadouts
 * against the canonical spell, automation, and ability catalogues.
 */
export function migrateV9Save(value: unknown): GameSaveV10 | null {
  if (
    !isRecord(value) ||
    value.version !== 9 ||
    !isRecord(value.progression) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation) ||
    !isRecord(value.combatAutomationPresets) ||
    !isRecord(value.combatAbilities) ||
    !sharedSaveShape(value)
  )
    return null;

  const old = value as unknown as GameSaveV9;
  const proficiencies: ProgressionState["proficiencies"] = {};
  for (const [rawId, progress] of Object.entries(old.progression.proficiencies ?? {})) {
    if (rawId === "light-magic" || rawId === "warding-magic" || !proficiencyById[rawId] || !isRecord(progress)) continue;
    const proficiencyId = rawId as CombatProficiencyId;
    proficiencies[proficiencyId] = {
      proficiencyId,
      totalXp: xp(progress.totalXp),
    };
  }
  const purchasedPerks = Object.fromEntries(
    Object.entries(old.progression.purchasedPerks ?? {}).filter(([perkId, rank]) => {
      const perk = perkById[perkId];
      return Boolean(perk) && !perkId.includes("light-magic") && !perkId.includes("warding-magic") && Number.isInteger(rank) && Number(rank) >= 0 && Number(rank) <= perk.maxRank;
    }),
  );

  return {
    ...old,
    version: 10,
    progression: {
      ...old.progression,
      proficiencies,
      purchasedPerks,
      // Historical Light perk costs are not present in V9 saves, so the
      // deterministic migration policy is to discard those ranks without
      // manufacturing a refund from unavailable historical metadata.
      bonusPerkPoints: Math.max(0, Math.floor(old.progression.bonusPerkPoints ?? 0)),
    },
    spellbook: normalizeSpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAutomationPresets: normalizeCombatAutomationPresets(old.combatAutomationPresets),
    combatAbilities: normalizeCombatAbilityLoadout(old.combatAbilities),
  };
}

/** Explicit V10 definition-ID ownership conversion. Modern runtime never accepts this legacy shape. */
export function migrateV10Save(value: unknown): GameSaveV11 | null {
  if (!isRecord(value) || value.version !== 10 || !sharedSaveShape(value)) return null;
  const old = value as unknown as GameSaveV10;
  let inventory: InventoryState = { stackables: {}, instances: {}, nextInstanceSequence: 1 };
  const migratedByDefinition: Record<string, string[]> = {};
  for (const definition of itemDefinitions) {
    const quantity = typeof old.inventory.quantities[definition.id] === "number" && Number.isFinite(old.inventory.quantities[definition.id])
      ? Math.max(0, Math.floor(old.inventory.quantities[definition.id]))
      : 0;
    if (quantity <= 0) continue;
    const grant = grantItem(inventory, definition.id, quantity);
    inventory = grant.inventory;
    if (grant.createdInstanceIds.length) migratedByDefinition[definition.id] = grant.createdInstanceIds;
    if (definition.inventoryMode === "stackable" && grant.stackableQuantityAdded <= 0) continue;
  }
  const slots: Partial<Record<typeof EQUIPMENT_SLOT_IDS[number], string>> = {};
  const usedInstances = new Set<string>();
  const legacySlots = isRecord(old.equipment) && isRecord(old.equipment.slots) ? old.equipment.slots : {};
  for (const slot of EQUIPMENT_SLOT_IDS) {
    const definitionId = legacySlots[slot];
    if (typeof definitionId !== "string") continue;
    const item = itemById[definitionId];
    const candidate = (migratedByDefinition[definitionId] ?? []).find((instanceId) => !usedInstances.has(instanceId));
    if (!item || !candidate || !canEquipItemToSlot(item, slot)) continue;
    slots[slot] = candidate;
    usedInstances.add(candidate);
  }
  return {
    ...old,
    version: 11,
    inventory,
    equipment: { slots },
  };
}

export function migrateLegacySave(value: unknown): GameSaveV3 | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isRecord(value.progression) ||
    !isRecord(value.progression.skills) ||
    !sharedSaveShape(value)
  )
    return null;
  const old = value as unknown as LegacySaveV1;
  const skillXp = Object.values(old.progression.skills).reduce(
    (total, skill) => total + xp(skill.totalXp),
    0,
  );
  const swordXp = xp(old.progression.skills.swordsmanship?.totalXp);
  return {
    version: 3,
    progression: {
      proficiencies: {
        "one-handed-sword": {
          proficiencyId: "one-handed-sword",
          totalXp: swordXp,
        },
      },
      masteryXp: skillXp,
      bonusPerkPoints: 0,
      purchasedPerks: {},
    },
    inventory: old.inventory,
    equipment: migrateEquipment(old.equipment),
    collection: old.collection,
    gold: old.gold,
    settings: old.settings,
  };
}
