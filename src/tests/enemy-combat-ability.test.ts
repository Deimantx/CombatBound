import { describe, expect, it } from "vitest";
import { enemyCombatAbilityDefinitions } from "../game/data/enemyCombatAbilities";
import { enemyById } from "../game/data/enemies";
import { validateEnemyCombatAbilities } from "../game/data/validation/enemyCombatAbilityValidation";

describe("enemy combat ability catalogue", () => {
  it("contains exactly 60 valid authored abilities", () => {
    expect(enemyCombatAbilityDefinitions).toHaveLength(60);
    expect(validateEnemyCombatAbilities().errors).toEqual([]);
  });

  it("migrates only Bandit Archer into production abilities", () => {
    expect(enemyById["enemy.bandit-archer"].combatAbilityIds).toEqual(["enemy-ability.charged-shot"]);
    expect(Object.values(enemyById).filter((enemy) => enemy.combatAbilityIds.length > 0).length).toBeGreaterThan(1);
  });
});
