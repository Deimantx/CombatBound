import { describe, expect, it } from "vitest";
import { getEnemyResolvedTraits } from "../game/enemyTraits/enemyTraitSelectors";
import { enemyById } from "../game/data/enemies";

describe("enemy Trait presentation", () => {
  it("resolves assignments through the central catalogue", () => {
    const enemy = { ...enemyById["enemy.grey-wolf"], traits: [{ traitId: "trait.bloodied-fury" as const, rank: 2 as const }] };
    const [resolved] = getEnemyResolvedTraits(enemy);
    expect(resolved.definition.name).toBe("Bloodied Fury");
    expect(resolved.assignment.rank).toBe(2);
    expect(resolved.rank.description).toContain("30%");
  });
});
