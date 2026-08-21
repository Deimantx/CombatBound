import { itemById } from "../data/items";
import { getItemInstance } from "../items/itemOwnership";
import { resolveWeaponMechanicParameters } from "./weaponMechanicResolver";
import { RHYTHM_COUNTER_KEY, RIPOSTE_TIMER_KEY, type PlayerWeaponRuntimeState, type WeaponMechanicParameters } from "./weaponMechanicTypes";
import type { EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { ItemInstanceId } from "../items/itemTypes";
import type { CombatState } from "../combat/combatTypes";
import type { GameState } from "../gameState";
import type { DamagePacket, DamageResolution } from "../combat/combatDamage";

export function createInitialPlayerWeaponRuntime(): PlayerWeaponRuntimeState {
  return { equippedInstanceId: null, counters: { [RHYTHM_COUNTER_KEY]: 0 }, timers: { [RIPOSTE_TIMER_KEY]: 0 } };
}

export function resetPlayerWeaponRuntime(runtime: PlayerWeaponRuntimeState | undefined, equippedInstanceId: ItemInstanceId | null = null): PlayerWeaponRuntimeState {
  return { equippedInstanceId, counters: { [RHYTHM_COUNTER_KEY]: 0 }, timers: { [RIPOSTE_TIMER_KEY]: 0 } };
}

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
  if (combat.weaponRuntime.equippedInstanceId === equippedInstanceId) return combat.weaponRuntime;
  return resetPlayerWeaponRuntime(combat.weaponRuntime, equippedInstanceId);
}

export function advanceWeaponMechanicRuntime(combat: CombatState, step: number, equipment: EquipmentState, inventory: InventoryState): CombatState {
  const runtime = syncPlayerWeaponRuntime(combat, equipment, inventory);
  const timer = Math.max(0, (runtime.timers[RIPOSTE_TIMER_KEY] ?? 0) - Math.max(0, step));
  return { ...combat, weaponRuntime: { ...runtime, timers: { ...runtime.timers, [RIPOSTE_TIMER_KEY]: timer } } };
}

export function weaponMechanicStatModifiers(combat: CombatState, parameters: WeaponMechanicParameters | undefined) {
  const rhythm = parameters?.rhythm;
  if (!rhythm) return [];
  const stacks = Math.min(rhythm.maxStacks, Math.max(0, Math.floor(combat.weaponRuntime.counters[RHYTHM_COUNTER_KEY] ?? 0)));
  return [
    { stat: "accuracyRating" as const, operation: "flat" as const, value: stacks * rhythm.accuracyPerStack },
    { stat: "moreAttackSpeed" as const, operation: "more" as const, value: stacks * rhythm.attackSpeedPerStack },
    ...(stacks >= rhythm.maxStacks ? [{ stat: "attackDamage" as const, operation: "increased" as const, value: rhythm.maxStackDamageBonus }] : []),
  ];
}

export function consumeRiposteForBasicAttempt(game: GameState, packet: DamagePacket) {
  if (packet.sourceActionId !== "basic.weapon-attack") return { game, packet, consumed: false };
  const mechanic = equippedWeaponMechanic(game);
  if (!mechanic?.parameters.riposte || game.combat.weaponRuntime.equippedInstanceId !== mechanic.instanceId) return { game, packet, consumed: false };
  if ((game.combat.weaponRuntime.timers[RIPOSTE_TIMER_KEY] ?? 0) <= 0) return { game, packet, consumed: false };
  const riposte = mechanic.parameters.riposte;
  const weaponRuntime = { ...game.combat.weaponRuntime, timers: { ...game.combat.weaponRuntime.timers, [RIPOSTE_TIMER_KEY]: 0 } };
  return { game: { ...game, combat: { ...game.combat, weaponRuntime } }, packet: { ...packet, damageMultiplier: (packet.damageMultiplier ?? 1) * (1 + riposte.damageMore), criticalStrikeChance: (packet.criticalStrikeChance ?? 0) + riposte.critChanceFlat }, consumed: true };
}

export function observeBasicWeaponResult(game: GameState, packet: DamagePacket, resolution: DamageResolution, riposteConsumed: boolean) {
  if (packet.sourceActionId !== "basic.weapon-attack") return game;
  const mechanic = equippedWeaponMechanic(game);
  if (!mechanic?.parameters.rhythm || game.combat.weaponRuntime.equippedInstanceId !== mechanic.instanceId) return game;
  const rhythm = mechanic.parameters.rhythm;
  let stacks = resolution.outcome === "hit" ? Math.min(rhythm.maxStacks, (game.combat.weaponRuntime.counters[RHYTHM_COUNTER_KEY] ?? 0) + 1) : 0;
  if (riposteConsumed && resolution.outcome === "hit") stacks = Math.min(rhythm.maxStacks, stacks + (mechanic.parameters.riposte?.grantsRhythmOnHit ?? 0));
  const runtime = { ...game.combat.weaponRuntime, counters: { ...game.combat.weaponRuntime.counters, [RHYTHM_COUNTER_KEY]: stacks } };
  return { ...game, combat: { ...game.combat, weaponRuntime: runtime } };
}

export function applySuccessfulPlayerBlock(game: GameState) {
  const mechanic = equippedWeaponMechanic(game);
  if (!mechanic?.parameters.riposte || game.combat.weaponRuntime.equippedInstanceId !== mechanic.instanceId) return game;
  return { ...game, combat: { ...game.combat, weaponRuntime: { ...game.combat.weaponRuntime, timers: { ...game.combat.weaponRuntime.timers, [RIPOSTE_TIMER_KEY]: mechanic.parameters.riposte.durationSeconds } } } };
}
