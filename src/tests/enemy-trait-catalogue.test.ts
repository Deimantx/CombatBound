import { describe, expect, it } from "vitest";
import { enemyTraitDefinitions, enemyTraitById } from "../game/data/enemyTraits";
import { validateEnemyTraitDefinitions } from "../game/data/validation/enemyTraitValidation";

describe("enemy Trait catalogue", () => {
  it("contains the locked 75 definitions with stable IDs", () => {
    expect(enemyTraitDefinitions).toHaveLength(75);
    expect(new Set(enemyTraitDefinitions.map((trait) => trait.id)).size).toBe(75);
    expect(enemyTraitDefinitions.every((trait) => trait.id.startsWith("trait."))).toBe(true);
    expect(enemyTraitDefinitions.slice(0, 65).every((trait) => trait.allowedEnemyTiers.join(",") === "normal,elite,boss")).toBe(true);
    expect(enemyTraitDefinitions.slice(65, 70).every((trait) => trait.allowedEnemyTiers.join(",") === "elite")).toBe(true);
    expect(enemyTraitDefinitions.slice(70).every((trait) => trait.allowedEnemyTiers.join(",") === "boss" && trait.maxRank === 1)).toBe(true);
    expect(enemyTraitById["trait.bloodied-fury"].ranks[1].description).toContain("30%");
  });

  it("validates the complete authored catalogue", () => {
    expect(validateEnemyTraitDefinitions().errors).toEqual([]);
  });
});
