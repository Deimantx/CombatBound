import { applyEffectById } from "./combatEffects";
import { combatEvent } from "./combatRuntime";
import type { EffectApplyOptions } from "./combatEffects";
import type { CombatContext, CombatantRef } from "./combatTypes";
import type { GameState } from "../gameState";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { getWeaponBlockEffectHooks } from "../progression/perkProgression";
import { perkById } from "../data/proficiencyPerks";
import { getEnemyTraitEffectPolicy } from "../enemyTraits/enemyTraitRuntime";

export interface ApplyEffectToGameOptions extends EffectApplyOptions {
  secondaryOnly?: boolean;
  targetMode?: "source" | "target";
  requireHpDamage?: boolean;
}

export function applyEffectToGame(game: GameState, effectId: string, source: CombatantRef, target: CombatantRef, context: CombatContext, options: ApplyEffectToGameOptions = {}) {
  const definition = context.effects[effectId];
  if (!definition) return game;
  const enemy = target.kind === "enemy" ? game.combat.enemies.find((candidate) => candidate.instanceId === target.instanceId) : undefined;
  const policy = enemy ? getEnemyTraitEffectPolicy(enemy, definition.tags, context.enemies, context.enemyTraits, definition.kind === "debuff" || definition.tags.includes("harmful")) : { allow: true, durationMultiplier: 1 };
  if (!policy.allow) return game;
  const result = applyEffectById(game.combat, effectId, context.effects, source, target, { ...options, durationMultiplier: (options.durationMultiplier ?? 1) * policy.durationMultiplier, rng: context.rng });
  if (!result.instance || result.outcome === "rejected" || result.outcome === "missing-target") return game;
  const eventType = result.outcome === "refreshed" ? "effectRefreshed" : result.outcome === "stacked" ? "effectStacked" : "effectApplied";
  const suffix = result.instance.stacks > 1 ? ` x${result.instance.stacks}` : "";
  return {
    ...game,
    combat: combatEvent(result.combat, {
      text: `${definition.name}${suffix} applied to ${target.kind === "player" ? "you" : (game.combat.enemies.find((enemy) => enemy.instanceId === target.instanceId)?.displayName ?? "target")}.`,
      type: source.kind === "player" ? "player" : "enemy",
      eventType,
      source,
      target,
      data: { effectId, stacks: result.instance.stacks },
    }),
  };
}

/** Applies player-owned Block hooks once for one qualifying incoming event. */
export function applyPlayerSuccessfulBlockHooks(game: GameState, context: CombatContext) {
  const proficiencyId = getEquippedWeaponProficiency(game.equipment, game.inventory);
  if (!proficiencyId) return game;
  let next = game;
  for (const hook of getWeaponBlockEffectHooks(next.progression, proficiencyId, perkById)) {
    next = applyEffectToGame(next, hook.effectId, { kind: "player" }, { kind: "player" }, context, { durationBonusSeconds: hook.durationSeconds, sourceProficiencyId: proficiencyId });
  }
  return next;
}
