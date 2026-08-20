import { applyEffect } from "../combat/combatEffects";
import type { GameState } from "../gameState";
import type {
  CombatContext,
  CombatState,
  CombatSourceCategory,
  CombatantRef,
  EnemyCombatInstance,
} from "../combat/combatTypes";
import type { DamagePacket } from "../combat/combatDamage";
import type {
  EnemyTraitAssignment,
  EnemyTraitCondition,
  EnemyTraitDefinition,
  EnemyTraitEvent,
  EnemyTraitMechanic,
  EnemyTraitRuntimeEntry,
  EnemyTraitRuntimeState,
  TraitDamageModifierMechanic,
  TraitStatModifier,
} from "./enemyTraitTypes";
import { enemyTraitById } from "../data/enemyTraits";
import { nextCombatRandom } from "../combat/combatRng";

const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function createEnemyTraitRuntimeState(assignments: readonly EnemyTraitAssignment[] = []): EnemyTraitRuntimeState {
  const byTraitId: EnemyTraitRuntimeState["byTraitId"] = {};
  for (const assignment of assignments) byTraitId[assignment.traitId] = createEnemyTraitRuntimeEntry();
  return { elapsedSeconds: 0, byTraitId };
}

export function createEnemyTraitRuntimeEntry(): EnemyTraitRuntimeEntry {
  return { counters: {}, stacks: {}, timers: {}, flags: {}, values: {} };
}

export function normalizeEnemyTraitRuntimeState(value: unknown): EnemyTraitRuntimeState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createEnemyTraitRuntimeState();
  const raw = value as Record<string, unknown>;
  const rawEntries = raw.byTraitId && typeof raw.byTraitId === "object" && !Array.isArray(raw.byTraitId) ? raw.byTraitId as Record<string, unknown> : {};
  const byTraitId: EnemyTraitRuntimeState["byTraitId"] = {};
  for (const [traitId, rawEntry] of Object.entries(rawEntries)) {
    if (!traitId.startsWith("trait.") || !rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const entry = rawEntry as Record<string, unknown>;
    const map = (candidate: unknown) => candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate as Record<string, number> : {};
    const flags = entry.flags && typeof entry.flags === "object" && !Array.isArray(entry.flags) ? entry.flags as Record<string, boolean> : {};
    const values = entry.values && typeof entry.values === "object" && !Array.isArray(entry.values) ? entry.values as Record<string, number | string | boolean | null> : {};
    byTraitId[traitId as `trait.${string}`] = {
      counters: Object.fromEntries(Object.entries(map(entry.counters)).map(([key, number]) => [key, Math.max(0, finite(number))])),
      stacks: Object.fromEntries(Object.entries(map(entry.stacks)).map(([key, number]) => [key, Math.max(0, finite(number))])),
      timers: Object.fromEntries(Object.entries(map(entry.timers)).map(([key, number]) => [key, Math.max(0, finite(number))])),
      flags: Object.fromEntries(Object.entries(flags).filter(([, state]) => typeof state === "boolean")),
      values: Object.fromEntries(Object.entries(values).filter(([, state]) => state === null || typeof state === "string" || typeof state === "boolean" || typeof state === "number")),
    };
  }
  return { elapsedSeconds: Math.max(0, finite(raw.elapsedSeconds)), byTraitId };
}

function runtimeEntry(enemy: EnemyCombatInstance, traitId: `trait.${string}`): EnemyTraitRuntimeEntry {
  const runtime = normalizeEnemyTraitRuntimeState(enemy.traitRuntime);
  return runtime.byTraitId[traitId] ?? createEnemyTraitRuntimeEntry();
}

function runtimeState(enemy: EnemyCombatInstance): EnemyTraitRuntimeState {
  return normalizeEnemyTraitRuntimeState(enemy.traitRuntime);
}

export function getEnemyTraitDefinitions(enemy: EnemyCombatInstance, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById): Array<{ assignment: EnemyTraitAssignment; definition: EnemyTraitDefinition }> {
  const definition = enemyDefinitions[enemy.enemyId];
  if (!definition) return [];
  return definition.traits.flatMap((assignment) => {
    const resolved = definitions[assignment.traitId];
    return resolved ? [{ assignment, definition: resolved }] : [];
  });
}

