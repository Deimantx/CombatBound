import { describe, expect, it } from "vitest";
import { migrateLegacyCombatStats, migrateLegacyDamageType } from "../game/persistence/legacyCombatMigration";

describe("legacy combat migration boundary", () => {
  it("maps only known historical damage identities", () => {
    expect(migrateLegacyDamageType("water")).toBe("cold");
    expect(migrateLegacyDamageType("air")).toBe("lightning");
    expect(migrateLegacyDamageType("darkness")).toBe("chaos");
    expect(migrateLegacyDamageType("earth")).toBeNull();
    expect(migrateLegacyDamageType("true")).toBeNull();
  });

  it("converts safe stat/resistance fields and drops retired defensive concepts", () => {
    const migrated = migrateLegacyCombatStats({ maxHealth: 100, attackPower: 20, resistances: { fire: 0.8, cold: 0.2 }, maxResistances: { fire: 0.9 }, parryChance: 0.5, dodgeChance: 0.5, blockPower: 10, attackInterval: 1 });
    expect(migrated).toMatchObject({ maxLife: 100, attackDamage: 20, fireResistance: 0.8, coldResistance: 0.2, maxFireResistance: 0.9 });
    expect(migrated).not.toHaveProperty("resistances");
    expect(migrated).not.toHaveProperty("parryChance");
    expect(migrated).not.toHaveProperty("attackInterval");
  });
});
