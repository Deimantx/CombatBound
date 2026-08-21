import type { CollectionState } from "../collection/collectionTypes";
import { normalizeCollectionTargets } from "../collection/collectionLogic";
import { itemById, itemDefinitions } from "../data/items";
import { isItemInstanceId, type ItemInstance } from "../items/itemTypes";
import { isLegacyItemInstanceV2, normalizeItemInstance } from "../items/itemInstanceValidation";
import { canEquipItemToSlot, normalizeEquipmentState } from "../equipment/equipmentRules";
import { grantItem } from "../items/itemOwnership";
import type { InventoryState } from "../inventory/inventoryTypes";
import { proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";
import type {
  CombatProficiencyId,
  ProgressionState,
} from "../progression/progressionTypes";
import type { GameSaveV3, GameSaveV4, GameSaveV5, GameSaveV6, GameSaveV7, GameSaveV8, GameSaveV9, GameSaveV10, GameSaveV11, GameSaveV12, GameSaveV13, GameSaveV14, GameSaveV15, GameSaveV16, LegacyCombatProficiencyIdV14, LegacyEquipmentStateV10, LegacyInventoryStateV10, LegacyInventoryStateV11, LegacyProgressionState, LegacyProgressionStateV14, LegacySpellbookStateV13, LegacyCombatAbilityLoadoutStateV13 } from "./saveTypes";
import { createInitialCombatAutomation } from "../automation/automationTypes";
import { normalizeCombatAutomation } from "../automation/automationLogic";
import { getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { createInitialCombatAutomationPresets, normalizeCombatAutomationPresets } from "../automation/automationPresets";
import { EQUIPMENT_SLOT_IDS } from "../equipment/equipmentTypes";
import { normalizeCombatAbilityLoadout } from "../combatAbilities/combatAbilityLogic";
import { normalizeMagicArts } from "../magicArts/magicArtLogic";
import { enemyDefinitions } from "../data/enemies";

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

export const LEGACY_V14_PROFICIENCY_IDS = new Set<LegacyCombatProficiencyIdV14>([
  'one-handed-sword', 'one-handed-axe', 'one-handed-mace', 'dagger',
  'two-handed-sword', 'two-handed-axe', 'two-handed-hammer', 'spear',
  'shortbow', 'longbow', 'crossbow', 'fire-magic', 'water-magic',
  'air-magic', 'earth-magic', 'darkness-magic', 'light-armor',
  'medium-armor', 'heavy-armor', 'shield',
]);

export const LEGACY_V14_SPELL_IDS = new Set([
  'spell.flame-blast', 'spell.lightning-pulse', 'spell.ice-shard',
  'spell.stone-spike', 'spell.shadow-bolt',
]);

export function isLegacyCombatProficiencyIdV14(value: string): value is LegacyCombatProficiencyIdV14 {
  return LEGACY_V14_PROFICIENCY_IDS.has(value as LegacyCombatProficiencyIdV14);
}

export function normalizeLegacySpellIdV14(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value === 'spell.disrupting-pulse' ? 'spell.lightning-pulse' : value;
  return LEGACY_V14_SPELL_IDS.has(normalized) ? normalized : null;
}

function normalizeLegacySpellbook(value: unknown): LegacySpellbookStateV13 {
  const raw = isRecord(value) ? value : {};
  const knownSpellIds = Array.from(new Set((Array.isArray(raw.knownSpellIds) ? raw.knownSpellIds : [])
    .map(normalizeLegacySpellIdV14)
    .filter((id): id is string => Boolean(id))));
  const used = new Set<string>();
  const equippedSpellSlots = Array.from({ length: 5 }, (_, index) => {
    const rawSlots = Array.isArray(raw.equippedSpellSlots) ? raw.equippedSpellSlots : [];
    const id = normalizeLegacySpellIdV14(rawSlots[index]);
    if (!id || !knownSpellIds.includes(id) || used.has(id)) return null;
    used.add(id);
    return id;
  });
  return { knownSpellIds, equippedSpellSlots };
}

function normalizeLegacyCombatAbility(value: unknown): LegacyCombatAbilityLoadoutStateV13 {
  const raw = isRecord(value) ? value : {};
  const validActionIds = new Set(getActiveAbilityActionDefinitions().map((action) => action.id));
  const used = new Set<string>();
  const activeSlots = Array.from({ length: 5 }, (_, index) => {
    const rawSlots = Array.isArray(raw.activeSlots) ? raw.activeSlots : [];
    const id = rawSlots[index];
    if (typeof id !== "string" || !validActionIds.has(id) || used.has(id)) return null;
    used.add(id);
    return id;
  });
  const techniqueSlots = Array.from({ length: 2 }, (_, index) => {
    const rawSlots = Array.isArray(raw.techniqueSlots) ? raw.techniqueSlots : [];
    const id = rawSlots[index];
    return typeof id === "string" && (id === "careful-positioning" || id === "heightened-reflexes") ? id : null;
  });
  return { activeSlots, techniqueSlots };
}

function normalizeLegacyV14CombatAbilitySlots(value: unknown, knownSpellIds: readonly string[]): Array<string | null> {
  const rawSlots = Array.isArray(value) ? value : [];
  const used = new Set<string>();
  return Array.from({ length: 5 }, (_, index) => {
    const rawId = rawSlots[index];
    const spellId = normalizeLegacySpellIdV14(rawId);
    const id = spellId && knownSpellIds.includes(spellId) ? spellId : typeof rawId === "string" ? rawId : null;
    const validActive = typeof id === "string" && getActiveAbilityActionDefinitions().some((action) => action.id === id);
    if (!id || (!validActive && !spellId) || used.has(id)) return null;
    used.add(id);
    return id;
  });
}

function legacyCombatAbilityDefaults(): LegacyCombatAbilityLoadoutStateV13 {
  return { activeSlots: ["defense.guard", "defense.evasive-step", "defense.brace", null, null], techniqueSlots: ["careful-positioning", "heightened-reflexes"] };
}

// V12 boundary compatibility for historical perk IDs. Runtime content keeps
// only valid current perks while old saves retain their purchased ranks.
const legacyPerkIdAliases: Record<string, string> = {
  "perk.one-handed-sword.one-handed-mastery": "perk.one-handed-sword.one-handed-foundations",
  "perk.fire-magic.fire-magic-mastery": "perk.fire-magic.fire-magic-foundations",
  "fire-magic.scorching-exposure": "fire-magic.scorching-off-balance",
  "perk.two-handed-hammer.total-suppression": "perk.two-handed-hammer.total-crush",
};

export function normalizePurchasedPerks(value: unknown): Record<string, number> {
  const normalized: Record<string, number> = {};
  if (!isRecord(value)) return normalized;
  for (const [rawId, rawRank] of Object.entries(value)) {
    const perkId = legacyPerkIdAliases[rawId] ?? rawId;
    const perk = perkById[perkId];
    const rank = typeof rawRank === "number" && Number.isInteger(rawRank) ? rawRank : -1;
    if (!perk || rank < 0 || rank > perk.maxRank) continue;
    normalized[perkId] = Math.min(perk.maxRank, (normalized[perkId] ?? 0) + rank);
  }
  return normalized;
}

export function normalizeProgressionPerkIds(progression: ProgressionState): ProgressionState {
  return { ...progression, purchasedPerks: normalizePurchasedPerks(progression.purchasedPerks) };
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
): LegacyProgressionState {
  const proficiencies: LegacyProgressionState["proficiencies"] = {};
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
  const purchasedPerks = normalizePurchasedPerks(raw.purchasedPerks);
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
      knownSpellIds: [...LEGACY_V14_SPELL_IDS],
      equippedSpellSlots: [...LEGACY_V14_SPELL_IDS],
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
    spellbook: normalizeLegacySpellbook(old.spellbook),
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
    spellbook: normalizeLegacySpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAbilities: normalizeLegacyCombatAbility(
      "combatAbilities" in old
        ? old.combatAbilities
        : legacyCombatAbilityDefaults(),
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
    spellbook: normalizeLegacySpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAutomationPresets: createInitialCombatAutomationPresets(),
    combatAbilities: normalizeLegacyCombatAbility(old.combatAbilities),
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
    spellbook: normalizeLegacySpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAutomationPresets: normalizeCombatAutomationPresets(old.combatAutomationPresets),
    combatAbilities: normalizeLegacyCombatAbility(old.combatAbilities),
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
    spellbook: normalizeLegacySpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAutomationPresets: normalizeCombatAutomationPresets(old.combatAutomationPresets),
    combatAbilities: normalizeLegacyCombatAbility(old.combatAbilities),
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
  const purchasedPerks = normalizePurchasedPerks(old.progression.purchasedPerks);

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
    spellbook: normalizeLegacySpellbook(old.spellbook),
    combatAutomation: normalizeCombatAutomation(old.combatAutomation),
    combatAutomationPresets: normalizeCombatAutomationPresets(old.combatAutomationPresets),
    combatAbilities: normalizeLegacyCombatAbility(old.combatAbilities),
  };
}

function isCompleteV10MigrationInput(value: unknown): value is GameSaveV10 {
  if (!isRecord(value) || value.version !== 10 || !sharedSaveShape(value)) return false;
  const inventory = value.inventory;
  const equipment = value.equipment;
  const collection = value.collection;
  const settings = value.settings;
  const spellbook = value.spellbook;
  const automation = value.combatAutomation;
  const presets = value.combatAutomationPresets;
  const abilities = value.combatAbilities;
  return typeof value.gold === "number" && Number.isFinite(value.gold)
    && isRecord(value.progression)
    && isRecord(inventory) && isRecord(inventory.quantities) && Object.entries(inventory.quantities).every(([definitionId, quantity]) => Boolean(itemById[definitionId]) && typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 0)
    && isRecord(equipment) && isRecord(equipment.slots)
    && isRecord(collection) && Array.isArray(collection.discoveredItems) && isRecord(collection.targets)
    && isRecord(settings) && typeof settings.reducedMotion === "boolean" && typeof settings.showInspectorButton === "boolean"
    && isRecord(spellbook) && Array.isArray(spellbook.knownSpellIds) && Array.isArray(spellbook.equippedSpellSlots)
    && isRecord(automation) && typeof automation.enabled === "boolean" && Array.isArray(automation.rules) && Array.isArray(automation.targetPriorityRules)
    && isRecord(presets) && Array.isArray(presets.slots)
    && isRecord(abilities) && Array.isArray(abilities.activeSlots) && Array.isArray(abilities.techniqueSlots);
}

/** Explicit V10 definition-ID ownership conversion. Modern runtime never accepts this legacy shape. */
export function migrateV10Save(value: unknown): GameSaveV11 | null {
  if (!isCompleteV10MigrationInput(value)) return null;
  const old = value;
  const stackables: Record<string, number> = {};
  const instances: Record<string, LegacyInventoryStateV11["instances"][string]> = {};
  const migratedByDefinition: Record<string, string[]> = {};
  let sequence = 1;
  for (const definition of itemDefinitions) {
    const quantity = Math.max(0, Math.floor(old.inventory.quantities[definition.id] ?? 0));
    if (quantity <= 0) continue;
    if (definition.inventoryMode === "stackable") {
      stackables[definition.id] = quantity;
      continue;
    }
    migratedByDefinition[definition.id] = [];
    for (let index = 0; index < quantity; index += 1) {
      const id = `item-instance-${String(sequence++).padStart(8, "0")}`;
      instances[id] = { id, definitionId: definition.id, version: 1 };
      migratedByDefinition[definition.id].push(id);
    }
  }
  const slots: Partial<Record<typeof EQUIPMENT_SLOT_IDS[number], string>> = {};
  const usedInstances = new Set<string>();
  for (const slot of EQUIPMENT_SLOT_IDS) {
    const definitionId = old.equipment.slots[slot];
    if (typeof definitionId !== "string") continue;
    const item = itemById[definitionId];
    const candidate = (migratedByDefinition[definitionId] ?? []).find((instanceId) => !usedInstances.has(instanceId));
    if (!item || !candidate || !canEquipItemToSlot(item, slot)) continue;
    slots[slot] = candidate;
    usedInstances.add(candidate);
  }
  const migrated: GameSaveV11 = { ...old, version: 11, inventory: { stackables, instances, nextInstanceSequence: sequence }, equipment: { slots } };
  if (Object.values(migrated.inventory.instances).some((instance) => !isItemInstanceId(instance.id) || instance.id !== migrated.inventory.instances[instance.id]?.id || itemById[instance.definitionId]?.inventoryMode !== "instance")) return null;
  return migrated;
}

function isCompleteV11MigrationInput(value: unknown): value is GameSaveV11 {
  if (!isRecord(value) || value.version !== 11 || !sharedSaveShape(value)) return false;
  return isRecord(value.inventory) && isRecord(value.inventory.stackables) && isRecord(value.inventory.instances)
    && typeof value.inventory.nextInstanceSequence === "number" && Number.isFinite(value.inventory.nextInstanceSequence) && isRecord(value.equipment) && isRecord(value.equipment.slots)
    && isRecord(value.progression) && isRecord(value.spellbook) && isRecord(value.combatAutomation)
    && isRecord(value.combatAutomationPresets) && isRecord(value.combatAbilities);
}

export function migrateV11Save(value: unknown): GameSaveV12 | null {
  if (!isCompleteV11MigrationInput(value)) return null;
  const old = value;
  const stackables: Record<string, number> = {};
  for (const [definitionId, quantity] of Object.entries(old.inventory.stackables)) {
    const definition = itemById[definitionId];
    if (!definition || definition.inventoryMode !== "stackable" || !Number.isInteger(quantity) || quantity < 0) return null;
    if (quantity > 0) stackables[definitionId] = quantity;
  }
  const instances: Record<string, ItemInstance> = {};
  let highest = 0;
  for (const [key, legacy] of Object.entries(old.inventory.instances)) {
    if (!legacy || legacy.id !== key || !isItemInstanceId(key) || legacy.version !== 1) return null;
    const definition = itemById[legacy.definitionId];
    if (!definition || definition.inventoryMode !== "instance") return null;
    const sequence = Number(key.slice("item-instance-".length));
    highest = Math.max(highest, sequence);
    instances[key] = { id: key, definitionId: legacy.definitionId, version: 2, quality: 0, upgradeLevel: 0, affixes: [] };
  }
  const nextInstanceSequence = Math.max(1, Math.floor(old.inventory.nextInstanceSequence), highest + 1);
  const used = new Set<string>();
  const slots: Partial<Record<typeof EQUIPMENT_SLOT_IDS[number], string>> = {};
  for (const slot of EQUIPMENT_SLOT_IDS) {
    const instanceId = old.equipment.slots[slot];
    if (typeof instanceId !== "string" || used.has(instanceId)) continue;
    const instance = instances[instanceId];
    const definition = instance ? itemById[instance.definitionId] : undefined;
    if (!instance || !definition || !canEquipItemToSlot(definition, slot)) continue;
    slots[slot] = instanceId;
    used.add(instanceId);
  }
  const migrated: GameSaveV12 = { ...old, version: 12, progression: { ...old.progression, purchasedPerks: normalizePurchasedPerks(old.progression.purchasedPerks) }, inventory: { stackables, instances, nextInstanceSequence }, equipment: { slots } };
  if (Object.values(migrated.inventory.instances).some((instance) => !isLegacyItemInstanceV2(instance))) return null;
  return migrated;
}

function migrateV12Progression(value: unknown): LegacyProgressionStateV14 | null {
  if (!isRecord(value) || !isRecord(value.proficiencies)) return null;
  const proficiencies: LegacyProgressionStateV14["proficiencies"] = {};
  for (const [id, rawProgress] of Object.entries(value.proficiencies)) {
    if (!isLegacyCombatProficiencyIdV14(id) || !isRecord(rawProgress) || rawProgress.proficiencyId !== id || typeof rawProgress.totalXp !== "number" || !Number.isFinite(rawProgress.totalXp) || rawProgress.totalXp < 0) return null;
    proficiencies[id] = { proficiencyId: id, totalXp: rawProgress.totalXp };
  }
  const bonusPerkPoints = typeof value.bonusPerkPoints === "number" && Number.isFinite(value.bonusPerkPoints) ? Math.max(0, Math.floor(value.bonusPerkPoints)) : 0;
  return { proficiencies, hunterRankPoints: 0, bonusPerkPoints, purchasedPerks: normalizePurchasedPerks(value.purchasedPerks) };
}

/** V12 is the final legacy schema: its combat-derived global XP is intentionally discarded. */
export function migrateV12Save(value: unknown): GameSaveV13 | null {
  if (!isRecord(value) || value.version !== 12 || !sharedSaveShape(value) || !isRecord(value.progression) || !isRecord(value.inventory) || !isRecord(value.equipment) || !isRecord(value.spellbook) || !isRecord(value.combatAutomation) || !isRecord(value.combatAutomationPresets) || !isRecord(value.combatAbilities)) return null;
  const progression = migrateV12Progression(value.progression);
  if (!progression) return null;
  const old = value as unknown as GameSaveV12;
  const migrated: GameSaveV13 = { ...old, version: 13, progression };
  return migrated;
}

/** Convert the final pre-unification save without exposing its retired fields to runtime. */
export function migrateV13Save(value: unknown): GameSaveV14 | null {
  if (!isRecord(value) || value.version !== 13 || !sharedSaveShape(value) || !isRecord(value.progression) || !isRecord(value.inventory) || !isRecord(value.equipment) || !isRecord(value.spellbook) || !isRecord(value.combatAutomation) || !isRecord(value.combatAutomationPresets) || !isRecord(value.combatAbilities)) return null;
  const old = value as unknown as GameSaveV13;
  const spellbook = normalizeLegacySpellbook(old.spellbook);
  const legacyAbilities = normalizeLegacyCombatAbility(old.combatAbilities);
  const mergedSlots = [...legacyAbilities.activeSlots];
  for (const spellId of spellbook.equippedSpellSlots) {
    if (!spellId || mergedSlots.includes(spellId)) continue;
    const empty = mergedSlots.findIndex((slot) => slot === null);
    if (empty < 0) break;
    mergedSlots[empty] = spellId;
  }
  return {
    ...old,
    version: 14,
    spellbook: { knownSpellIds: spellbook.knownSpellIds },
    combatAbilities: { slots: normalizeLegacyV14CombatAbilitySlots(mergedSlots, spellbook.knownSpellIds) },
  };
}

/** V14 → V15 is the only boundary that discards the retired Magic Schools. */
export function migrateV14Save(value: unknown): GameSaveV15 | null {
  if (!isRecord(value) || value.version !== 14 || !sharedSaveShape(value)) return null;
  const rawProgression = isRecord(value.progression) ? value.progression : {};
  const proficiencies: ProgressionState["proficiencies"] = {};
  if (isRecord(rawProgression.proficiencies)) {
    for (const [id, raw] of Object.entries(rawProgression.proficiencies)) {
      if (!proficiencyById[id] || !isRecord(raw) || typeof raw.totalXp !== "number" || !Number.isFinite(raw.totalXp) || raw.totalXp < 0) continue;
      proficiencies[id as CombatProficiencyId] = { proficiencyId: id as CombatProficiencyId, totalXp: raw.totalXp };
    }
  }
  const progression: ProgressionState = {
    proficiencies,
    hunterRankPoints: typeof rawProgression.hunterRankPoints === "number" && Number.isFinite(rawProgression.hunterRankPoints) ? Math.max(0, rawProgression.hunterRankPoints) : 0,
    bonusPerkPoints: typeof rawProgression.bonusPerkPoints === "number" && Number.isFinite(rawProgression.bonusPerkPoints) ? Math.max(0, Math.floor(rawProgression.bonusPerkPoints)) : 0,
    purchasedPerks: normalizePurchasedPerks(rawProgression.purchasedPerks),
  };

  const activeActionIds = new Set(getActiveAbilityActionDefinitions().map((action) => action.id));
  const rawSlots = isRecord(value.combatAbilities) && Array.isArray(value.combatAbilities.slots) ? value.combatAbilities.slots : [];
  const used = new Set<string>();
  const slots = Array.from({ length: 5 }, (_, index) => {
    const id = rawSlots[index];
    if (typeof id !== "string" || id.startsWith("spell.") || !activeActionIds.has(id) || used.has(id)) return null;
    used.add(id);
    return id;
  });

  const stripRetiredMagicRules = (automation: ReturnType<typeof normalizeCombatAutomation>) => ({
    ...automation,
    rules: automation.rules.filter((rule) => !rule.actionId.startsWith("spell.")),
  });
  const automation = stripRetiredMagicRules(normalizeCombatAutomation(value.combatAutomation));
  const presets = normalizeCombatAutomationPresets(value.combatAutomationPresets);
  const combatAutomationPresets = {
    slots: presets.slots.map((preset) => preset ? { ...preset, config: { ...preset.config, rules: preset.config.rules.filter((rule) => !rule.actionId.startsWith("spell.")) } } : null),
  };

  const old = value as unknown as GameSaveV14;
  return {
    version: 15,
    progression,
    inventory: old.inventory,
    equipment: old.equipment,
    collection: old.collection,
    gold: typeof old.gold === "number" && Number.isFinite(old.gold) ? old.gold : 0,
    settings: old.settings,
    magicArts: { knownArtIds: ["magic-art.earth-shield"] },
    combatAbilities: { slots },
    combatAutomation: automation,
    combatAutomationPresets,
  };
}

/**
 * V15 is the frozen pre-gear-foundation schema. Its equipment instances may
 * contain retired Training, Hunter, or Vanguard data, so only a valid current
 * Iron Sword instance crosses this boundary. Stackable ownership and the rest
 * of the legitimate profile state are preserved.
 */
export function migrateV15Save(value: unknown): GameSaveV16 | null {
  if (!isRecord(value) || value.version !== 15 || !isRecord(value.inventory)) return null;

  const rawInventory = value.inventory;
  const stackables: Record<string, number> = {};
  if (isRecord(rawInventory.stackables)) {
    for (const definition of itemDefinitions) {
      if (definition.inventoryMode !== "stackable") continue;
      const quantity = rawInventory.stackables[definition.id];
      if (typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0)
        stackables[definition.id] = Math.floor(quantity);
    }
  }

  const instances: Record<string, ItemInstance> = {};
  if (isRecord(rawInventory.instances)) {
    for (const rawInstance of Object.values(rawInventory.instances)) {
      const normalized = normalizeItemInstance(rawInstance);
      if (normalized?.definitionId === "item.iron-sword") instances[normalized.id] = normalized;
    }
  }

  const highestSequence = Object.keys(instances).reduce(
    (max, id) => Math.max(max, Number(id.slice("item-instance-".length)) || 0),
    0,
  );
  const savedNext = typeof rawInventory.nextInstanceSequence === "number" && Number.isFinite(rawInventory.nextInstanceSequence)
    ? Math.floor(rawInventory.nextInstanceSequence)
    : 1;
  let inventory: InventoryState = {
    stackables,
    instances,
    nextInstanceSequence: Math.max(1, savedNext, highestSequence + 1),
  };
  if (!Object.values(inventory.instances).some((instance) => instance.definitionId === "item.iron-sword"))
    inventory = grantItem(inventory, "item.iron-sword", 1).inventory;

  const normalizedEquipment = normalizeEquipmentState(value.equipment, inventory);
  const equippedSword = Object.values(inventory.instances).find((instance) => instance.definitionId === "item.iron-sword");
  const equipment = normalizedEquipment.slots.weapon || !equippedSword
    ? normalizedEquipment
    : { slots: { ...normalizedEquipment.slots, weapon: equippedSword.id } };

  const rawCollection = isRecord(value.collection) ? value.collection : {};
  const discoveredItems = Array.isArray(rawCollection.discoveredItems)
    ? rawCollection.discoveredItems.filter((id): id is string => typeof id === "string" && Boolean(itemById[id]))
    : [];
  const collection = normalizeCollectionTargets({
    discoveredItems: Array.from(new Set([...discoveredItems, "item.iron-sword"])),
    targets: isRecord(rawCollection.targets) ? rawCollection.targets as GameSaveV16["collection"]["targets"] : {},
  }, enemyDefinitions.map((enemy) => enemy.id));

  const rawProgression = isRecord(value.progression) ? value.progression as unknown as ProgressionState : {
    proficiencies: {},
    hunterRankPoints: 0,
    bonusPerkPoints: 0,
    purchasedPerks: {},
  } satisfies ProgressionState;
  const magicArts = normalizeMagicArts(value.magicArts);
  const automation = normalizeCombatAutomation(value.combatAutomation);
  const stripRetiredSpellRules = <T extends { actionId: string }>(rules: T[]) => rules.filter((rule) => !rule.actionId.startsWith("spell."));
  const presets = normalizeCombatAutomationPresets(value.combatAutomationPresets);
  const combatAutomation = { ...automation, rules: stripRetiredSpellRules(automation.rules) };
  const combatAutomationPresets = {
    slots: presets.slots.map((preset) => preset ? { ...preset, config: { ...preset.config, rules: stripRetiredSpellRules(preset.config.rules) } } : null),
  };

  return {
    version: 16,
    progression: normalizeProgressionPerkIds(rawProgression),
    inventory,
    equipment,
    collection,
    gold: typeof value.gold === "number" && Number.isFinite(value.gold) ? value.gold : 0,
    settings: isRecord(value.settings)
      ? { reducedMotion: value.settings.reducedMotion === true, showInspectorButton: value.settings.showInspectorButton === true }
      : { reducedMotion: false, showInspectorButton: false },
    magicArts,
    combatAbilities: normalizeCombatAbilityLoadout(value.combatAbilities, magicArts.knownArtIds),
    combatAutomation,
    combatAutomationPresets,
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