function mechanicsForEnemy(enemy: EnemyCombatInstance, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }>, definitions: Record<string, EnemyTraitDefinition>) {
  const enemyDefinition = enemyDefinitions[enemy.enemyId];
  if (!enemyDefinition) return [] as Array<{ assignment: EnemyTraitAssignment; trait: EnemyTraitDefinition; mechanic: EnemyTraitMechanic; key: string }>;
  return enemyDefinition.traits.flatMap((assignment) => {
    const trait = definitions[assignment.traitId];
    const rank = trait?.ranks.find((candidate) => candidate.rank === assignment.rank);
    return rank?.mechanics.map((mechanic, index) => ({ assignment, trait, mechanic, key: `${assignment.traitId}:${assignment.rank}:${index}` })) ?? [];
  });
}

function conditionMatches(condition: EnemyTraitCondition | undefined, enemy: EnemyCombatInstance, playerHpFraction: number): boolean {
  if (!condition || condition.type === "always") return true;
  const selfFraction = enemy.maxHealth > 0 ? enemy.currentHealth / enemy.maxHealth : 0;
  if (condition.type === "self-hp-below") return selfFraction < condition.fraction;
  if (condition.type === "self-hp-at-most") return selfFraction <= condition.fraction;
  if (condition.type === "self-hp-above") return selfFraction > condition.fraction;
  if (condition.type === "self-hp-at-least") return selfFraction >= condition.fraction;
  if (condition.type === "player-hp-below") return playerHpFraction < condition.fraction;
  if (condition.type === "self-hp-above-player") return selfFraction > playerHpFraction;
  if (condition.type === "elapsed-at-least") return runtimeState(enemy).elapsedSeconds >= condition.seconds;
  const entry = runtimeEntry(enemy, "trait.state");
  if (condition.type === "state-flag") return entry.flags[condition.key] === (condition.value ?? true);
  if (condition.type === "state-counter-at-least") return (entry.counters[condition.key] ?? 0) >= condition.value;
  return false;
}

function modifierForStacks(modifiers: readonly TraitStatModifier[], stacks: number): TraitStatModifier[] {
  return modifiers.map((modifier) => ({ ...modifier, value: modifier.value * stacks }));
}

export function getEnemyTraitStatModifiers(
  enemy: EnemyCombatInstance,
  playerHpFraction = 1,
  enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {},
  definitions: Record<string, EnemyTraitDefinition> = enemyTraitById,
): TraitStatModifier[] {
  const result: TraitStatModifier[] = [];
  for (const { mechanic, key } of mechanicsForEnemy(enemy, enemyDefinitions, definitions)) {
    if (mechanic.type === "stat-modifier") result.push(...mechanic.modifiers);
    else if (mechanic.type === "conditional-stat-modifier" && conditionMatches(mechanic.condition, enemy, playerHpFraction)) result.push(...mechanic.modifiers);
    else if (mechanic.type === "linear-hp-stat-scaling") {
      const hp = enemy.maxHealth > 0 ? enemy.currentHealth / enemy.maxHealth : 0;
      const fraction = Math.max(0, Math.min(1, (1 - hp) / Math.max(.0001, 1 - mechanic.fullEffectAtHpFraction)));
      result.push({ stat: mechanic.stat, operation: mechanic.operation, value: mechanic.maxBonus * fraction });
    } else if (mechanic.type === "timed-stat-modifier" && (runtimeEntryForKey(enemy, key).timers[key] ?? 0) > 0) result.push(...mechanic.modifiers);
    else if (mechanic.type === "threshold-timed-stat-modifier" && (runtimeEntryForKey(enemy, key).timers[key] ?? 0) > 0) {
      result.push(...(mechanic.modifiers ?? (mechanic.damageBonus ? [ { stat: "attackDamage", operation: "increased", value: mechanic.damageBonus } ] : [])));
    } else if (mechanic.type === "stack-stat-modifier") {
      const entry = runtimeEntryForKey(enemy, key);
      const stacks = mechanic.activateAfter ? (entry.flags["active"] ? 1 : 0) : Math.min(mechanic.maxStacks, entry.stacks[mechanic.counterKey ?? key] ?? 0);
      if (stacks > 0) result.push(...modifierForStacks(mechanic.perStack, stacks));
    } else if (mechanic.type === "fight-stack") {
      const stacks = Math.min(mechanic.maxStacks, runtimeEntryForKey(enemy, key).stacks[key] ?? 0);
      if (stacks > 0) result.push(...modifierForStacks(mechanic.modifiers, stacks));
    } else if (mechanic.type === "fight-stage-damage") {
      const value = mechanic.stages.reduce((current, stage) => runtimeState(enemy).elapsedSeconds >= stage.afterSeconds ? stage.value : current, 0);
      if (value > 0) result.push({ stat: "attackDamage", operation: "increased", value });
    } else if (mechanic.type === "phase-stack") {
      const stacks = runtimeEntryForKey(enemy, key).stacks[key] ?? 0;
      if (stacks > 0) result.push(...modifierForStacks(mechanic.modifiers, stacks));
    } else if (mechanic.type === "lethal-intercept" && (runtimeEntryForKey(enemy, key).timers[key] ?? 0) > 0 && mechanic.damageBonus) {
      result.push({ stat: "attackDamage", operation: "increased", value: mechanic.damageBonus });
    }
  }
  return result;
}

