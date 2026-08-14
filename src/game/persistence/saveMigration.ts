import type { CollectionState } from "../collection/collectionTypes";
import type { EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import { proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";
import type {
  CombatProficiencyId,
  ProgressionState,
} from "../progression/progressionTypes";
import type { GameSaveV3, GameSaveV4, GameSaveV5, GameSaveV6, GameSaveV7 } from "./saveTypes";
import { createInitialCombatAutomation } from "../automation/automationTypes";
import { normalizeSpellbook } from "../spellbook/spellbookLogic";
import { spellDefinitions } from "../data/spells";
import { normalizeCombatAutomation } from "../automation/automationLogic";
import { createInitialCombatAbilityLoadout, normalizeCombatAbilityLoadout } from "../combatAbilities/combatAbilityLogic";
import { createInitialCombatAutomationPresets } from "../automation/automationPresets";

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
  inventory: InventoryState;
  equipment: EquipmentState;
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
  inventory: InventoryState;
  equipment: EquipmentState;
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

export function migrateEquipment(value: EquipmentState): EquipmentState {
  const slots = { ...(value.slots ?? {}) } as EquipmentState["slots"];
  if (!slots.chest && slots.armor) slots.chest = slots.armor;
  delete slots.armor;
  return { ...value, slots };
}

function migrateProgression(
  raw: LegacySaveV2["progression"],
): ProgressionState {
  const proficiencies: ProgressionState["proficiencies"] = {};
  for (const [rawId, value] of Object.entries(raw.proficiencies ?? {})) {
    const migratedId =
      rawId === "warding-magic"
        ? "light-magic"
        : rawId === "disruption-magic"
          ? "air-magic"
          : rawId;
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
  return { proficiencies, masteryXp: xp(raw.masteryXp), purchasedPerks };
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
      purchasedPerks: {},
    },
    inventory: old.inventory,
    equipment: migrateEquipment(old.equipment),
    collection: old.collection,
    gold: old.gold,
    settings: old.settings,
  };
}
