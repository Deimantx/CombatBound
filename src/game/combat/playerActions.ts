import type { HunterCombatStats } from "../equipment/derivedStats";
import type { GameState } from "../gameState";
import { combatBalance } from "./combatBalance";
import type {
  CombatContext,
  ActionValidationReason,
  PlayerActionDefinition,
} from "./combatTypes";
import { getBarrierAmount } from "./combatEffects";
import { getDefensiveEquipmentContext } from "../equipment/defensiveEquipment";
import { isCombatAbilityLoadoutActionKind } from "../combatAbilities/combatAbilityTypes";
import { weaponSkillDefinitions } from "../data/weaponSkills";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { getProficiencyLevel } from "../progression/proficiencyProgression";
import { isMagicArtKnown } from "../magicArts/magicArtLogic";
import { isPlayerStunned } from "./combatCrowdControl";

export const defensiveActionDefinitions: PlayerActionDefinition[] = [
  {
    id: "defense.guard",
    kind: "defensive",
    name: "Guard",
    description: "Raise your shield to improve Block Chance and Block Effect.",
    icon: "shield",
    targetMode: "self",
    cooldown: 4,
    globalCooldown: "standard",
    resourceCost: { stamina: 20 },
    requirements: { requiresShield: true },
  },
  {
    id: "defense.evasive-step",
    kind: "defensive",
    name: "Evasive Step",
    description:
      "A short movement window that improves Evasion Rating.",
    icon: "footprints",
    targetMode: "self",
    cooldown: 4,
    globalCooldown: "standard",
    resourceCost: { stamina: 20 },
    requirements: { minimumLightMediumArmorPieces: 2 },
  },
  {
    id: "defense.brace",
    kind: "defensive",
    name: "Brace",
    description:
      "Brace behind your armour to improve Armour.",
    icon: "shield-check",
    targetMode: "self",
    cooldown: 5,
    globalCooldown: "standard",
    resourceCost: { stamina: 25 },
    requirements: { minimumHeavyArmorPieces: 2 },
  },
];

export const basicAttackAction: PlayerActionDefinition = {
  id: "basic.weapon-attack",
  kind: "basic-attack",
  name: "Weapon Attack",
  description: "Background attack performed by the equipped weapon.",
  icon: "sword",
  targetMode: "selected-enemy",
  cooldown: 0,
  globalCooldown: "none",
};
export const potionAction: PlayerActionDefinition = {
  id: "consumable.healing-potion",
  kind: "consumable",
  name: "Healing Potion",
  description: "Restore health during combat.",
  icon: "heart",
  targetMode: "self",
  cooldown: 5,
  globalCooldown: "none",
  sourceItemId: "item.healing-potion",
};

export const weaponSkillActionDefinitions: PlayerActionDefinition[] =
  weaponSkillDefinitions.map((skill) => ({
    id: skill.id,
    kind: "weapon-skill" as const,
    name: skill.name,
    description: skill.description,
    icon: skill.icon,
    targetMode: "selected-enemy" as const,
    cooldown: skill.cooldownSeconds,
    globalCooldown: skill.globalCooldown,
    resourceCost: { stamina: skill.staminaCost },
    sourceWeaponSkillId: skill.id,
  }));

export function getActiveAbilityActionDefinitions() {
  return [...defensiveActionDefinitions, ...weaponSkillActionDefinitions];
}

export function getPlayerActionDefinitions(
  game: GameState,
  context: CombatContext,
): PlayerActionDefinition[] {
  const magicArts = Object.values(context.magicArts ?? {}).map((art) => ({
    id: art.id,
    kind: "magic-art" as const,
    name: art.name,
    description: art.description,
    icon: art.icon,
    targetMode: art.targetMode,
    cooldown: art.cooldownSeconds,
    globalCooldown: "standard" as const,
    resourceCost: { mana: art.manaCost },
    sourceMagicArtId: art.id,
  }));
  return [
    basicAttackAction,
    ...magicArts,
    ...getActiveAbilityActionDefinitions(),
    potionAction,
  ];
}

export function getActionById(
  game: GameState,
  actionId: string,
  context: CombatContext,
) {
  return getPlayerActionDefinitions(game, context).find(
    (action) => action.id === actionId,
  );
}

export function isCombatAbilityLoadoutAction(action: PlayerActionDefinition) {
  return isCombatAbilityLoadoutActionKind(action.kind);
}

export interface ActionValidationResult {
  valid: boolean;
  reason?: ActionValidationReason;
  action?: PlayerActionDefinition;
  targetId?: string;
}

export interface EffectiveActionCost {
  mana: number;
  stamina: number;
}