function mechanicKeyTrait(key: string): `trait.${string}` {
  return key.slice(0, key.indexOf(":")) as `trait.${string}`;
}
function runtimeEntryForKey(enemy: EnemyCombatInstance, key: string) {
  return runtimeEntry(enemy, mechanicKeyTrait(key));
}

function traitEventMatches(mechanicEvent: EnemyTraitEvent, event: EnemyTraitEvent) {
  return mechanicEvent === event;
}

export function getEnemyTraitOutgoingDamageMultiplier(enemy: EnemyCombatInstance, packet: Pick<DamagePacket, "damageType" | "deliveryKind" | "sourceCategory">, playerHpFraction: number, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById, isNormalAttack = true): number {
  let increased = 0;
  let more = 1;
  for (const { mechanic, key } of mechanicsForEnemy(enemy, enemyDefinitions, definitions)) {
    if (mechanic.type === "outgoing-damage-modifier" && damageModifierMatches(mechanic, packet, enemy, playerHpFraction, key)) {
      const value = mechanic.stackKey ? mechanic.value * (runtimeEntryForKey(enemy, key).stacks[mechanic.stackKey] ?? 0) : mechanic.value;
      if (mechanic.operation === "increased" || mechanic.operation === "reduced") increased += mechanic.operation === "reduced" ? -value : value;
      else more *= mechanic.operation === "more" ? 1 + value : 1 - value;
    }
  }
  const pending = runtimeEntryForPending(enemy).values["pending-damage-multiplier"];
  if (isNormalAttack && typeof pending === "number") more *= pending;
  return Math.max(0, (1 + increased) * more);
}

export function getEnemyTraitIncomingDamageMultiplier(enemy: EnemyCombatInstance, packet: Pick<DamagePacket, "damageType" | "deliveryKind" | "sourceCategory">, playerHpFraction: number, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById): number {
  let increased = 0;
  let more = 1;
  for (const { mechanic, key } of mechanicsForEnemy(enemy, enemyDefinitions, definitions)) {
    if (mechanic.type !== "incoming-damage-modifier" || !damageModifierMatches(mechanic, packet, enemy, playerHpFraction, key)) continue;
    const value = mechanic.stackKey ? mechanic.value * (runtimeEntryForKey(enemy, key).stacks[mechanic.stackKey] ?? 0) : mechanic.value;
    if (mechanic.operation === "increased" || mechanic.operation === "reduced") increased += mechanic.operation === "reduced" ? -value : value;
    else more *= mechanic.operation === "more" ? 1 + value : 1 - value;
  }
  return Math.max(0, (1 + increased) * more);
}

function damageModifierMatches(mechanic: TraitDamageModifierMechanic, packet: Pick<DamagePacket, "damageType" | "deliveryKind" | "sourceCategory">, enemy: EnemyCombatInstance, playerHpFraction: number, key: string) {
  const adaptiveCategory = mechanic.stackKey === "adaptive" ? runtimeEntryForKey(enemy, key).values["adaptation-category"] : undefined;
  return (!mechanic.sourceCategory || mechanic.sourceCategory === packet.sourceCategory) && (!adaptiveCategory || adaptiveCategory === packet.sourceCategory) && (!mechanic.damageType || mechanic.damageType === packet.damageType) && (!mechanic.deliveryKind || mechanic.deliveryKind === (packet.deliveryKind ?? "hit")) && conditionMatches(mechanic.condition, enemy, playerHpFraction);
}

export function getEnemyTraitCriticalDamageResistance(enemy: EnemyCombatInstance, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  return Math.min(1, mechanicsForEnemy(enemy, enemyDefinitions, definitions).reduce((total, { mechanic, key }) => mechanic.type === "critical-damage-resistance" ? Math.min(mechanic.cap, total + (mechanic.cap === mechanic.perStack ? mechanic.perStack : mechanic.perStack * (runtimeEntryForKey(enemy, key).stacks[key] ?? 0))) : total, 0));
}

export function getEnemyTraitHealingReceivedMultiplier(enemy: EnemyCombatInstance, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  const reduction = mechanicsForEnemy(enemy, enemyDefinitions, definitions).reduce((total, { mechanic }) => mechanic.type === "healing-received-modifier" ? total + mechanic.value : total, 0);
  return Math.max(0, 1 - reduction);
}

