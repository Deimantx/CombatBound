import type { CombatContext, CombatState } from "./combatTypes";

export interface PlayerDamageApplication {
  combat: CombatState;
  requestedDamage: number;
  appliedDamage: number;
  preventedLethalDamage: number;
  wouldHaveDied: boolean;
}

export interface EnemyDamageApplication extends Omit<PlayerDamageApplication, "wouldHaveDied"> {
  wouldHaveDied: boolean;
  targetDied: boolean;
}

export function applyEnemyHealthDamage(combat: CombatState, instanceId: string, requestedDamage: number, context: CombatContext): EnemyDamageApplication {
  const requested = Math.max(0, Number.isFinite(requestedDamage) ? requestedDamage : 0);
  const enemy = combat.enemies.find((candidate) => candidate.instanceId === instanceId);
  if (!enemy || enemy.defeated) return { combat, requestedDamage: requested, appliedDamage: 0, preventedLethalDamage: 0, wouldHaveDied: false, targetDied: false };
  const immortal = context.debugHooks?.isEnemyImmortal?.(instanceId) === true;
  const minimumHp = immortal ? 1 : 0;
  const appliedDamage = Math.min(requested, Math.max(0, enemy.currentHealth - minimumHp));
  const nextHealth = Math.max(minimumHp, enemy.currentHealth - appliedDamage);
  const wouldHaveDied = enemy.currentHealth - requested <= 0;
  const targetDied = !immortal && nextHealth <= 0;
  return {
    combat: {
      ...combat,
      enemies: combat.enemies.map((candidate) => candidate.instanceId === instanceId ? { ...candidate, currentHealth: nextHealth, defeated: targetDied, currentAction: targetDied ? null : candidate.currentAction } : candidate),
      session: { ...combat.session, damageDealt: combat.session.damageDealt + appliedDamage, highestHit: Math.max(combat.session.highestHit, appliedDamage) },
    },
    requestedDamage: requested,
    appliedDamage,
    preventedLethalDamage: immortal ? Math.max(0, requested - appliedDamage) : 0,
    wouldHaveDied,
    targetDied,
  };
}

export function applyPlayerHealthDamage(combat: CombatState, requestedDamage: number, context: CombatContext): PlayerDamageApplication {
  const requested = Math.max(0, Number.isFinite(requestedDamage) ? requestedDamage : 0);
  const immortal = context.debugHooks?.isPlayerImmortal?.() === true;
  const minimumHp = immortal ? 1 : 0;
  const appliedDamage = Math.min(requested, Math.max(0, combat.playerHp - minimumHp));
  return {
    combat: { ...combat, playerHp: Math.max(minimumHp, combat.playerHp - appliedDamage), session: { ...combat.session, damageTaken: combat.session.damageTaken + appliedDamage } },
    requestedDamage: requested,
    appliedDamage,
    preventedLethalDamage: immortal ? Math.max(0, requested - appliedDamage) : 0,
    wouldHaveDied: combat.playerHp - requested <= 0,
  };
}
