import type { ItemRollRng } from "./itemModifierTypes";

/** Small deterministic stream for debug/prototype item mutations. Production loot will provide its own seed. */
export function createDeterministicItemRng(seed = 0x00c0ffee): ItemRollRng {
  let state = seed >>> 0;
  return {
    next() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 0x100000000;
    },
  };
}
