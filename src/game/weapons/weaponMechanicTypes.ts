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
  mechanics: Record<string, Record<string, number>>;
  attackProfile?: {
    armorPenetrationPercent: number;
    armorPenetrationFlat: number;
    targetBlockEffectMultiplier?: number;
  };
  rhythm?: DuelistRhythmParameters;
  riposte?: RiposteParameters;
}

export interface PlayerWeaponRuntimeState {
  equippedInstanceId: ItemInstanceId | null;
  counters: Record<string, number>;
  timers: Record<string, number>;
}

export type WeaponBasicSpecial = "riposte" | "heavy-impact" | "opportunist" | "perfect-swing" | "charged-impact" | "counter-thrust";

export interface BasicWeaponAttemptState {
  mechanicId?: string;
  special?: WeaponBasicSpecial;
  consumedTimer?: string;
}

export interface BasicWeaponAttackSummary {
  attemptedHits: number;
  successfulHits: number;
  criticalHits: number;
  blockedHits: number;
  totalHpDamage: number;
  targetDied: boolean;
}

export const RHYTHM_MECHANIC_ID = "weapon-mechanic.duelist-rhythm";
export const RIPOSTE_MECHANIC_ID = "weapon-mechanic.riposte";
export const RHYTHM_COUNTER_KEY = RHYTHM_MECHANIC_ID;
export const GREATSWORD_HEAVY_RHYTHM_COUNTER_KEY = "weapon-mechanic.greatsword-heavy-rhythm";
export const RIPOSTE_TIMER_KEY = RIPOSTE_MECHANIC_ID;
