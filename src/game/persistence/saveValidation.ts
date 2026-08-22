import type { GameSaveV14, GameSaveV15, GameSaveV16, GameSaveV17, GameSaveV18 } from "./saveTypes";
import { proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";
import { COMBAT_ABILITY_SLOT_COUNT } from "../combatAbilities/combatAbilityTypes";
import { getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { isEquipmentSlotId } from "../equipment/equipmentTypes";
import { itemById } from "../data/items";
import { isItemInstanceId, itemInstanceSequence } from "../items/itemTypes";
import { canEquipItemToSlot } from "../equipment/equipmentRules";
import { validateItemInstance } from "../items/itemInstanceValidation";
import { isItemInstanceV16, isLegacyItemInstanceV2 } from "./legacyItemTypes";
import { magicArtDefinitions } from "../data/magicArts";
import { isLegacyCombatProficiencyIdV14, normalizeLegacySpellIdV14 } from "./saveMigration";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isGameSave(value: unknown): value is GameSaveV14 {
  if (
    !isRecord(value) ||
    value.version !== 14 ||
    typeof value.gold !== "number" ||
    !isRecord(value.progression) ||
    !isRecord(value.inventory) ||
    !isRecord(value.equipment) ||
    !isRecord(value.collection) ||
    !isRecord(value.settings) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation) ||
    !isRecord(value.combatAutomationPresets) ||
    !isRecord(value.combatAbilities)
  )
    return false;
  const progression = value.progression;
  if (
    !isRecord(progression.proficiencies) ||
    typeof progression.hunterRankPoints !== "number" ||
    !Number.isFinite(progression.hunterRankPoints) ||
    progression.hunterRankPoints < 0 ||
    typeof progression.bonusPerkPoints !== "number" ||
    !Number.isInteger(progression.bonusPerkPoints) ||
    progression.bonusPerkPoints < 0 ||
    !isRecord(progression.purchasedPerks)
  )
    return false;
  for (const [id, progress] of Object.entries(progression.proficiencies))
    if (
      !isLegacyCombatProficiencyIdV14(id) ||
      !isRecord(progress) ||
      progress.proficiencyId !== id ||
      typeof progress.totalXp !== "number" ||
      progress.totalXp < 0
    )
      return false;
  if (
    Object.entries(progression.purchasedPerks).some(([perkId, rank]) => {
      if (typeof rank !== "number" || !Number.isInteger(rank))
        return true;
      return rank < 0;
    })
  )
    return false;
  const inventory = value.inventory as unknown as GameSaveV14["inventory"];
  const equipment = value.equipment as unknown as GameSaveV14["equipment"];
  const collection = value.collection;
  const settings = value.settings;
  const spellbook = value.spellbook;
  const automation = value.combatAutomation;
  const automationPresets = value.combatAutomationPresets;
  const combatAbilities = value.combatAbilities;
  if (
    !isRecord(inventory.stackables) ||
    !isRecord(inventory.instances) ||
    typeof inventory.nextInstanceSequence !== "number" ||
    !Number.isInteger(inventory.nextInstanceSequence) ||
    inventory.nextInstanceSequence < 1 ||
    !isRecord(equipment.slots) ||
    !Array.isArray(collection.discoveredItems) ||
    !isRecord(collection.targets)
  )
    return false;
  const instanceIds = new Set<string>();
  let highestInstanceSequence = 0;
  for (const [definitionId, quantity] of Object.entries(inventory.stackables)) {
    const definition = itemById[definitionId];
    if (!definition || definition.inventoryMode !== "stackable" || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0) return false;
  }
  for (const [key, rawInstance] of Object.entries(inventory.instances)) {
    if (!isRecord(rawInstance) || rawInstance.id !== key || !isItemInstanceId(rawInstance.id) || !isLegacyItemInstanceV2(rawInstance) || typeof rawInstance.definitionId !== "string") return false;
    const definition = itemById[rawInstance.definitionId];
    if (!definition || definition.inventoryMode !== "instance") return false;
    instanceIds.add(key);
    highestInstanceSequence = Math.max(highestInstanceSequence, itemInstanceSequence(key));
  }
  if (inventory.nextInstanceSequence <= highestInstanceSequence) return false;
  for (const [slot, instanceId] of Object.entries(equipment.slots)) {
    if (!isEquipmentSlotId(slot) || typeof instanceId !== "string" || !instanceIds.has(instanceId)) return false;
    const instance = inventory.instances[instanceId];
    const definition = instance && typeof instance.definitionId === "string" ? itemById[instance.definitionId] : undefined;
    if (!definition || !canEquipItemToSlot(definition, slot)) return false;
    if (Object.entries(equipment.slots).filter(([, value]) => value === instanceId).length > 1) return false;
  }
  if (
    !Array.isArray(spellbook.knownSpellIds) ||
    spellbook.knownSpellIds.some((id) => normalizeLegacySpellIdV14(id) === null)
  )
    return false;
  if (
    typeof automation.enabled !== "boolean" ||
    !Array.isArray(automation.rules) ||
    !Array.isArray(automationPresets.slots) ||
    !Array.isArray(combatAbilities.slots) ||
    combatAbilities.slots.length !== COMBAT_ABILITY_SLOT_COUNT ||
    "activeSlots" in combatAbilities ||
    "techniqueSlots" in combatAbilities
  )
    return false;
  const knownSpellIds = new Set(spellbook.knownSpellIds.map((id) => normalizeLegacySpellIdV14(id)).filter((id): id is string => Boolean(id)));
  const validActionIds = new Set([...getActiveAbilityActionDefinitions().map((action) => action.id), "spell.flame-blast", "spell.lightning-pulse", "spell.ice-shard", "spell.stone-spike", "spell.shadow-bolt"]);
  const usedActionIds = new Set<string>();
  for (const actionId of combatAbilities.slots) {
    if (actionId === null) continue;
    if (typeof actionId !== "string" || !validActionIds.has(actionId) || usedActionIds.has(actionId)) return false;
    if (actionId.startsWith("spell.") && !knownSpellIds.has(actionId)) return false;
    usedActionIds.add(actionId);
  }
  return (
    typeof settings.reducedMotion === "boolean" &&
    typeof settings.showInspectorButton === "boolean"
  );
}

function isModernSaveScaffold(value: unknown, expectedVersion: 15 | 16 | 17 | 18) {
  if (!isRecord(value) || value.version !== expectedVersion || typeof value.gold !== "number" || !Number.isFinite(value.gold) || !isRecord(value.progression) || !isRecord(value.inventory) || !isRecord(value.equipment) || !isRecord(value.collection) || !isRecord(value.settings) || !isRecord(value.magicArts) || !isRecord(value.combatAutomation) || !isRecord(value.combatAutomationPresets) || !isRecord(value.combatAbilities)) return false;
  const progression = value.progression;
  if (!isRecord(progression.proficiencies) || typeof progression.hunterRankPoints !== "number" || progression.hunterRankPoints < 0 || typeof progression.bonusPerkPoints !== "number" || !Number.isInteger(progression.bonusPerkPoints) || progression.bonusPerkPoints < 0 || !isRecord(progression.purchasedPerks)) return false;
  for (const [id, progress] of Object.entries(progression.proficiencies)) {
    if (!proficiencyById[id] || !isRecord(progress) || progress.proficiencyId !== id || typeof progress.totalXp !== "number" || !Number.isFinite(progress.totalXp) || progress.totalXp < 0) return false;
  }
  for (const [perkId, rank] of Object.entries(progression.purchasedPerks)) {
    const perk = perkById[perkId];
    if (!perk || typeof rank !== "number" || !Number.isInteger(rank) || rank < 0 || rank > perk.maxRank) return false;
    const definition = proficiencyById[perk.proficiencyId];
    if (!definition || !definition.perkIds.includes(perkId)) return false;
  }
  const magicArts = value.magicArts;
  if (!Array.isArray(magicArts.knownArtIds) || new Set(magicArts.knownArtIds).size !== magicArts.knownArtIds.length || magicArts.knownArtIds.some((id) => typeof id !== "string" || !magicArtDefinitions.some((art) => art.id === id))) return false;
  const inventory = value.inventory;
  const equipment = value.equipment;
  if (!isRecord(inventory.stackables) || !isRecord(inventory.instances) || typeof inventory.nextInstanceSequence !== "number" || !Number.isInteger(inventory.nextInstanceSequence) || inventory.nextInstanceSequence < 1 || !isRecord(equipment.slots) || !Array.isArray(value.collection.discoveredItems) || !isRecord(value.collection.targets)) return false;
  const automation = value.combatAutomation;
  const presets = value.combatAutomationPresets;
  const abilities = value.combatAbilities;
  if (typeof automation.enabled !== "boolean" || !Array.isArray(automation.rules) || !Array.isArray(presets.slots) || !Array.isArray(abilities.slots) || abilities.slots.length !== COMBAT_ABILITY_SLOT_COUNT) return false;
  const validActionIds = new Set([...getActiveAbilityActionDefinitions().map((action) => action.id), ...magicArtDefinitions.map((art) => art.id)]);
  const used = new Set<string>();
  for (const actionId of abilities.slots) {
    if (actionId === null) continue;
    if (typeof actionId !== "string" || !validActionIds.has(actionId) || used.has(actionId)) return false;
    if (actionId.startsWith("magic-art.") && !magicArts.knownArtIds.includes(actionId)) return false;
    used.add(actionId);
  }
  if (
    JSON.stringify(value).includes("spellbook") ||
    abilities.slots.some((id) => typeof id === "string" && id.startsWith("spell.")) ||
    automation.rules.some((rule) => isRecord(rule) && typeof rule.actionId === "string" && rule.actionId.startsWith("spell.")) ||
    presets.slots.some((preset) => isRecord(preset) && isRecord(preset.config) && Array.isArray(preset.config.rules) && preset.config.rules.some((rule) => isRecord(rule) && typeof rule.actionId === "string" && rule.actionId.startsWith("spell.")))
  ) return false;
  return typeof value.settings.reducedMotion === "boolean" && typeof value.settings.showInspectorButton === "boolean";
}

function validateInventoryBoundary(value: Record<string, unknown>, version: 15 | 16 | 17 | 18) {
  const inventory = value.inventory;
  const equipment = value.equipment;
  if (!isRecord(inventory) || !isRecord(equipment) || !isRecord(inventory.stackables) || !isRecord(inventory.instances) || !isRecord(equipment.slots)) return false;
  const instanceIds = new Set<string>();
  let highestSequence = 0;
  for (const [definitionId, quantity] of Object.entries(inventory.stackables)) {
    if (version === 15) {
      if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0) return false;
    } else {
      const definition = itemById[definitionId];
      if (!definition || definition.inventoryMode !== "stackable" || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0) return false;
    }
  }
  for (const [key, instance] of Object.entries(inventory.instances)) {
    if (!isRecord(instance) || instance.id !== key || !isItemInstanceId(key)) return false;
    if (version === 15) {
      if (!isLegacyItemInstanceV2(instance)) return false;
    } else if (!isItemInstanceV16(instance) || Object.keys(instance).some((field) => !["id", "definitionId", "version", "unlockedUpgradeNodeIds"].includes(field))) return false;
    if ((version === 17 || version === 18) && (!itemById[instance.definitionId] || itemById[instance.definitionId].inventoryMode !== "instance" || !validateItemInstance(instance).valid)) return false;
    if (version === 16 && (!itemById[instance.definitionId] || itemById[instance.definitionId].inventoryMode !== "instance")) return false;
    instanceIds.add(key);
    highestSequence = Math.max(highestSequence, itemInstanceSequence(key));
  }
  if (typeof inventory.nextInstanceSequence !== "number" || inventory.nextInstanceSequence <= highestSequence) return false;
  for (const [slot, instanceId] of Object.entries(equipment.slots)) {
    if (!isEquipmentSlotId(slot) || typeof instanceId !== "string" || !instanceIds.has(instanceId)) return false;
    if (version !== 15) {
      const instance = isRecord(inventory.instances) ? inventory.instances[instanceId] : undefined;
      const definition = isRecord(instance) && typeof instance.definitionId === "string" ? itemById[instance.definitionId] : undefined;
      if (!definition || !canEquipItemToSlot(definition, slot)) return false;
    }
    if (Object.values(equipment.slots).filter((candidate) => candidate === instanceId).length > 1) return false;
  }
  return true;
}

export function isGameSaveV15(value: unknown): value is GameSaveV15 {
  return isModernSaveScaffold(value, 15) && validateInventoryBoundary(value as Record<string, unknown>, 15);
}

export function isGameSaveV16(value: unknown): value is GameSaveV16 {
  return isModernSaveScaffold(value, 16) && validateInventoryBoundary(value as Record<string, unknown>, 16);
}

export function isGameSaveV17(value: unknown): value is GameSaveV17 {
  return isModernSaveScaffold(value, 17) && validateInventoryBoundary(value as Record<string, unknown>, 17);
}

export function isGameSaveV18(value: unknown): value is GameSaveV18 {
  if (!isModernSaveScaffold(value, 18) || !validateInventoryBoundary(value as Record<string, unknown>, 17)) return false;
  const raw = value as Record<string, unknown>;
  return Boolean(raw.professions && typeof raw.professions === "object" && raw.mining && typeof raw.mining === "object");
}