export function prepareEnemyNormalAttack(enemy: EnemyCombatInstance, packet: DamagePacket, playerHpFraction: number, context: CombatContext, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = context.enemies, definitions: Record<string, EnemyTraitDefinition> = context.enemyTraits ?? enemyTraitById) {
  let nextPacket: DamagePacket = { ...packet, sourceCategory: packet.sourceCategory ?? "melee" };
  let multiplier = getEnemyTraitOutgoingDamageMultiplier(enemy, nextPacket, playerHpFraction, enemyDefinitions, definitions);
  let accuracy = nextPacket.attackerAccuracy;
  for (const { mechanic, key } of mechanicsForEnemy(enemy, enemyDefinitions, definitions)) {
    if (mechanic.type === "proc-damage-modifier" && !runtimeEntryForKey(enemy, key).flags[key] && (mechanic.chance >= 1 || nextCombatRandom(context.rng, "trait") < mechanic.chance)) multiplier *= mechanic.damageMultiplier;
  }
  const pendingAccuracy = runtimeEntryForPending(enemy).values["pending-accuracy"];
  if (typeof pendingAccuracy === "number") accuracy = (accuracy ?? 0) + pendingAccuracy;
  nextPacket = { ...nextPacket, damageMultiplier: (nextPacket.damageMultiplier ?? 1) * multiplier, attackerAccuracy: accuracy };
  return nextPacket;
}

function runtimeEntryForPending(enemy: EnemyCombatInstance) {
  const runtime = runtimeState(enemy);
  const assignment = Object.keys(runtime.byTraitId).find((traitId) => runtime.byTraitId[traitId as `trait.${string}`]?.values["pending-damage-multiplier"] !== undefined);
  return assignment ? runtime.byTraitId[assignment as `trait.${string}`]! : (runtime.byTraitId["trait.state"] ?? createEnemyTraitRuntimeEntry());
}

function updateEnemyRuntime(combat: CombatState, instanceId: string, update: (runtime: EnemyTraitRuntimeState) => EnemyTraitRuntimeState): CombatState {
  return combat.enemy?.instanceId === instanceId ? { ...combat, enemy: { ...combat.enemy, traitRuntime: update(normalizeEnemyTraitRuntimeState(combat.enemy.traitRuntime)) } } : combat;
}

export interface EnemyTraitEventPayload {
  sourceCategory?: CombatSourceCategory;
  critical?: boolean;
  successful?: boolean;
  actualDamage?: number;
  abilityId?: string;
  phaseId?: string;
}

