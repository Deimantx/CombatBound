import { describe, expect, it } from "vitest";
import { effectById } from "../game/data/effects";
import { validateContent } from "../game/validation/contentValidator";

describe("Combat content validation V11", () => {
  it("accepts the authored catalogue at the canonical stat and damage boundaries", () => {
    expect(validateContent()).toEqual([]);
  });

  it("keeps ailment taxonomy and Shock semantics explicit", () => {
    expect(effectById["effect.ignite"].tags).toEqual(expect.arrayContaining(["ailment", "elemental-ailment", "damaging-ailment"]));
    expect(effectById["effect.bleed"].tags).toEqual(expect.arrayContaining(["ailment", "physical-ailment", "damaging-ailment"]));
    expect(effectById["effect.shocked"].tags).toEqual(expect.arrayContaining(["ailment", "elemental-ailment", "non-damaging-ailment"]));
    expect(effectById["effect.shocked"].statModifiers).toContainEqual({ stat: "increasedDamageTaken", operation: "flat", value: 0.1 });
  });
});
