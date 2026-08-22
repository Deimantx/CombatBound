import { itemById } from "../data/items";
import { effectById } from "../data/effects";
import { getBarrierAmount } from "../combat/combatEffects";
import { getItemInstance } from "../items/itemOwnership";
import { resolveWeaponMechanicParameters } from "./weaponMechanicResolver";
import { GREATSWORD_HEAVY_RHYTHM_COUNTER_KEY, RHYTHM_COUNTER_KEY, RIPOSTE_TIMER_KEY, type BasicWeaponAttackSummary, type BasicWeaponAttemptState, type PlayerWeaponRuntimeState, type WeaponMechanicParameters } from "./weaponMechanicTypes";
import type { EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { ItemInstanceId } from "../items/itemTypes";
import type { CombatState } from "../combat/combatTypes";
import type { GameState } from "../gameState";
import type { DamagePacket, DamageResolution } from "../combat/combatDamage";

const value = (parameters: WeaponMechanicParameters | undefined, id: string, key: string, fallback = 0) => parameters?.mechanics[id]?.[key] ?? fallback;
const counter = (combat: CombatState, id: string) => Math.max(0, Math.floor(combat.weaponRuntime.counters[id] ?? 0));
const withCounter = (runtime: PlayerWeaponRuntimeState, id: string, next: number) => ({ ...runtime, counters: { ...runtime.counters, [id]: Math.max(0, Math.floor(next)) } });
const withTimer = (runtime: PlayerWeaponRuntimeState, id: string, next: number) => ({ ...runtime, timers: { ...runtime.timers, [id]: Math.max(0, next) } });
const resolveDaggerCombo = (parameters: WeaponMechanicParameters, successful: boolean, attempt: BasicWeaponAttemptState, baseCombo: number) => {
  if (!successful) return 0;
  const comboId = "weapon-mechanic.dagger-combo";
  const additionalCombo = attempt.special === "opportunist"
    ? value(parameters, "weapon-mechanic.dagger-opportunist", "additionalCombo")
    : 0;
  return Math.min(value(parameters, comboId, "maxStacks", 5), baseCombo + additionalCombo);
};

export function createInitialPlayerWeaponRuntime(): PlayerWeaponRuntimeState { return { equippedInstanceId: null, counters: {}, timers: {} }; }
export function resetPlayerWeaponRuntime(runtime: PlayerWeaponRuntimeState | undefined, equippedInstanceId: ItemInstanceId | null = null): PlayerWeaponRuntimeState { return { equippedInstanceId, counters: {}, timers: {} }; }

export function equippedWeaponMechanic(game: Pick<GameState, "equipment" | "inventory">): { instanceId: ItemInstanceId; parameters: WeaponMechanicParameters } | null {
  const instanceId = game.equipment.slots.weapon;
  if (!instanceId) return null;
  const instance = getItemInstance(game.inventory, instanceId);
  const definition = instance ? itemById[instance.definitionId] : undefined;
  const parameters = instance && definition ? resolveWeaponMechanicParameters(definition, instance) : null;
  return parameters ? { instanceId, parameters } : null;
}

export function syncPlayerWeaponRuntime(combat: CombatState, equipment: EquipmentState, inventory: InventoryState) {
  const equippedInstanceId = equipment.slots.weapon ?? null;
  return combat.weaponRuntime.equippedInstanceId === equippedInstanceId ? combat.weaponRuntime : resetPlayerWeaponRuntime(combat.weaponRuntime, equippedInstanceId);
}

export function advanceWeaponMechanicRuntime(combat: CombatState, step: number, equipment: EquipmentState, inventory: InventoryState): CombatState {
  const runtime = syncPlayerWeaponRuntime(combat, equipment, inventory);
  const seconds = Math.max(0, step);
  const timers = Object.fromEntries(Object.entries(runtime.timers).map(([id, remaining]) => [id, Math.max(0, remaining - seconds)]));
  return { ...combat, weaponRuntime: { ...runtime, timers } };
}

export function weaponMechanicStatModifiers(combat: CombatState, parameters: WeaponMechanicParameters | undefined) {
  if (!parameters) return [];
  const modifiers = [] as Array<{ stat: "accuracyRating" | "moreAttackSpeed" | "attackDamage" | "criticalStrikeChance"; operation: "flat" | "more" | "increased"; value: number }>;
  const rhythm = parameters.rhythm;
  if (rhythm) {
    const stacks = Math.min(rhythm.maxStacks, counter(combat, RHYTHM_COUNTER_KEY));
    modifiers.push({ stat: "accuracyRating", operation: "flat", value: stacks * rhythm.accuracyPerStack });
    modifiers.push({ stat: "moreAttackSpeed", operation: "more", value: stacks * rhythm.attackSpeedPerStack });
    if (stacks >= rhythm.maxStacks) modifiers.push({ stat: "attackDamage", operation: "increased", value: rhythm.maxStackDamageBonus });
  }
  const momentumId = "weapon-mechanic.axe-momentum";
  if (parameters.mechanics[momentumId]) {
    const stacks = Math.min(value(parameters, momentumId, "maxStacks", 4), counter(combat, momentumId));
    modifiers.push({ stat: "moreAttackSpeed", operation: "more", value: stacks * value(parameters, momentumId, "attackSpeedPerStack") });
    if (stacks >= value(parameters, momentumId, "maxStacks", 4)) modifiers.push({ stat: "attackDamage", operation: "increased", value: value(parameters, momentumId, "maxStackDamageBonus") });
  }
  const bloodlustId = "weapon-mechanic.great-axe-bloodlust";
  if (parameters.mechanics[bloodlustId] && (combat.weaponRuntime.timers[bloodlustId] ?? 0) > 0) modifiers.push({ stat: "moreAttackSpeed", operation: "more", value: value(parameters, bloodlustId, "attackSpeedBonus") });
  const comboId = "weapon-mechanic.dagger-combo";
  if (parameters.mechanics[comboId]) modifiers.push({ stat: "criticalStrikeChance", operation: "flat", value: counter(combat, comboId) * value(parameters, comboId, "critChancePerStack") });
  const chainId = "weapon-mechanic.spear-precision-chain";
  if (parameters.mechanics[chainId]) modifiers.push({ stat: "criticalStrikeChance", operation: "flat", value: counter(combat, chainId) * value(parameters, chainId, "critChancePerStack") });
  return modifiers;
}

export function prepareBasicWeaponAttempt(game: GameState, packet: DamagePacket): { game: GameState; packet: DamagePacket; attempt: BasicWeaponAttemptState } {
  if (packet.sourceActionId !== "basic.weapon-attack" || packet.weaponSubHit) return { game, packet, attempt: {} };
  const equipped = equippedWeaponMechanic(game);
  if (!equipped || game.combat.weaponRuntime.equippedInstanceId !== equipped.instanceId) return { game, packet, attempt: {} };
  const { parameters } = equipped;
  let nextPacket: DamagePacket = { ...packet, armorPenetrationPercent: (packet.armorPenetrationPercent ?? 0) + (parameters.attackProfile?.armorPenetrationPercent ?? 0), armorPenetrationFlat: (packet.armorPenetrationFlat ?? 0) + (parameters.attackProfile?.armorPenetrationFlat ?? 0), targetBlockEffectMultiplier: (packet.targetBlockEffectMultiplier ?? 1) * (parameters.attackProfile?.targetBlockEffectMultiplier ?? 1) };
  let next = game;
  let attempt: BasicWeaponAttemptState = {};
  const target = game.combat.enemy;
  const hpFraction = target && target.maxHealth > 0 ? target.currentHealth / target.maxHealth : 1;
  const targetHasHarmfulEffect = Boolean(target?.effects.some((effect) => effectById[effect.effectId]?.tags.includes("harmful")));
  const targetHasBarrier = Boolean(target && getBarrierAmount(target.effects, effectById) > 0);
  const apply = (damageMore: number, crit = 0, accuracy = 0, armorPenetrationPercent = 0, blockMultiplier?: number) => { nextPacket = { ...nextPacket, damageMultiplier: (nextPacket.damageMultiplier ?? 1) * (1 + damageMore), criticalStrikeChance: (nextPacket.criticalStrikeChance ?? 0) + crit, attackerAccuracy: (nextPacket.attackerAccuracy ?? 0) + accuracy, armorPenetrationPercent: (nextPacket.armorPenetrationPercent ?? 0) + armorPenetrationPercent, targetBlockEffectMultiplier: (nextPacket.targetBlockEffectMultiplier ?? 1) * (blockMultiplier ?? 1) }; };
  const set = (updated: PlayerWeaponRuntimeState) => { next = { ...next, combat: { ...next.combat, weaponRuntime: updated } }; };
  const maceParams = parameters.mechanics["weapon-mechanic.mace-impact"];
  const hammerParams = parameters.mechanics["weapon-mechanic.warhammer-charged-impact"];
  if (maceParams?.baseBlockEffectMultiplier !== undefined) nextPacket = { ...nextPacket, targetBlockEffectMultiplier: (parameters.attackProfile?.targetBlockEffectMultiplier ?? 1) + maceParams.baseBlockEffectMultiplier };
  if (hammerParams?.baseBlockEffectMultiplier !== undefined) nextPacket = { ...nextPacket, targetBlockEffectMultiplier: (parameters.attackProfile?.targetBlockEffectMultiplier ?? 1) + hammerParams.baseBlockEffectMultiplier };
  nextPacket = { ...nextPacket, armorPenetrationPercent: (nextPacket.armorPenetrationPercent ?? 0) + (parameters.mechanics["weapon-mechanic.warhammer-shatter"]?.baseArmorPenetrationPercent ?? 0) + (parameters.mechanics["weapon-mechanic.spear-mark"]?.baseArmorPenetrationPercent ?? 0) };
  const riposte = parameters.riposte;
  if (riposte && (next.combat.weaponRuntime.timers[RIPOSTE_TIMER_KEY] ?? 0) > 0) { set(withTimer(next.combat.weaponRuntime, RIPOSTE_TIMER_KEY, 0)); apply(riposte.damageMore, riposte.critChanceFlat); attempt = { mechanicId: RIPOSTE_TIMER_KEY, special: "riposte", consumedTimer: RIPOSTE_TIMER_KEY }; }
  for (const id of ["weapon-mechanic.dagger-opportunist", "weapon-mechanic.spear-counter-thrust"]) {
    const params = parameters.mechanics[id];
    if (!params || (next.combat.weaponRuntime.timers[id] ?? 0) <= 0) continue;
    set(withTimer(next.combat.weaponRuntime, id, 0)); apply(params.damageMore ?? 0, params.critChanceFlat ?? 0, 0, params.armorPenetrationPercent ?? 0); attempt = { mechanicId: id, special: id.endsWith("counter-thrust") ? "counter-thrust" : "opportunist", consumedTimer: id };
  }
  const maceId = "weapon-mechanic.mace-impact";
  if (parameters.mechanics[maceId]) { const params = parameters.mechanics[maceId]; if (counter(next.combat, maceId) >= Math.max(1, params.requiredHits)) { set(withCounter(next.combat.weaponRuntime, maceId, 0)); apply(params.heavyDamageMore, params.heavyCritChance ?? 0, 0, params.heavyArmorPenetrationPercent); nextPacket = { ...nextPacket, targetBlockEffectMultiplier: params.heavyBlockEffectMultiplier }; attempt = { mechanicId: maceId, special: "heavy-impact" }; } }
  const greatswordId = "weapon-mechanic.greatsword-heavy-rhythm";
  if (parameters.mechanics[greatswordId]) { const params = parameters.mechanics[greatswordId]; const stacks = counter(next.combat, GREATSWORD_HEAVY_RHYTHM_COUNTER_KEY); apply(stacks * params.damagePerStack); if (stacks >= Math.max(1, params.perfectSwingThreshold)) { set(withCounter(next.combat.weaponRuntime, GREATSWORD_HEAVY_RHYTHM_COUNTER_KEY, 0)); apply(params.perfectSwingDamageMore, params.perfectSwingCritChance, params.perfectSwingAccuracy); attempt = { mechanicId: greatswordId, special: "perfect-swing" }; } }
  const greatAxeId = "weapon-mechanic.great-axe-execution";
  if (parameters.mechanics[greatAxeId]) { const params = parameters.mechanics[greatAxeId]; if (hpFraction <= params.highThreshold) apply(params.highDamageMore, params.highCritChance); else if (hpFraction <= params.midThreshold) apply(params.midDamageMore); }
  const bloodlustId = "weapon-mechanic.great-axe-bloodlust";
  if (parameters.mechanics[bloodlustId] && (next.combat.weaponRuntime.timers[bloodlustId] ?? 0) > 0) apply(value(parameters, bloodlustId, "damageMore"));
  const axeExecutionId = "weapon-mechanic.axe-execution";
  if (parameters.mechanics[axeExecutionId] && hpFraction <= value(parameters, axeExecutionId, "threshold", 0.30)) { apply(value(parameters, axeExecutionId, "damageMore"), value(parameters, axeExecutionId, "criticalChanceInsideThreshold")); }
  const daggerOpportunityId = "weapon-mechanic.dagger-opportunist";
  if (parameters.mechanics[daggerOpportunityId] && targetHasHarmfulEffect) apply(value(parameters, daggerOpportunityId, "harmfulEffectDamageMore"));
  if (parameters.mechanics[daggerOpportunityId] && hpFraction <= 0.25) apply(value(parameters, daggerOpportunityId, "lowHealthDamageMore"), value(parameters, daggerOpportunityId, "lowHealthCritChance"));
  const woundsId = "weapon-mechanic.axe-wounds";
  if (parameters.mechanics[woundsId]) apply(counter(next.combat, woundsId) * value(parameters, woundsId, "damagePerStack"));
  const crushedId = "weapon-mechanic.mace-crushed";
  if (parameters.mechanics[crushedId]) nextPacket = { ...nextPacket, armorPenetrationPercent: (nextPacket.armorPenetrationPercent ?? 0) + counter(next.combat, crushedId) * value(parameters, crushedId, "armorPenetrationPerStack") };
  const warhammerId = "weapon-mechanic.warhammer-charged-impact";
  if (parameters.mechanics[warhammerId] && counter(next.combat, "weapon-mechanic.warhammer-shatter") >= value(parameters, warhammerId, "threshold", 3)) { set(withCounter(next.combat.weaponRuntime, "weapon-mechanic.warhammer-shatter", 0)); apply(value(parameters, warhammerId, "damageMore"), 0, 0, value(parameters, warhammerId, "armorPenetrationPercent")); nextPacket = { ...nextPacket, targetBlockEffectMultiplier: value(parameters, warhammerId, "blockEffectMultiplier") }; attempt = { mechanicId: warhammerId, special: "charged-impact" }; }
  if (targetHasBarrier) {
    const maceImpact = parameters.mechanics["weapon-mechanic.mace-impact"];
    const hammerImpact = parameters.mechanics["weapon-mechanic.warhammer-charged-impact"];
    if (maceImpact) apply(maceImpact.barrierDamageMore ?? 0);
    if (hammerImpact) apply(hammerImpact.barrierDamageMore ?? 0);
    if (attempt.special === "charged-impact" && hammerImpact) apply(hammerImpact.barrierChargedDamageMore ?? 0);
  }
  const spearMarkId = "weapon-mechanic.spear-mark";
  if (parameters.mechanics[spearMarkId]) { const stacks = counter(next.combat, spearMarkId); nextPacket = { ...nextPacket, attackerAccuracy: (nextPacket.attackerAccuracy ?? 0) + stacks * value(parameters, spearMarkId, "accuracyPerStack"), armorPenetrationPercent: (nextPacket.armorPenetrationPercent ?? 0) + stacks * value(parameters, spearMarkId, "armorPenetrationPerStack"), damageMultiplier: (nextPacket.damageMultiplier ?? 1) * (1 + (stacks >= value(parameters, spearMarkId, "maxStacks", 3) ? value(parameters, spearMarkId, "maxStackDamageBonus") : 0)), criticalStrikeChance: (nextPacket.criticalStrikeChance ?? 0) + (stacks >= value(parameters, spearMarkId, "maxStacks", 3) ? value(parameters, spearMarkId, "maxStackCritChance") : 0) }; }
  const shatterId = "weapon-mechanic.warhammer-shatter";
  if (parameters.mechanics[shatterId]) nextPacket = { ...nextPacket, armorPenetrationPercent: (nextPacket.armorPenetrationPercent ?? 0) + counter(next.combat, shatterId) * value(parameters, shatterId, "armorPenetrationPerStack") };
  return { game: next, packet: nextPacket, attempt };
}

/** Legacy test/debug adapter. Gameplay uses prepareBasicWeaponAttempt as the sole consumption path. */
export function consumeRiposteForBasicAttempt(game: GameState, packet: DamagePacket) {
  if (packet.sourceActionId !== "basic.weapon-attack") return { game, packet, consumed: false };
  const mechanic = equippedWeaponMechanic(game);
  if (!mechanic?.parameters.riposte || game.combat.weaponRuntime.equippedInstanceId !== mechanic.instanceId || (game.combat.weaponRuntime.timers[RIPOSTE_TIMER_KEY] ?? 0) <= 0) return { game, packet, consumed: false };
  const riposte = mechanic.parameters.riposte;
  return { game: { ...game, combat: { ...game.combat, weaponRuntime: withTimer(game.combat.weaponRuntime, RIPOSTE_TIMER_KEY, 0) } }, packet: { ...packet, damageMultiplier: (packet.damageMultiplier ?? 1) * (1 + riposte.damageMore), criticalStrikeChance: (packet.criticalStrikeChance ?? 0) + riposte.critChanceFlat }, consumed: true };
}

/** Resolves post-action Dagger state once for a complete multi-hit Basic action. */
export function observeBasicWeaponSummary(game: GameState, packet: DamagePacket, summary: BasicWeaponAttackSummary, attempt: BasicWeaponAttemptState = {}) {
  if (packet.sourceActionId !== "basic.weapon-attack") return game;
  const mechanic = equippedWeaponMechanic(game);
  if (!mechanic || game.combat.weaponRuntime.equippedInstanceId !== mechanic.instanceId) return game;
  const comboId = "weapon-mechanic.dagger-combo";
  if (!mechanic.parameters.mechanics[comboId]) return game;
  const successful = summary.successfulHits > 0;
  return { ...game, combat: { ...game.combat, weaponRuntime: withCounter(game.combat.weaponRuntime, comboId, resolveDaggerCombo(mechanic.parameters, successful, attempt, successful ? 1 : 0)) } };
}

export function observeBasicWeaponResult(game: GameState, packet: DamagePacket, resolution: DamageResolution, attemptOrLegacyRiposte: BasicWeaponAttemptState | boolean = {}) {
  if (packet.sourceActionId !== "basic.weapon-attack") return game;
  const attempt: BasicWeaponAttemptState = typeof attemptOrLegacyRiposte === "boolean" ? {} : attemptOrLegacyRiposte;
  const mechanic = equippedWeaponMechanic(game);
  if (!mechanic || game.combat.weaponRuntime.equippedInstanceId !== mechanic.instanceId) return game;
  let runtime = game.combat.weaponRuntime;
  const hit = resolution.outcome === "hit";
  const update = (id: string, max: number, next: number) => { runtime = withCounter(runtime, id, Math.min(max, Math.max(0, next))); };
  const rhythm = mechanic.parameters.rhythm;
  if (rhythm) { let stacks = hit ? Math.min(rhythm.maxStacks, counter(game.combat, RHYTHM_COUNTER_KEY) + 1) : 0; if (attempt.special === "riposte" && hit) stacks = Math.min(rhythm.maxStacks, stacks + (mechanic.parameters.riposte?.grantsRhythmOnHit ?? 0)); update(RHYTHM_COUNTER_KEY, rhythm.maxStacks, stacks); }
  const wounds = "weapon-mechanic.axe-wounds"; if (mechanic.parameters.mechanics[wounds] && hit) update(wounds, value(mechanic.parameters, wounds, "maxStacks", 3), counter(game.combat, wounds) + 1 + (resolution.critical ? value(mechanic.parameters, wounds, "criticalExtraStacks") : 0));
  const momentum = "weapon-mechanic.axe-momentum"; if (mechanic.parameters.mechanics[momentum]) update(momentum, value(mechanic.parameters, momentum, "maxStacks", 4), hit ? counter(game.combat, momentum) + 1 : Math.min(counter(game.combat, momentum), value(mechanic.parameters, momentum, "missFloor")));
  const crushed = "weapon-mechanic.mace-crushed"; if (mechanic.parameters.mechanics[crushed] && hit) update(crushed, value(mechanic.parameters, crushed, "maxStacks", 3), counter(game.combat, crushed) + 1);
  const impact = "weapon-mechanic.mace-impact"; if (mechanic.parameters.mechanics[impact] && attempt.special !== "heavy-impact") update(impact, value(mechanic.parameters, impact, "requiredHits", 2), hit ? counter(game.combat, impact) + 1 : 0);
  const combo = "weapon-mechanic.dagger-combo";
  const heavy = "weapon-mechanic.greatsword-heavy-rhythm"; if (mechanic.parameters.mechanics[heavy]) update(GREATSWORD_HEAVY_RHYTHM_COUNTER_KEY, value(mechanic.parameters, heavy, "maxStacks", 3), attempt.special === "perfect-swing" ? (hit ? value(mechanic.parameters, heavy, "perfectSwingNextStacks", 1) : 0) : hit ? counter(game.combat, GREATSWORD_HEAVY_RHYTHM_COUNTER_KEY) + 1 : 0);
  const bloodlust = "weapon-mechanic.great-axe-bloodlust"; if (mechanic.parameters.mechanics[bloodlust] && resolution.critical && hit) runtime = withTimer(runtime, bloodlust, value(mechanic.parameters, bloodlust, "durationSeconds", 5));
  const shatter = "weapon-mechanic.warhammer-shatter"; if (mechanic.parameters.mechanics[shatter]) update(shatter, value(mechanic.parameters, shatter, "maxStacks", 3), attempt.special === "charged-impact" ? (hit ? value(mechanic.parameters, "weapon-mechanic.warhammer-charged-impact", "nextStacks", 1) : 0) : hit ? counter(game.combat, shatter) + 1 : counter(game.combat, shatter));
  const mark = "weapon-mechanic.spear-mark"; if (mechanic.parameters.mechanics[mark] && hit) update(mark, value(mechanic.parameters, mark, "maxStacks", 3), counter(game.combat, mark) + 1);
  const chain = "weapon-mechanic.spear-precision-chain"; if (mechanic.parameters.mechanics[chain]) update(chain, value(mechanic.parameters, chain, "maxStacks", 3), hit ? counter(game.combat, chain) + 1 : 0);
  const counterThrust = "weapon-mechanic.spear-counter-thrust";
  if (hit && attempt.special === "counter-thrust" && mechanic.parameters.mechanics[counterThrust]) {
    update(mark, value(mechanic.parameters, mark, "maxStacks", 3), counter(game.combat, mark) + 1 + value(mechanic.parameters, counterThrust, "additionalMark"));
    update(chain, value(mechanic.parameters, chain, "maxStacks", 3), counter(game.combat, chain) + 1 + value(mechanic.parameters, counterThrust, "additionalPrecisionChain"));
  }
  let next = { ...game, combat: { ...game.combat, weaponRuntime: runtime } };
  if (mechanic.parameters.mechanics[combo] && !packet.weaponSubHit)
    next = { ...next, combat: { ...next.combat, weaponRuntime: withCounter(next.combat.weaponRuntime, combo, resolveDaggerCombo(mechanic.parameters, hit, attempt, hit ? counter(game.combat, combo) + 1 : 0)) } };
  return next;
}

export function applySuccessfulPlayerBlock(game: GameState) {
  const mechanic = equippedWeaponMechanic(game);
  if (!mechanic?.parameters.riposte || game.combat.weaponRuntime.equippedInstanceId !== mechanic.instanceId) return game;
  return { ...game, combat: { ...game.combat, weaponRuntime: withTimer(game.combat.weaponRuntime, RIPOSTE_TIMER_KEY, mechanic.parameters.riposte.durationSeconds) } };
}

export function observeSuccessfulPlayerEvade(game: GameState) {
  const mechanic = equippedWeaponMechanic(game);
  if (!mechanic) return game;
  let runtime = game.combat.weaponRuntime;
  for (const id of ["weapon-mechanic.dagger-opportunist", "weapon-mechanic.spear-counter-thrust"]) {
    const params = mechanic.parameters.mechanics[id]; if (!params) continue;
    const alreadyReady = (runtime.timers[id] ?? 0) > 0;
    runtime = withTimer(runtime, id, params.durationSeconds);
    if (!alreadyReady && id.endsWith("counter-thrust")) game = { ...game, combat: { ...game.combat, playerAttackTimer: Math.max(0, game.combat.playerAttackTimer - game.combat.playerAttackInterval * (params.timerAdvanceFraction ?? 0)) } };
  }
  return { ...game, combat: { ...game.combat, weaponRuntime: runtime } };
}
