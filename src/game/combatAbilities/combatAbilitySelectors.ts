import { basicAttackAction, getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { techniqueDefinitions } from "../data/techniques";
import { weaponSkillById } from "../data/weaponSkills";
import type { GameState } from "../gameState";
import type { TechniqueId } from "../combat/combatTypes";
import type { CombatAbilityCatalogueEntry } from "./combatAbilityTypes";
import { getDefensiveEquipmentContext } from "../equipment/defensiveEquipment";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { getProficiencyLevel } from "../progression/proficiencyProgression";
import { combatBalance } from "../combat/combatBalance";

export function getKnownCombatAbilities(
  _game: GameState,
): CombatAbilityCatalogueEntry[] {
  return [
    {
      kind: "core",
      id: basicAttackAction.id,
      name: basicAttackAction.name,
      description: basicAttackAction.description,
      icon: basicAttackAction.icon ?? "sword",
    },
    ...getActiveAbilityActionDefinitions().map((action) => {
      const skill = action.sourceWeaponSkillId
        ? weaponSkillById[action.sourceWeaponSkillId]
        : undefined;
      return {
      kind: "active-action" as const,
      actionId: action.id,
      category: action.kind === "weapon-skill" ? "weapon-skill" as const : "active-defense" as const,
      name: action.name,
      description: action.description,
      icon: action.icon ?? "shield",
        proficiencyId: skill?.proficiencyId,
        plannedUnlockLevel: skill?.unlock.level,
      };
    }),
    ...getKnownTechniques(_game).map((technique) => ({
      kind: "technique" as const,
      techniqueId: technique.id,
      name: technique.name,
      description: technique.description,
      icon: "spark",
    })),
  ];
}

export function getKnownTechniques(_game: GameState) {
  return (Object.keys(techniqueDefinitions) as TechniqueId[]).map(
    (id) => techniqueDefinitions[id],
  );
}

export function getCombatAbilityEquippedSlot(
  game: GameState,
  actionId: string,
) {
  return game.combatAbilities.activeSlots.findIndex((id) => id === actionId);
}

export function getTechniqueEquippedSlot(
  game: GameState,
  techniqueId: TechniqueId,
) {
  return game.combatAbilities.techniqueSlots.findIndex(
    (id) => id === techniqueId,
  );
}

export function isCombatAbilityEquipped(game: GameState, actionId: string) {
  return getCombatAbilityEquippedSlot(game, actionId) >= 0;
}

export function isTechniqueEquipped(game: GameState, techniqueId: TechniqueId) {
  return getTechniqueEquippedSlot(game, techniqueId) >= 0;
}

export function canToggleTechnique(game: GameState, techniqueId: TechniqueId) {
  return Boolean(techniqueDefinitions[techniqueId]) &&
    game.combat.phase === "active" &&
    isTechniqueEquipped(game, techniqueId);
}

export interface CombatAbilityAvailability {
  usable: boolean;
  label: string;
  requirement?: string;
}

export function getCombatAbilityAvailability(
  game: GameState,
  actionId: string,
): CombatAbilityAvailability {
  const action = getActiveAbilityActionDefinitions().find(
    (candidate) => candidate.id === actionId,
  );
  if (!action) return { usable: false, label: "UNKNOWN ABILITY" };
  const skill = action.sourceWeaponSkillId
    ? weaponSkillById[action.sourceWeaponSkillId]
    : undefined;
  if (skill) {
    const equippedWeapon = getEquippedWeaponProficiency(game.equipment);
    if (equippedWeapon !== skill.proficiencyId)
      return {
        usable: false,
        label: `REQUIRES ${skill.proficiencyId.replaceAll("-", " ").toUpperCase()}`,
        requirement: `${skill.proficiencyId.replaceAll("-", " ")} equipped`,
      };
    const level = getProficiencyLevel(game.progression, skill.unlock.proficiencyId);
    if (combatBalance.enforceWeaponSkillLevelRequirements && level < skill.unlock.level)
      return {
        usable: false,
        label: `REQUIRES ${skill.proficiencyId.replaceAll("-", " ").toUpperCase()} LV ${skill.unlock.level}`,
        requirement: `Current Lv ${level} / required Lv ${skill.unlock.level}`,
      };
    return {
      usable: true,
      label: "PROTOTYPE · UNLOCKED FOR TESTING",
      requirement: `${skill.proficiencyId.replaceAll("-", " ")} equipped · planned Lv ${skill.unlock.level}`,
    };
  }
  const equipment = getDefensiveEquipmentContext(game.equipment);
  const requirements = action.requirements;
  if (requirements?.requiresShield && !equipment.shieldEquipped)
    return {
      usable: false,
      label: "REQUIRES SHIELD",
      requirement: "Shield equipped",
    };
  if (
    (requirements?.minimumLightMediumArmorPieces ?? 0) >
    equipment.lightArmorPieces + equipment.mediumArmorPieces
  ) {
    const required = requirements?.minimumLightMediumArmorPieces ?? 0;
    return {
      usable: false,
      label: `REQUIRES ${required} LIGHT/MEDIUM ARMOR`,
      requirement: `${equipment.lightArmorPieces + equipment.mediumArmorPieces} / ${required} qualifying pieces`,
    };
  }
  if (
    (requirements?.minimumHeavyArmorPieces ?? 0) >
    equipment.heavyArmorPieces
  ) {
    const required = requirements?.minimumHeavyArmorPieces ?? 0;
    return {
      usable: false,
      label: `REQUIRES ${required} HEAVY ARMOR`,
      requirement: `${equipment.heavyArmorPieces} / ${required} heavy pieces`,
    };
  }
  return { usable: true, label: "READY WITH CURRENT BUILD" };
}
