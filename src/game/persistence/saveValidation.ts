import type { GameSaveV4 } from "./saveTypes";
import { proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isGameSave(value: unknown): value is GameSaveV4 {
  if (
    !isRecord(value) ||
    value.version !== 4 ||
    typeof value.gold !== "number" ||
    !isRecord(value.progression) ||
    !isRecord(value.inventory) ||
    !isRecord(value.equipment) ||
    !isRecord(value.collection) ||
    !isRecord(value.settings) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation)
  )
    return false;
  const progression = value.progression;
  if (
    !isRecord(progression.proficiencies) ||
    typeof progression.masteryXp !== "number" ||
    progression.masteryXp < 0 ||
    !isRecord(progression.purchasedPerks)
  )
    return false;
  for (const [id, progress] of Object.entries(progression.proficiencies))
    if (
      !proficiencyById[id] ||
      !isRecord(progress) ||
      progress.proficiencyId !== id ||
      typeof progress.totalXp !== "number" ||
      progress.totalXp < 0
    )
      return false;
  if (
    Object.entries(progression.purchasedPerks).some(([perkId, rank]) => {
      const perk = perkById[perkId];
      if (!perk || typeof rank !== "number" || !Number.isInteger(rank))
        return true;
      return (
        rank < 0 ||
        rank > perk.maxRank ||
        (perk.branch !== "Legacy" &&
          !proficiencyById[perk.proficiencyId].perkIds.includes(perkId))
      );
    })
  )
    return false;
  const inventory = value.inventory;
  const equipment = value.equipment;
  const collection = value.collection;
  const settings = value.settings;
  const spellbook = value.spellbook;
  const automation = value.combatAutomation;
  if (
    !isRecord(inventory.quantities) ||
    !isRecord(equipment.slots) ||
    !Array.isArray(collection.discoveredItems) ||
    !isRecord(collection.targets)
  )
    return false;
  if (
    !Array.isArray(spellbook.knownSpellIds) ||
    !Array.isArray(spellbook.equippedSpellSlots) ||
    spellbook.equippedSpellSlots.length !== 6
  )
    return false;
  if (
    typeof automation.enabled !== "boolean" ||
    !Array.isArray(automation.rules) ||
    !Array.isArray(automation.targetPriorityRules)
  )
    return false;
  return (
    typeof settings.reducedMotion === "boolean" &&
    typeof settings.showInspectorButton === "boolean"
  );
}
