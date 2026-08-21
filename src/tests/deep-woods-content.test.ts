import { describe, expect, it } from "vitest";
import { combatLocationById, combatLocationDefinitions } from "../game/data/world/combatLocations";
import { areaById } from "../game/data/world/areas";
import { enemyById } from "../game/data/enemies";
import { itemById } from "../game/data/items";
import { validateWorldContent } from "../game/world/worldValidation";
import { normalizeCombatLocationId } from "../game/world/worldMigration";
import { isCombatLocationAvailable } from "../game/world/worldSelectors";
import { getCombatTargetLootPreview } from "../game/combat/combatRewards";
import { resolveSharedLootEntryForTarget } from "../game/loot/lootResolution";
import { createInitialInventory } from "../game/inventory/inventoryTypes";
import { addStackableItem, getStackableQuantity } from "../game/items/itemOwnership";
import { openLootContainer } from "../game/loot/lootContainerLogic";
import { lootContainerById } from "../game/data/loot/lootContainers";
import { enemyCombatAbilityById } from "../game/data/enemyCombatAbilities";
import { enemyTooltipModel } from "../app/screens/combat/enemyPresentation";

const arenaExpectations = {
  "location.wolfscar-hollow": {
    requiredHunterRank: 1,
    targets: ["enemy.grey-wolf", "enemy.wolf-stalker", "enemy.wolf-ravager", "enemy.alpha-wolf"],
    traits: [["trait.predator:1"], ["trait.first-strike:1"], ["trait.bloodied-fury:1"], ["trait.predator:2", "trait.bloodied-fury:1"]],
    abilities: [["enemy-ability.savage-bite"], ["enemy-ability.rending-bite"], ["enemy-ability.maul"], ["enemy-ability.savage-bite", "enemy-ability.maul"]],
    shared: ["item.wolf-pelt", "item.wolf-fang", "item.wolf-bone", "item.wolf-rugged-hide", "item.wolf-pristine-hide", "item.wolf-blood-vial", "item.wolf-sinew", "item.trace-of-nature", "item.magic-crystal-minor-assault", "item.black-stone"],
  },
  "location.ironback-riverbed": {
    requiredHunterRank: 1,
    targets: ["enemy.stoneback-crab", "enemy.ironclaw-crab", "enemy.rustshell-crab", "enemy.ironback-crusher"],
    traits: [["trait.thick-hide:1"], ["trait.crushing-blows:1"], ["trait.hardened:1"], ["trait.unyielding:2", "trait.heavy-hitter:2"]],
    abilities: [["enemy-ability.heavy-slam"], ["enemy-ability.armour-breaker"], ["enemy-ability.stone-skin"], ["enemy-ability.groundbreaker", "enemy-ability.crushing-strike"]],
    shared: ["item.mineralized-carapace", "item.iron-ore", "item.copper-ore", "item.mineralized-shell-plate", "item.rough-metal-fragment", "item.rough-gem", "item.mineral-salts", "item.trace-of-earth", "item.magic-crystal-minor-health", "item.black-stone"],
  },
  "location.fallen-watch-ruins": {
    requiredHunterRank: 2,
    targets: ["enemy.ruins-scavenger", "enemy.deserter-swordsman", "enemy.relic-hunter", "enemy.fallen-watch-captain"],
    traits: [["trait.swift:1"], ["trait.counterguard:1"], ["trait.first-strike:1"], ["trait.battle-hardened:1", "trait.counterguard:2"]],
    abilities: [["enemy-ability.quick-shot"], ["enemy-ability.shield-bash"], ["enemy-ability.piercing-shot"], ["enemy-ability.battle-cry", "enemy-ability.armour-breaker"]],
    shared: ["item.scavenged-rusty-insignia", "item.weapon-scrap", "item.ore-box", "item.frayed-cloth", "item.leather-straps", "item.metal-scraps", "item.magic-crystal-minor-precision", "item.magic-crystal-box", "item.black-stone"],
  },
  "location.blackroot-cemetery": {
    requiredHunterRank: 3,
    targets: ["enemy.restless-corpse", "enemy.gravebound-skeleton", "enemy.crypt-hound", "enemy.blackroot-warden"],
    traits: [["trait.diseased:1"], ["trait.iron-guard:1"], ["trait.swift:1"], ["trait.undying-will:1", "trait.resilient:2"]],
    abilities: [["enemy-ability.infectious-wound"], ["enemy-ability.shield-bash"], ["enemy-ability.rending-bite"], ["enemy-ability.cursed-strike", "enemy-ability.guard-stance"]],
    shared: ["item.tarnished-old-rags", "item.bone-fragment", "item.gravebound-bone", "item.burial-cloth", "item.grave-dust", "item.blackroot-dust", "item.trace-of-death", "item.magic-crystal-minor-mana", "item.black-stone"],
  },
  "location.blighted-grove": {
    requiredHunterRank: 5,
    targets: ["enemy.blighted-stag", "enemy.thornhide-beast", "enemy.rotwood-creeper", "enemy.blightheart-guardian"],
    traits: [["trait.predator:1"], ["trait.spiked-hide:1"], ["trait.regenerator:1"], ["trait.second-wind:2", "trait.withering-touch:2"]],
    abilities: [["enemy-ability.headlong-charge"], ["enemy-ability.stone-skin"], ["enemy-ability.toxic-spit"], ["enemy-ability.arcane-ward", "enemy-ability.withering-blast"]],
    shared: ["item.blighted-husk", "item.blighted-bark", "item.thornhide-strip", "item.corrupted-sap", "item.dark-root", "item.fungal-matter", "item.trace-of-corruption", "item.magic-crystal-minor-recovery", "item.black-stone"],
  },
  "location.hollow-bell-temple": {
    requiredHunterRank: 8,
    targets: ["enemy.temple-shade", "enemy.whispering-spirit", "enemy.bound-wraith", "enemy.hollow-bell-revenant"],
    traits: [["trait.elusive:1"], ["trait.arcane-adaptation:1"], ["trait.lifedrinker:1"], ["trait.resilient:2", "trait.arcane-ward:2"]],
    abilities: [["enemy-ability.shadow-bolt"], ["enemy-ability.withering-blast"], ["enemy-ability.life-drain"], ["enemy-ability.shadow-bolt", "enemy-ability.arcane-ward"]],
    shared: ["item.faded-spirit-token", "item.spirit-ash", "item.dark-essence", "item.broken-relic", "item.wraith-residue", "item.dark-spirits-dust", "item.trace-of-unholy", "item.magic-crystal-minor-ward", "item.black-stone"],
  },
} as const;

