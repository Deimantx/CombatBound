import type { ItemInstanceId } from "../items/itemTypes";

export interface DuelistRhythmParameters {
  maxStacks: number;
  accuracyPerStack: number;
  attackSpeedPerStack: number;
  maxStackDamageBonus: number;
}

export interface RiposteParameters {
  durationSeconds: number;
  damageMore: number;
  critChanceFlat: number;
  grantsRhythmOnHit: number;
}

export interface WeaponMechanicParameters {
  archetypeId: string;
  rhythm?: DuelistRhythmParameters;
  riposte?: RiposteParameters;
}

export interface PlayerWeaponRuntimeState {
  equippedInstanceId: ItemInstanceId | null;
  counters: Record<string, number>;
  timers: Record<string, number>;
}

export const RHYTHM_MECHANIC_ID = "weapon-mechanic.duelist-rhythm";
export const RIPOSTE_MECHANIC_ID = "weapon-mechanic.riposte";
export const RHYTHM_COUNTER_KEY = RHYTHM_MECHANIC_ID;
export const RIPOSTE_TIMER_KEY = RIPOSTE_MECHANIC_ID;