export function processEnemyTraitEvent(game: GameState, instanceId: string, event: EnemyTraitEvent, payload: EnemyTraitEventPayload, context: CombatContext): GameState {
  const enemy = game.combat.enemy?.instanceId === instanceId ? game.combat.enemy : undefined;
  if (!enemy || enemy.defeated) return game;
  let combat = updateEnemyRuntime(game.combat, instanceId, (runtime) => {
    const next = { ...runtime, byTraitId: { ...runtime.byTraitId } };
    const definition = context.enemies[enemy.enemyId];
    for (const assignment of definition?.traits ?? []) {
      const trait = (context.enemyTraits ?? enemyTraitById)[assignment.traitId];
      const rank = trait?.ranks.find((candidate) => candidate.rank === assignment.rank);
      const entry = { ...createEnemyTraitRuntimeEntry(), ...(next.byTraitId[assignment.traitId] ?? {}) };
      entry.counters = { ...entry.counters }; entry.stacks = { ...entry.stacks }; entry.timers = { ...entry.timers }; entry.flags = { ...entry.flags }; entry.values = { ...entry.values };
      rank?.mechanics.forEach((mechanic, index) => {
        const key = `${assignment.traitId}:${assignment.rank}:${index}`;
        if (mechanic.type === "timed-stat-modifier" && traitEventMatches(mechanic.event, event) && (!mechanic.sourceCategory || mechanic.sourceCategory === payload.sourceCategory)) entry.timers[key] = mechanic.durationSeconds ?? 0;
        if (mechanic.type === "threshold-timed-stat-modifier" && event === "enemy-hp-threshold-crossed") entry.timers[key] = mechanic.durationSeconds ?? 0;
        if (mechanic.type === "stack-stat-modifier" && traitEventMatches(mechanic.event, event) && (!mechanic.sourceCategory || mechanic.sourceCategory === payload.sourceCategory)) {
          const counter = mechanic.counterKey ?? key;
          if (!mechanic.sourceCategory && event === "enemy-damaged" && payload.sourceCategory) {
            const prior = entry.values["adaptation-category"];
            entry.counters[counter] = prior === payload.sourceCategory ? (entry.counters[counter] ?? 0) + 1 : 1;
            entry.values["adaptation-category"] = payload.sourceCategory;
            entry.stacks.adaptive = entry.counters[counter] >= mechanic.maxStacks ? 1 : 0;
          } else entry.counters[counter] = (entry.counters[counter] ?? 0) + 1;
          if (mechanic.activateAfter && entry.counters[counter] >= mechanic.activateAfter) entry.flags.active = true;
          else if (!mechanic.activateAfter) entry.stacks[counter] = Math.min(mechanic.maxStacks, (entry.stacks[counter] ?? 0) + 1);
        }
        if (mechanic.type === "next-attack-modifier" && traitEventMatches(mechanic.event, event) && (!mechanic.sourceCategory || mechanic.sourceCategory === payload.sourceCategory) && (!mechanic.condition || conditionMatches(mechanic.condition, enemy, game.combat.maxPlayerHp > 0 ? game.combat.playerHp / game.combat.maxPlayerHp : 1))) {
          entry.values["pending-damage-multiplier"] = mechanic.damageMultiplier ?? 1;
          entry.values["pending-accuracy"] = mechanic.modifiers.filter((modifier) => modifier.stat === "accuracyRating").reduce((total, modifier) => total + modifier.value, 0);
          entry.values["pending-attack-key"] = key;
        }
        if (mechanic.type === "critical-damage-resistance" && event === "enemy-critical-hit-taken" && mechanic.cap > mechanic.perStack) entry.stacks[key] = Math.min(Math.floor(mechanic.cap / mechanic.perStack + .0001), (entry.stacks[key] ?? 0) + 1);
        if (mechanic.type === "critical-damage-resistance" && event === "enemy-critical-hit-taken" && mechanic.cap > mechanic.perStack) entry.counters[key] = (entry.counters[key] ?? 0) + 1;
        if (mechanic.type === "stack-stat-modifier" && mechanic.sourceCategory && payload.sourceCategory && mechanic.sourceCategory === payload.sourceCategory && mechanic.counterKey) entry.timers[mechanic.counterKey] = 10;
        if (mechanic.type === "phase-stack" && mechanic.event === event) entry.stacks[key] = (entry.stacks[key] ?? 0) + 1;
        if ((mechanic.type === "combat-ability-cooldown-on-ability-use" || mechanic.type === "combat-ability-cooldown-on-use") && traitEventMatches("enemy-combat-ability-resolved", event) && payload.abilityId) {
          const counter = `${key}:${payload.abilityId}`;
          entry.counters[counter] = (entry.counters[counter] ?? 0) + 1;
        }
      });
      next.byTraitId[assignment.traitId] = entry;
    }
    return next;
  });
  let next: GameState = { ...game, combat };
  const updated = next.combat.enemy?.instanceId === instanceId ? next.combat.enemy : undefined;
  if (!updated) return next;
  const definition = context.enemies[updated.enemyId];
  for (const assignment of definition?.traits ?? []) {
    const trait = (context.enemyTraits ?? enemyTraitById)[assignment.traitId];
    const rank = trait?.ranks.find((candidate) => candidate.rank === assignment.rank);
    for (const mechanic of rank?.mechanics ?? []) if (mechanic.type === "effect-proc" && traitEventMatches(mechanic.event, event) && conditionMatches(mechanic.condition, updated, game.combat.maxPlayerHp > 0 ? game.combat.playerHp / game.combat.maxPlayerHp : 1) && (mechanic.chance >= 1 || nextCombatRandom(context.rng, "trait") < mechanic.chance)) {
      // `source` identifies the entity that owns the applied effect. A trait
      // proc sourced by the enemy therefore targets the player by default.
      const source: CombatantRef = mechanic.source === "player" ? { kind: "player" } : { kind: "enemy", instanceId };
      const target: CombatantRef = mechanic.source === "player" ? { kind: "enemy", instanceId } : { kind: "player" };
      const effectDefinition = context.effects[mechanic.effectId];
      const targetEnemy = target.kind === "enemy" && next.combat.enemy?.instanceId === target.instanceId ? next.combat.enemy : undefined;
      const policy = targetEnemy ? getEnemyTraitEffectPolicy(targetEnemy, effectDefinition?.tags ?? [], context.enemies, context.enemyTraits, effectDefinition?.kind === "debuff" || effectDefinition?.tags.includes("harmful")) : { allow: true, durationMultiplier: 1 };
      const result = effectDefinition && policy.allow ? applyEffect(next.combat, effectDefinition, source, target, { rng: context.rng, durationMultiplier: policy.durationMultiplier }) : { combat: next.combat, instance: null };
      if (result.instance && result.outcome !== "rejected" && result.outcome !== "missing-target") {
        next.combat = result.combat;
        const eventId = next.combat.eventSequence + 1;
        const targetName = target.kind === "player" ? "you" : updated.displayName;
        const sourceName = source.kind === "player" ? "Your" : `${updated.displayName}'s`;
        const text = `${sourceName} ${trait?.name ?? "Trait"} applies ${effectDefinition.name} to ${targetName}.`;
        next.combat = {
          ...next.combat,
          eventSequence: eventId,
          log: [{ id: eventId, text, type: "enemy" as const, time: `T+${Math.floor(next.combat.session.elapsedSeconds)}s` }, ...next.combat.log].slice(0, 30),
          events: [...next.combat.events, { id: eventId, type: "effectApplied" as const, source, target, data: { effectId: mechanic.effectId, stacks: result.instance.stacks } }].slice(-100),
        };
      }
    }
    if (event === "enemy-damage-dealt" && (payload.actualDamage ?? 0) > 0) for (const mechanic of rank?.mechanics ?? []) if (mechanic.type === "damage-leech") {
      const healed = (payload.actualDamage ?? 0) * mechanic.fraction;
      if (next.combat.enemy?.instanceId === instanceId) next.combat = { ...next.combat, enemy: { ...next.combat.enemy, currentHealth: Math.min(next.combat.enemy.maxHealth, next.combat.enemy.currentHealth + healed) } };
    }
  }
  return next;
}

