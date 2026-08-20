import { describe, expect, it } from "vitest";
import { enemyTraitById } from "../game/data/enemyTraits";
import { validateEnemyTraitAssignments, validateEnemyTraitDefinitions } from "../game/data/validation/enemyTraitValidation";

describe("enemy Trait validation", () => {
  it("accepts the authored catalogue without errors", () => {
    expect(validateEnemyTraitDefinitions().errors).toEqual([]);
  });

  it("rejects duplicate, unknown, and tier-incompatible assignments", () => {
    const result = validateEnemyTraitAssignments({
      id: "fixture.normal",
      enemyTier: "normal",
      traits: [
        { traitId: "trait.unstoppable", rank: 1 },
        { traitId: "trait.unstoppable", rank: 1 },
        { traitId: "trait.missing", rank: 1 },
      ],
    }, enemyTraitById);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("duplicate Trait assignment"),
      expect.stringContaining("unknown Trait ID"),
      expect.stringContaining("not allowed on normal"),
    ]));
  });
});