export function getEffectivePlayerActionCost(
  game: GameState,
  action: PlayerActionDefinition,
  _stats: HunterCombatStats,
  context: CombatContext,
): EffectiveActionCost {
  if (!action.sourceMagicArtId)
    return {
      mana: action.resourceCost?.mana ?? 0,
      stamina: action.resourceCost?.stamina ?? 0,
    };
  if (action.sourceMagicArtId) {
    const art = context.magicArts?.[action.sourceMagicArtId];
    return { mana: art?.manaCost ?? action.resourceCost?.mana ?? 0, stamina: 0 };
  }
  return { mana: action.resourceCost?.mana ?? 0, stamina: action.resourceCost?.stamina ?? 0 };
}

export function validatePlayerAction(
  game: GameState,
  actionId: string,
  stats: HunterCombatStats,
  context: CombatContext,
): ActionValidationResult {
  const action = getActionById(game, actionId, context);
  const combat = game.combat;
  if (combat.phase !== "active")
    return { valid: false, reason: "combat-inactive", action };
  if (!action) return { valid: false, reason: "combat-inactive" };
  if (action.kind !== "consumable" && isPlayerStunned(combat, context.effects))
    return { valid: false, reason: "stunned", action };
  if (action.kind === "magic-art" && !isMagicArtKnown(game.magicArts ?? { knownArtIds: [] }, action.id))
    return { valid: false, reason: "magic-art-not-known", action };
  if (
    isCombatAbilityLoadoutAction(action) &&
    !game.combatAbilities.slots.includes(action.id)
  )
    return { valid: false, reason: "ability-not-equipped", action };
  if (action.sourceWeaponSkillId) {
    const skill = weaponSkillDefinitions.find(
      (candidate) => candidate.id === action.sourceWeaponSkillId,
    );
    if (!skill) return { valid: false, reason: "weapon-requirement", action };
    if (getEquippedWeaponProficiency(game.equipment, game.inventory) !== skill.proficiencyId)
      return { valid: false, reason: "weapon-requirement", action };
    if (
      combatBalance.enforceWeaponSkillLevelRequirements &&
      getProficiencyLevel(game.progression, skill.unlock.proficiencyId) <
        skill.unlock.level
    )
      return {
        valid: false,
        reason: "proficiency-level-requirement",
        action,
      };
  }
  if (combat.globalCooldownRemaining > 0 && action.globalCooldown !== "none")
    return { valid: false, reason: "global-cooldown", action };
  if ((combat.actionCooldowns[action.id] ?? 0) > 0)
    return { valid: false, reason: "action-cooldown", action };
  const cost = getEffectivePlayerActionCost(game, action, stats, context);
  const mana = cost.mana;
  const stamina = cost.stamina;
  if (combat.mana < mana)
    return { valid: false, reason: "insufficient-mana", action };
  if (combat.stamina < stamina)
    return { valid: false, reason: "insufficient-stamina", action };
  const target = combat.enemies.find(
    (enemy) => enemy.instanceId === combat.selectedEnemyInstanceId,
  );
  if (action.targetMode === "selected-enemy" && !target)
    return { valid: false, reason: "no-target", action };
  if (action.targetMode === "selected-enemy" && target?.defeated)
    return {
      valid: false,
      reason: "target-defeated",
      action,
      targetId: target.instanceId,
    };
  if (action.id === potionAction.id) {
    if ((game.inventory.stackables[potionAction.sourceItemId!] ?? 0) <= 0)
      return { valid: false, reason: "consumable-missing", action };
    if (combat.playerHp >= (stats.maxLife ?? 0))
      return { valid: false, reason: "full-health", action };
  }
  if (action.requirements) {
    const equipment = getDefensiveEquipmentContext(game.equipment, game.inventory);
    if (action.requirements.requiresShield && !equipment.shieldEquipped)
      return { valid: false, reason: "equipment-requirement", action };
    if (
      (action.requirements.minimumLightMediumArmorPieces ?? 0) >
      equipment.lightArmorPieces + equipment.mediumArmorPieces
    )
      return { valid: false, reason: "equipment-requirement", action };
    if (
      (action.requirements.minimumHeavyArmorPieces ?? 0) >
      equipment.heavyArmorPieces
    )
      return { valid: false, reason: "equipment-requirement", action };
  }
  return { valid: true, action, targetId: target?.instanceId };
}

export function getActionManaCost(
  game: GameState,
  action: PlayerActionDefinition,
  context: CombatContext,
) {
  return getEffectivePlayerActionCost(
    game,
    action,
    {} as HunterCombatStats,
    context,
  ).mana;
}

export const standardGlobalCooldown = combatBalance.standardGlobalCooldown;

export function reasonLabel(reason?: ActionValidationReason) {
  if (reason === "weapon-requirement") return "REQUIRES ONE-HANDED SWORD";
  if (reason === "proficiency-level-requirement") return "REQUIRES PROFICIENCY LEVEL";
  return reason ? reason.replaceAll("-", " ").toUpperCase() : "READY";
}

export function actionBarrier(game: GameState, context: CombatContext) {
  return getBarrierAmount(game.combat.playerEffects, context.effects);
}
