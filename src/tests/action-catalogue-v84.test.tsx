import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { createCombatPreviewContext } from "../game/combat/combatEngine";
import { getPlayerActionDefinitions } from "../game/combat/playerActions";
import { createInitialGameState } from "../game/gameState";
import { buildPlayerActionCatalogue, getPlayerActionGroupingMetadata } from "../game/presentation/playerActionCatalogue";
import { getWeaponSkillGroups } from "../game/presentation/weaponSkillCatalogue";
import { weaponSkillDefinitions, type WeaponSkillDefinition } from "../game/data/weaponSkills";
import { useGameStore } from "../state/gameStore";

describe("Hierarchical action catalogue V8.4", () => {
  it("groups canonical actions by Magic School, weapon proficiency, and root category", () => {
    const game = createInitialGameState();
    const context = createCombatPreviewContext();
    const actions = getPlayerActionDefinitions(game, context).filter((action) => action.kind !== "basic-attack");
    const catalogue = buildPlayerActionCatalogue(actions);

    expect(catalogue.map((group) => group.id)).toEqual(["magic", "weapon-skills", "active-defense", "consumables"]);
    expect(catalogue.find((group) => group.id === "magic")?.children?.map((group) => group.label)).toEqual([
      "Fire Magic", "Water Magic", "Air Magic", "Earth Magic", "Darkness Magic",
    ]);
    expect(catalogue.find((group) => group.id === "weapon-skills")?.children?.[0]).toMatchObject({
      id: "weapon.one-handed-sword",
      label: "One-Handed Sword",
      itemCount: 5,
    });
    expect(catalogue.find((group) => group.id === "active-defense")?.itemCount).toBe(3);
    expect(catalogue.find((group) => group.id === "consumables")?.itemCount).toBe(1);
  });

  it("derives future weapon groups from proficiencyId in canonical order", () => {
    const axeFixture = {
      ...weaponSkillDefinitions[0],
      id: "weapon-skill.one-handed-axe.fixture",
      name: "Axe Fixture",
      proficiencyId: "one-handed-axe",
      unlock: { proficiencyId: "one-handed-axe", level: 1 },
    } satisfies WeaponSkillDefinition;
    const groups = getWeaponSkillGroups([...weaponSkillDefinitions, axeFixture]);
    expect(groups.map((group) => group.proficiencyId)).toEqual(["one-handed-sword", "one-handed-axe"]);
    expect(groups.find((group) => group.proficiencyId === "one-handed-axe")?.skills).toHaveLength(1);
  });

  it("uses canonical source metadata for grouping and search keywords", () => {
    const game = createInitialGameState();
    const action = getPlayerActionDefinitions(game, createCombatPreviewContext()).find((candidate) => candidate.id === "weapon-skill.one-handed-sword.swift-cut");
    expect(action).toBeDefined();
    expect(getPlayerActionGroupingMetadata(action!)).toMatchObject({
      rootId: "weapon-skills",
      subgroupId: "weapon.one-handed-sword",
      subgroupLabel: "One-Handed Sword",
    });
    const item = buildPlayerActionCatalogue([action!])[0].children?.[0].items?.[0];
    expect(item?.searchText).toContain("stamina");
    expect(item?.searchText).toContain("sword");
  });
});

describe("Hierarchical action picker UI V8.4", () => {
  beforeEach(() => useGameStore.getState().resetGameplay());
  afterEach(() => cleanup());

  function openAutomation() {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Combat Automation/i }));
    fireEvent.click(screen.getByRole("button", { name: /ADD RULE/i }));
  }

  function openAbilities() {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Combat Abilities/i }));
  }

  it("renders data-driven root and nested action groups and expands the selected action", () => {
    openAutomation();
    const trigger = document.querySelector('[data-debug-kind="action-picker-trigger"]') as HTMLElement;
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(document.querySelector('[data-debug-kind="action-picker-group"][data-debug-group-id="magic"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="action-picker-group"][data-debug-group-id="weapon-skills"]')).toBeInTheDocument();
    fireEvent.click(document.querySelector('[data-debug-kind="action-picker-group-header"][data-debug-group-id="weapon-skills"]') as HTMLElement);
    fireEvent.click(document.querySelector('[data-debug-kind="action-picker-group-header"][data-debug-group-id="weapon.one-handed-sword"]') as HTMLElement);
    expect(document.querySelector('[data-debug-kind="action-picker-group"][data-debug-group-id="weapon.one-handed-sword"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="action-picker-item"][data-debug-action-id="weapon-skill.one-handed-sword.opening-feint"]')).toBeInTheDocument();
    fireEvent.click(document.querySelector('[data-debug-kind="action-picker-group-header"][data-debug-group-id="magic"]') as HTMLElement);
    expect(document.querySelector('[data-debug-kind="action-picker-group"][data-debug-group-id="magic.fire-magic"]')).toBeInTheDocument();
  });

  it("searches action metadata and changes only the draft action", () => {
    openAutomation();
    const trigger = document.querySelector('[data-debug-kind="action-picker-trigger"]') as HTMLElement;
    fireEvent.click(trigger);
    const search = screen.getByRole("textbox", { name: "Search actions" });
    fireEvent.change(search, { target: { value: "swift" } });
    expect(document.querySelectorAll('[data-debug-kind="action-picker-item"]')).toHaveLength(1);
    expect(document.querySelector('[data-debug-action-id="weapon-skill.one-handed-sword.swift-cut"]')).toBeInTheDocument();
    fireEvent.click(document.querySelector('[data-debug-action-id="weapon-skill.one-handed-sword.swift-cut"]') as HTMLElement);
    expect(screen.getByRole("button", { name: /Swift Cut/ })).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="action-picker"]')).toBeInTheDocument();
  });

  it("keeps Combat Ability selection and DnD entries searchable through collapsed weapon groups", () => {
    openAbilities();
    const group = document.querySelector('[data-debug-kind="catalogue-accordion-group"][data-debug-group-id="all.weapon-skills"]') as HTMLElement;
    fireEvent.click(group.querySelector("button") as HTMLElement);
    expect(document.querySelector('[data-debug-ability-id="weapon-skill.one-handed-sword.swift-cut"]')).not.toBeInTheDocument();

    const search = screen.getByRole("textbox", { name: "Search abilities" });
    fireEvent.change(search, { target: { value: "feint" } });
    expect(document.querySelector('[data-debug-ability-id="weapon-skill.one-handed-sword.opening-feint"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="catalogue-accordion-group"][data-debug-group-id="all.weapon-skills"]')).toHaveAttribute("data-debug-expanded", "true");

    fireEvent.change(search, { target: { value: "" } });
    expect(document.querySelector('[data-debug-kind="catalogue-accordion-group"][data-debug-group-id="all.weapon-skills"]')).toHaveAttribute("data-debug-expanded", "false");
  });
});
