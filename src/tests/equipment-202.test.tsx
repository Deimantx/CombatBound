
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { InventoryScreen } from "../app/screens/inventory/InventoryScreen";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { createInitialGameState } from "../game/gameState";
import { setItemQuality, setItemUpgradeLevel } from "../game/items/itemMutations";
import { grantItem } from "../game/items/itemOwnership";
import { resolveItemInstance } from "../game/items/itemResolver";
import { buildEquipmentItemDifferenceRows } from "../game/presentation/equipmentItemComparison";
import { useGameStore } from "../state/gameStore";

function equipOwnedItem(definitionId: string, slotId: "weapon" | "offhand") {
  const store = useGameStore.getState();
  const instance = Object.values(store.game.inventory.instances).find((entry) => entry.definitionId === definitionId);
  if (!instance) throw new Error(`Missing fixture item ${definitionId}`);
  store.equipItemInstance(instance.id, slotId);
}

describe("Equipment 2.0.2 comparison workspace", () => {
  beforeEach(() => {
    cleanup();
    useGameStore.getState().resetGameplay();
  });

  afterEach(() => cleanup());

  it("pins Current separately and scopes search to Available", () => {
    const store = useGameStore.getState();
    store.debug.setOwnedItemCount("item.hunter-shield", 1);
    store.debug.setHunterRank(5);
    equipOwnedItem("item.training-shield", "offhand");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(document.querySelector('[data-debug-kind="equipment-slot"][data-debug-slot-id="offhand"]') as HTMLElement);

    const current = document.querySelector('[data-debug-kind="equipment-current-card"]') as HTMLElement;
    expect(within(current).getByText("Training Shield")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-debug-kind="equipment-candidate"][data-debug-instance-id="item-instance-00000002"]').length).toBe(0);
    expect(Array.from((document.querySelector('[data-debug-kind="equipment-candidate-sort"]') as HTMLSelectElement).options).map((option) => option.text)).not.toContain("Manual");

    fireEvent.change(screen.getByRole("textbox", { name: "Search compatible equipment" }), { target: { value: "Hunter" } });
    expect(within(current).getByText("Training Shield")).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.hunter-shield"]')).toBeInTheDocument();
  });

  it("keeps rarity frame and selection state independent", () => {
    const store = useGameStore.getState();
    store.debug.setOwnedItemCount("item.vanguard-sword", 1);
    store.debug.setHunterRank(10);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(document.querySelector('[data-debug-kind="equipment-slot"][data-debug-slot-id="weapon"]') as HTMLElement);
    const candidate = document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.vanguard-sword"]') as HTMLElement;
    fireEvent.click(candidate);
    expect(candidate).toHaveClass("rarity-rare");
    expect(candidate).toHaveClass("is-selected");
    expect(document.body).not.toHaveTextContent(/\b(COMMON|UNCOMMON|RARE)\b/);
    expect(document.body).not.toHaveTextContent(/INSTANCE|owned instances|PREVIEW/);
  });

  it("updates and pins exact item plus build comparisons on hover and click", () => {
    const store = useGameStore.getState();
    store.debug.setOwnedItemCount("item.hunter-shield", 1);
    store.debug.setHunterRank(5);
    equipOwnedItem("item.training-shield", "offhand");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(document.querySelector('[data-debug-kind="equipment-slot"][data-debug-slot-id="offhand"]') as HTMLElement);
    const candidate = document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.hunter-shield"]') as HTMLElement;

    fireEvent.mouseEnter(candidate);
    const comparison = document.querySelector('[data-debug-kind="equipment-item-comparison"]') as HTMLElement;
    expect(within(comparison).getByText("Hunter Shield")).toBeInTheDocument();
    expect(within(comparison).getByText("ITEM DIFFERENCES")).toBeInTheDocument();
    expect(within(comparison).getByText(/^BUILD IMPACT/)).toBeInTheDocument();

    fireEvent.click(candidate);
    fireEvent.mouseLeave(candidate);
    expect(within(comparison).getByText("Hunter Shield")).toBeInTheDocument();
    expect(candidate).toHaveAttribute("data-debug-preview-selected", "true");
  });

  it("keeps Manual inventory cards draggable without permanent drag chrome", () => {
    render(<TooltipProvider><InventoryScreen /></TooltipProvider>);
    fireEvent.change(screen.getByRole("combobox", { name: "Sort inventory" }), { target: { value: "manual" } });
    const card = document.querySelector('[data-debug-kind="inventory-item"]') as HTMLButtonElement;
    expect(card).toHaveAttribute("draggable", "true");
    expect(card).toHaveClass("is-manual");
    expect(card.querySelector(".item-drag-grip")).toBeNull();
    expect(document.body).not.toHaveTextContent("visible items can be dragged");
  });

  it("uses effective exact item values for local comparison rows", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-sword", 2);
    const [currentId, candidateId] = granted.createdInstanceIds;
    let inventory = setItemQuality(granted.inventory, currentId, 12).inventory;
    inventory = setItemUpgradeLevel(inventory, currentId, 3).inventory;
    inventory = setItemQuality(inventory, candidateId, 20).inventory;
    inventory = setItemUpgradeLevel(inventory, candidateId, 5).inventory;
    const current = resolveItemInstance(inventory, currentId)!;
    const candidate = resolveItemInstance(inventory, candidateId)!;
    const rows = buildEquipmentItemDifferenceRows(current, candidate);

    expect(rows.find((row) => row.key === "quality")).toMatchObject({ current: "12%", candidate: "20%", delta: "+8%" });
    expect(rows.find((row) => row.key === "upgrade")).toMatchObject({ current: "+3", candidate: "+5", delta: "+2" });
    const physicalDamage = rows.find((row) => row.key === "attackDamage");
    expect(physicalDamage).toBeDefined();
    expect(physicalDamage?.current).not.toBe(physicalDamage?.candidate);
  });
});