describe("Deep Woods arena content", () => {
  it("contains exactly six four-target arenas in Deep Woods", () => {
    expect(areaById["area.deep-woods"].combatLocationIds).toEqual(Object.keys(arenaExpectations));
    expect(combatLocationDefinitions.filter((location) => location.areaId === "area.deep-woods")).toHaveLength(6);
    for (const [locationId, expected] of Object.entries(arenaExpectations)) {
      expect(combatLocationById[locationId].requiredHunterRank).toBe(expected.requiredHunterRank);
      expect(combatLocationById[locationId].targets.map((target) => target.enemyId)).toEqual(expected.targets);
    }
  });

  it("matches the authored normal target trait and ability matrix", () => {
    for (const expected of Object.values(arenaExpectations)) {
      expected.targets.forEach((enemyId, index) => {
        const enemy = enemyById[enemyId];
        expect(enemy.enemyTier).toBe("normal");
        expect(enemy.traits.map((trait) => `${trait.traitId}:${trait.rank}`)).toEqual(expected.traits[index]);
        expect(enemy.combatAbilityIds).toEqual(expected.abilities[index]);
        expect(enemy.loot).toEqual(index === 3 ? expect.any(Array) : []);
      });
    }
    expect(Object.values(enemyById).some((enemy) => enemy.enemyTier === "elite")).toBe(false);
  });

  it("keeps Life Drain usable by the normal Bound Wraith", () => {
    const lifeDrain = enemyCombatAbilityById["enemy-ability.life-drain"];
    expect(enemyById["enemy.bound-wraith"].combatAbilityIds).toContain("enemy-ability.life-drain");
    expect(lifeDrain.category).toBe("chaos");
    expect(lifeDrain.allowedEnemyTiers).toContain("normal");
    const abilityNotes = enemyTooltipModel("enemy.bound-wraith").sections?.find((section) => section.id === "enemy-abilities")?.notes ?? [];
    expect(abilityNotes.join(" ")).toContain("Life Drain");
    expect(abilityNotes.join(" ")).not.toContain("Boss-only");
  });

  it("keeps detailed shared loot, guaranteed sell-only drops, and target signatures canonical", () => {
    for (const [locationId, expected] of Object.entries(arenaExpectations)) {
      const location = combatLocationById[locationId];
      expect(location.sharedLoot?.map((drop) => drop.itemId)).toEqual(expected.shared);
      const guaranteed = location.sharedLoot?.[0];
      expect(guaranteed?.chance).toBe(1);
      expect(itemById[guaranteed!.itemId].purpose).toBe("sell-only");
      expect(location.targets.slice(0, 3).every(({ enemyId }) => enemyById[enemyId].loot.length === 0)).toBe(true);
    }
    expect(enemyById["enemy.alpha-wolf"].loot.map((drop) => drop.itemId)).toEqual(["item.alpha-fang"]);
    expect(enemyById["enemy.blackroot-warden"].loot.map((drop) => drop.itemId)).toEqual(["item.wardens-grave-plate"]);
  });

  it("uses the same target quantity resolver for previews and runtime", () => {
    const location = combatLocationById["location.ironback-riverbed"];
    const firstDrop = location.sharedLoot![0];
    expect(resolveSharedLootEntryForTarget(firstDrop, location.targets[0].enemyId)).toMatchObject({ minQuantity: 1, maxQuantity: 1 });
    expect(resolveSharedLootEntryForTarget(firstDrop, location.targets[2].enemyId)).toMatchObject({ minQuantity: 2, maxQuantity: 3 });
    expect(resolveSharedLootEntryForTarget(firstDrop, location.targets[3].enemyId)).toMatchObject({ minQuantity: 3, maxQuantity: 5 });
    expect(getCombatTargetLootPreview(location, enemyById[location.targets[2].enemyId]).sharedLoot[0]).toMatchObject({ minQuantity: 2, maxQuantity: 3 });
  });

  it("gates only the arena and normalizes the old Wolf Den location id", () => {
    expect(isCombatLocationAvailable("location.wolfscar-hollow", 0)).toBe(false);
    expect(isCombatLocationAvailable("location.wolfscar-hollow", 1)).toBe(true);
    expect(normalizeCombatLocationId("location.wolf-den")).toBe("location.wolfscar-hollow");
    expect(combatLocationById["location.wolfscar-hollow"].targets.every((target) => !("minHunterRank" in target))).toBe(true);
  });

  it("opens both authored loot containers through generic weighted tables", () => {
    let inventory = addStackableItem(createInitialInventory(), "item.ore-box", 2);
    const openedOre = openLootContainer(inventory, "item.ore-box", 1, lootContainerById, () => 0);
    expect(openedOre.openedQuantity).toBe(1);
    expect(getStackableQuantity(openedOre.inventory, "item.ore-box")).toBe(1);
    expect(Object.keys(openedOre.rewards).every((itemId) => ["item.iron-ore", "item.copper-ore", "item.lead-ore"].includes(itemId))).toBe(true);
    inventory = addStackableItem(createInitialInventory(), "item.magic-crystal-box", 1);
    const openedCrystal = openLootContainer(inventory, "item.magic-crystal-box", 1, lootContainerById, () => 0.99);
    expect(Object.keys(openedCrystal.rewards).every((itemId) => itemId === "item.magic-crystal-dust" || itemId.includes("item.magic-crystal-minor-"))).toBe(true);
  });

  it("passes world validation", () => {
    expect(validateWorldContent()).toEqual([]);
  });
});
