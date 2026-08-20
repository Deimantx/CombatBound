import type { CombatContext, CombatState } from "./combatTypes";
import { applyEnemyTraitHealthTriggers, interceptEnemyLethalDamage } from "../enemyTraits/enemyTraitRuntime";

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
  const enemy = combat.enemy?.instanceId === instanceId ? combat.enemy : undefined;
  if (!enemy || enemy.defeated) return { combat, requestedDamage: requested, appliedDamage: 0, preventedLethalDamage: 0, wouldHaveDied: false, targetDied: false };
  const immortal = context.debugHooks?.isEnemyImmortal?.(instanceId) === true;
  if (!immortal) {
    const intercepted = interceptEnemyLethalDamage(combat, instanceId, requested, context);
    if (intercepted) return {
      combat: {
        ...intercepted.combat,
        session: { ...intercepted.combat.session, damageDealt: intercepted.combat.session.damageDealt + intercepted.appliedDamage, highestHit: Math.max(intercepted.combat.session.highestHit, intercepted.appliedDamage) },
      },
      requestedDamage: requested,
      appliedDamage: intercepted.appliedDamage,
      preventedLethalDamage: intercepted.preventedLethalDamage,
      wouldHaveDied: true,
      targetDied: false,
    };
  }
  const minimumHp = immortal ? 1 : 0;
  const appliedDamage = Math.min(requested, Math.max(0, enemy.currentHealth - minimumHp));
  const nextHealth = Math.max(minimumHp, enemy.currentHealth - appliedDamage);
  const wouldHaveDied = enemy.currentHealth - requested <= 0;
  const targetDied = !immortal && nextHealth <= 0;
  const nextCombat = {
      ...combat,
      enemy: enemy?.instanceId === instanceId ? { ...enemy, currentHealth: nextHealth, defeated: targetDied, preparedAbility: targetDied ? null : enemy.preparedAbility } : enemy,
      session: { ...combat.session, damageDealt: combat.session.damageDealt + appliedDamage, highestHit: Math.max(combat.session.highestHit, appliedDamage) },
    };
  return {
    combat: applyEnemyTraitHealthTriggers(nextCombat, instanceId, enemy.currentHealth, context),
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