export function consumeEnemyNormalAttackEmpowerment(combat: CombatState, instanceId: string) {
  return updateEnemyRuntime(combat, instanceId, (runtime) => ({ ...runtime, byTraitId: Object.fromEntries(Object.entries(runtime.byTraitId).map(([traitId, entry]) => [traitId, entry ? { ...entry, values: { ...entry.values, "pending-damage-multiplier": null, "pending-attack-key": null } } : entry])) }));
}

export function advanceEnemyTraitRuntime(game: GameState, step: number, context: CombatContext): GameState {
  if (game.combat.phase !== "active") return game;
  let next = game;
  const original = game.combat.enemy;
  if (original && !original.defeated) {
    const delta = Math.max(0, finite(step));
    let enemy = next.combat.enemy?.instanceId === original.instanceId ? next.combat.enemy : original;
    let runtime = normalizeEnemyTraitRuntimeState(enemy.traitRuntime);
    runtime.elapsedSeconds += delta;
    for (const entry of Object.values(runtime.byTraitId)) if (entry) {
      for (const key of Object.keys(entry.timers)) entry.timers[key] = Math.max(0, entry.timers[key] - delta);
      if (entry.timers["magic-adaptation"] === 0) { entry.stacks["magic-adaptation"] = 0; entry.counters["magic-adaptation"] = 0; }
    }
    const definition = context.enemies[enemy.enemyId];
    for (const assignment of definition?.traits ?? []) {
      const trait = (context.enemyTraits ?? enemyTraitById)[assignment.traitId];
      const rank = trait?.ranks.find((candidate) => candidate.rank === assignment.rank);
      const entry = runtime.byTraitId[assignment.traitId] ?? createEnemyTraitRuntimeEntry();
      for (const mechanic of rank?.mechanics ?? []) if (mechanic.type === "fight-stack") {
        const key = `${assignment.traitId}:${assignment.rank}:${rank?.mechanics.indexOf(mechanic)}`;
        entry.stacks[key] = Math.min(mechanic.maxStacks, Math.floor(runtime.elapsedSeconds / mechanic.intervalSeconds));
      }
      for (const mechanic of rank?.mechanics ?? []) if (mechanic.type === "periodic-heal") {
        const amount = enemy.maxHealth * mechanic.maxLifeFractionPerSecond * delta;
        enemy = { ...enemy, currentHealth: Math.min(enemy.maxHealth, enemy.currentHealth + amount) };
      }
      runtime.byTraitId[assignment.traitId] = entry;
    }
    runtime.byTraitId = { ...runtime.byTraitId };
    next.combat = next.combat.enemy?.instanceId === enemy.instanceId ? { ...next.combat, enemy: { ...enemy, traitRuntime: runtime } } : next.combat;
  }
  return next;
}

