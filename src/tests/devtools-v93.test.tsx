import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { DebugStatsTab } from "../app/debug/admin/tabs/DebugStatsTab";
import { useDevToolsRuntimeStore } from "../app/debug/devtools/devToolsRuntimeStore";
import { applyEffect, getBarrierAmount } from "../game/combat/combatEffects";
import { applyPlayerHealthDamage, createCombatContext } from "../game/combat/combatEngine";
import { effectById } from "../game/data/effects";
import { debugApplyPlayerMaxHpBarrier, debugHealSelectedEnemyToFull } from "../game/debug/debugActions";
import { createInitialGameState } from "../game/gameState";
import { instantiateEnemies } from "../game/combat/combatState";
import { useGameStore } from "../state/gameStore";

const run = () => undefined;

beforeEach(() => {
  cleanup();
  useGameStore.getState().resetGameplay();
  useDevToolsRuntimeStore.setState({ playerImmortal: false });
});

afterEach(() => cleanup());

describe("Developer Toolkit V9.3", () => {
  it("keeps category and stat disclosure state independent", () => {
    render(<TooltipProvider><DebugStatsTab debug={useGameStore.getState().debug} run={run} /></TooltipProvider>);
    const offense = screen.getByRole("button", { name: /OFFENSE/ });
    const defense = screen.getByRole("button", { name: /DEFENSE/ });
    expect(offense).toHaveAttribute("aria-expanded", "true");
    expect(defense).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: /Accuracy Rating/ }));
    expect(screen.getByRole("button", { name: /Accuracy Rating/ })).toHaveAttribute("aria-expanded", "true");
    expect(defense).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: /Armour/ }));
    expect(screen.getByRole("button", { name: /Armour/ })).toHaveAttribute("aria-expanded", "true");
    expect(offense).toHaveAttribute("aria-expanded", "true");
    expect(defense).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(offense);
    expect(offense).toHaveAttribute("aria-expanded", "false");
    expect(defense).toHaveAttribute("aria-expanded", "true");
  });

  it("applies a max-health canonical barrier without progression credit", () => {
    const game = createInitialGameState();
    const beforeXp = game.progression.proficiencies["earth-magic"]?.totalXp ?? 0;
    const next = debugApplyPlayerMaxHpBarrier(game);
    expect(getBarrierAmount(next.combat.playerEffects, effectById)).toBe(game.combat.maxPlayerHp);
    expect(next.progression.proficiencies["earth-magic"]?.totalXp ?? 0).toBe(beforeXp);
  });

  it("heals a selected living enemy without reviving defeated enemies", () => {
    const initial = createInitialGameState();
    const enemy = instantiateEnemies(["enemy.grey-wolf"], 1)[0];
    const game = { ...initial, combat: { ...initial.combat, enemies: [enemy], selectedEnemyInstanceId: enemy.instanceId } };
    const withEffect = applyEffect(game.combat, effectById["effect.bleed"], { kind: "player" }, { kind: "enemy", instanceId: enemy.instanceId }).combat;
    const damaged = { ...game, combat: { ...withEffect, enemies: withEffect.enemies.map((candidate) => candidate.instanceId === enemy.instanceId ? { ...candidate, currentHealth: 1 } : candidate) } };
    const healed = debugHealSelectedEnemyToFull(damaged);
    expect(healed.combat.enemies[0].currentHealth).toBe(enemy.maxHealth);
    expect(healed.combat.enemies[0].effects).toHaveLength(1);

    const defeated = { ...damaged, combat: { ...damaged.combat, enemies: [{ ...damaged.combat.enemies[0], defeated: true, rewardResolved: true }] } };
    expect(debugHealSelectedEnemyToFull(defeated)).toBe(defeated);
  });

  it("floors combat damage at one HP only while immortal", () => {
    const combat = { ...createInitialGameState().combat, playerHp: 10, session: { ...createInitialGameState().combat.session } };
    const context = createCombatContext({ next: () => 0.5 });
    context.debugHooks = { isPlayerImmortal: () => true };
    const immortal = applyPlayerHealthDamage(combat, 30, context);
    expect(immortal.combat.playerHp).toBe(1);
    expect(immortal.appliedDamage).toBe(9);
    expect(immortal.preventedLethalDamage).toBe(21);
    expect(immortal.wouldHaveDied).toBe(true);

    context.debugHooks = { isPlayerImmortal: () => false };
    const normal = applyPlayerHealthDamage(combat, 30, context);
    expect(normal.combat.playerHp).toBe(0);
    expect(normal.appliedDamage).toBe(10);
  });
});