export function applyEnemyTraitCombatStart(combat: CombatState, context: CombatContext): CombatState {
  let next = combat;
  const enemy = combat.enemy;
  if (enemy) {
    next = updateEnemyRuntime(next, enemy.instanceId, (runtime) => runtime);
    const definition = context.enemies[enemy.enemyId];
    for (const assignment of definition?.traits ?? []) {
      const trait = (context.enemyTraits ?? enemyTraitById)[assignment.traitId];
      const rank = trait?.ranks.find((candidate) => candidate.rank === assignment.rank);
      for (const mechanic of rank?.mechanics ?? []) if (mechanic.type === "threshold-barrier" && mechanic.threshold >= 1 && mechanic.barrierFraction) {
        const barrierDefinition = context.effects["effect.trait-barrier"];
        const result = barrierDefinition ? applyEffect(next, barrierDefinition, { kind: "enemy", instanceId: enemy.instanceId }, { kind: "enemy", instanceId: enemy.instanceId }, { absorbAmount: enemy.maxHealth * mechanic.barrierFraction, power: enemy.maxHealth * mechanic.barrierFraction, rng: context.rng }) : { combat: next, instance: null };
        next = result.instance ? result.combat : next;
      }
    }
    next = processEnemyTraitEvent({ ...({ combat: next } as GameState), combat: next } as GameState, enemy.instanceId, "combat-start", {}, context).combat;
  }
  return next;
}

export function applyEnemyTraitHealthTriggers(combat: CombatState, instanceId: string, previousHealth: number, context: CombatContext): CombatState {
  const enemy = combat.enemy?.instanceId === instanceId ? combat.enemy : undefined;
  if (!enemy || enemy.defeated) return combat;
  let next = combat;
  const oldFraction = enemy.maxHealth > 0 ? previousHealth / enemy.maxHealth : 0;
  const newFraction = enemy.maxHealth > 0 ? enemy.currentHealth / enemy.maxHealth : 0;
  const definition = context.enemies[enemy.enemyId];
  for (const assignment of definition?.traits ?? []) {
    const trait = (context.enemyTraits ?? enemyTraitById)[assignment.traitId];
    const rank = trait?.ranks.find((candidate) => candidate.rank === assignment.rank);
    const entry = runtimeEntry(enemy, assignment.traitId);
    for (const [index, mechanic] of (rank?.mechanics ?? []).entries()) {
      if (mechanic.type !== "threshold-heal" && mechanic.type !== "threshold-barrier" && mechanic.type !== "threshold-timed-stat-modifier") continue;
      if (mechanic.threshold <= 0 || !(oldFraction > mechanic.threshold && newFraction <= mechanic.threshold)) continue;
      const key = `${assignment.traitId}:${assignment.rank}:${index}`;
      if (mechanic.oncePerFight && entry.flags[key]) continue;
      if (mechanic.oncePerFight) entry.flags[key] = true;
      if (mechanic.type === "threshold-heal" && mechanic.healFraction && next.enemy?.instanceId === instanceId) next = { ...next, enemy: { ...next.enemy, currentHealth: Math.min(next.enemy.maxHealth, next.enemy.currentHealth + next.enemy.maxHealth * mechanic.healFraction) } };
      if (mechanic.type === "threshold-barrier" && mechanic.barrierFraction) {
        const amount = enemy.maxHealth * mechanic.barrierFraction;
        const barrierDefinition = context.effects["effect.trait-barrier"];
        const result = barrierDefinition ? applyEffect(next, barrierDefinition, { kind: "enemy", instanceId }, { kind: "enemy", instanceId }, { absorbAmount: amount, power: amount, rng: context.rng }) : { combat: next, instance: null };
        if (result.instance) next = result.combat;
      }
      if (mechanic.type === "threshold-timed-stat-modifier") entry.timers[key] = mechanic.durationSeconds ?? 0;
    }
    next = updateEnemyRuntime(next, instanceId, (runtime) => ({ ...runtime, byTraitId: { ...runtime.byTraitId, [assignment.traitId]: entry } }));
  }
  return next;
}

export function interceptEnemyLethalDamage(combat: CombatState, instanceId: string, requestedDamage: number, context: CombatContext) {
  const enemy = combat.enemy?.instanceId === instanceId ? combat.enemy : undefined;
  if (!enemy || enemy.defeated || enemy.currentHealth - requestedDamage > 0) return null;
  const definition = context.enemies[enemy.enemyId];
  for (const assignment of definition?.traits ?? []) {
    const trait = (context.enemyTraits ?? enemyTraitById)[assignment.traitId];
    const rank = trait?.ranks.find((candidate) => candidate.rank === assignment.rank);
    for (const [index, mechanic] of (rank?.mechanics ?? []).entries()) if (mechanic.type === "lethal-intercept") {
      const key = `${assignment.traitId}:${assignment.rank}:${index}`;
      const entry = runtimeEntry(enemy, assignment.traitId);
      if (mechanic.oncePerFight && entry.flags[key]) continue;
      entry.flags[key] = true;
      entry.timers[key] = mechanic.durationSeconds ?? 0;
      const updated = updateEnemyRuntime(combat, instanceId, (runtime) => ({ ...runtime, byTraitId: { ...runtime.byTraitId, [assignment.traitId]: entry } }));
      return { combat: updated.enemy?.instanceId === instanceId ? { ...updated, enemy: { ...updated.enemy, currentHealth: 1, defeated: false, preparedAbility: null } } : updated, appliedDamage: Math.max(0, enemy.currentHealth - 1), preventedLethalDamage: Math.max(0, requestedDamage - Math.max(0, enemy.currentHealth - 1)) };
    }
  }
  return null;
}

export function isEnemyCombatAbilityInterruptionImmune(enemy: EnemyCombatInstance, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  return mechanicsForEnemy(enemy, enemyDefinitions, definitions).some(({ mechanic }) => mechanic.type === "combat-ability-interruption-immunity");
}

export function getEnemyTraitEffectPolicy(enemy: EnemyCombatInstance, effectTags: readonly string[], enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById, isHarmful = true) {
  const hardCc = effectTags.includes("hard-cc");
  const immune = hardCc && mechanicsForEnemy(enemy, enemyDefinitions, definitions).some(({ mechanic }) => mechanic.type === "hard-cc-immunity");
  const durationMultiplier = isHarmful ? mechanicsForEnemy(enemy, enemyDefinitions, definitions).reduce((value, { mechanic }) => mechanic.type === "effect-duration-modifier" && !hardCc ? value * (mechanic.value ?? 1) : value, 1) : 1;
  return { allow: !immune, durationMultiplier };
}

export function reduceEnemyCombatAbilityCooldowns(combat: CombatState, instanceId: string, fraction: number, exceptAbilityId?: string) {
  return combat.enemy?.instanceId === instanceId ? { ...combat, enemy: { ...combat.enemy, abilityCooldowns: Object.fromEntries(Object.entries(combat.enemy.abilityCooldowns ?? {}).map(([abilityId, remaining]) => [abilityId, abilityId === exceptAbilityId ? remaining : Math.max(0, remaining * (1 - fraction))])) } } : combat;
}

export function getEnemyCombatAbilityCooldownMultiplier(enemy: EnemyCombatInstance, abilityId: string, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  let multiplier = 1;
  const hpFraction = enemy.maxHealth > 0 ? enemy.currentHealth / enemy.maxHealth : 0;
  for (const { mechanic, key } of mechanicsForEnemy(enemy, enemyDefinitions, definitions)) {
    if (mechanic.type === "combat-ability-cooldown-static") multiplier *= 1 - mechanic.value;
    if (mechanic.type === "combat-ability-cooldown-below-threshold" && hpFraction < (mechanic.threshold ?? 0)) multiplier *= 1 - mechanic.value;
    if (mechanic.type === "combat-ability-cooldown-on-ability-use" || mechanic.type === "combat-ability-cooldown-on-use") {
      const uses = runtimeEntryForKey(enemy, key).counters[`${key}:${abilityId}`] ?? 0;
      multiplier *= 1 - Math.min(mechanic.cap ?? 1, uses * mechanic.value);
    }
  }
  return Math.max(0, multiplier);
}

export function getEnemyCombatAbilityCooldownReduction(enemy: EnemyCombatInstance, kind: "normal-hit" | "ability-hit", enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  return mechanicsForEnemy(enemy, enemyDefinitions, definitions).reduce((total, { mechanic }) => (kind === "normal-hit" && mechanic.type === "combat-ability-cooldown-on-normal-hit") || (kind === "ability-hit" && mechanic.type === "combat-ability-cooldown-on-ability-hit") ? total + mechanic.value : total, 0);
}

export function getEnemyCombatAbilityDamageMultiplier(enemy: EnemyCombatInstance, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  return mechanicsForEnemy(enemy, enemyDefinitions, definitions).reduce((multiplier, { mechanic }) => mechanic.type === "combat-ability-damage-modifier" ? multiplier * (1 + mechanic.value) : multiplier, 1);
}

export function getEnemyTraitReflectionFraction(enemy: EnemyCombatInstance, sourceCategory: CombatSourceCategory, enemyDefinitions: Record<string, { traits: readonly EnemyTraitAssignment[] }> = {}, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  return mechanicsForEnemy(enemy, enemyDefinitions, definitions).reduce((fraction, { mechanic }) => mechanic.type === "damage-reflection" && mechanic.sourceCategory === sourceCategory ? fraction + mechanic.fraction : fraction, 0);
}
