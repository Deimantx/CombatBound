import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DebugItemsTab } from "../app/debug/admin/tabs/DebugItemsTab";
import { InventoryScreen } from "../app/screens/inventory/InventoryScreen";
import { formatCompactQuantity } from "../app/screens/inventory/InventoryCard";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { useGameStore } from "../state/gameStore";

describe("Phase 4 inventory and debug UI", () => {
  beforeEach(() => { localStorage.clear(); useGameStore.getState().resetGameplay(); });
  afterEach(() => { cleanup(); useGameStore.getState().resetGameplay(); });

  it("uses nested collapsible taxonomy branches and restores manual expansion after search", () => {
    const debug = useGameStore.getState().debug;
    render(<DebugItemsTab debug={debug} run={(_, action) => action()} />);
    const browser = document.querySelector('[data-debug-kind="debug-item-browser"]') as HTMLElement;
    const weapons = within(browser).getByRole("button", { name: /Weapons/ });
    expect(within(browser).getByRole("button", { name: /One-Handed/ })).toBeVisible();
    fireEvent.click(weapons);
    expect(within(browser).queryByRole("button", { name: /One-Handed/ })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Search items" }), { target: { value: "Ring of Precision" } });
    expect(within(browser).getByRole("button", { name: "Inspect Ring of Precision" })).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Search items" }), { target: { value: "" } });
    expect(within(browser).queryByRole("button", { name: /One-Handed/ })).toBeNull();
  });

  it("confirms and deletes the selected exact copy", () => {
    const debug = useGameStore.getState().debug;
    debug.setOwnedItemCount("item.hunter-sword", 3);
    render(<DebugItemsTab debug={debug} run={(_, action) => action()} />);
    const browser = document.querySelector('[data-debug-kind="debug-item-browser"]') as HTMLElement;
    const weapons = within(browser).getByRole("button", { name: /Weapons/ });
    if (weapons.getAttribute("aria-expanded") === "false") fireEvent.click(weapons);
    fireEvent.click(screen.getByRole("button", { name: "Inspect Hunter Sword" }));
    const inspector = document.querySelector('[data-debug-kind="debug-item-inspector"]') as HTMLElement;
    fireEvent.click(within(inspector).getByRole("button", { name: "Inspect Hunter Sword Copy 2" }));
    fireEvent.click(within(inspector).getByRole("button", { name: "Delete This Copy" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Delete Copy 2?");
    fireEvent.click(screen.getByRole("button", { name: "Delete Copy" }));
    expect(within(inspector).getByText("OWNED COPIES").parentElement).toHaveTextContent("2");
  });

  it("keeps normal inventory copy cards compact and free of implementation copy", () => {
    render(<TooltipProvider><InventoryScreen /></TooltipProvider>);
    expect(screen.getByText("Carried Items")).toBeInTheDocument();
    expect(screen.getByText("Item Details")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/Inventory toolbar|Human-readable item inspection|Each gear copy is shown separately/);
    const card = document.querySelector('[data-debug-kind="inventory-item"]') as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card.querySelector("small")).toBeNull();
    expect(card).not.toHaveTextContent(/Q0|\+0|0 Mods|common|uncommon|rare/);
  });

  it("formats stack quantities compactly on cards", () => {
    expect(formatCompactQuantity(943)).toBe("943");
    expect(formatCompactQuantity(1_200)).toBe("1.2K");
    expect(formatCompactQuantity(34_000)).toBe("34K");
    expect(formatCompactQuantity(1_100_000)).toBe("1.1M");
  });

  it("drills through owned equipment taxonomy in an in-flow browse drawer", () => {
    render(<TooltipProvider><InventoryScreen /></TooltipProvider>);
    fireEvent.click(screen.getByRole("tab", { name: "Equipment" }));
    fireEvent.click(screen.getByRole("button", { name: "Browse" }));
    let drawer = document.querySelector('[data-debug-kind="inventory-browse-drawer"]') as HTMLElement;
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: /Weapons/ })).toBeVisible();
    expect(within(drawer).queryByRole("button", { name: /Accessories/ })).toBeNull();

    fireEvent.click(within(drawer).getByRole("button", { name: /Weapons/ }));
    drawer = document.querySelector('[data-debug-kind="inventory-browse-drawer"]') as HTMLElement;
    expect(within(drawer).getByRole("button", { name: /One-Handed/ })).toBeVisible();
    expect(within(drawer).queryByRole("button", { name: /Ranged/ })).toBeNull();
    fireEvent.click(within(drawer).getByRole("button", { name: /One-Handed/ }));
    drawer = document.querySelector('[data-debug-kind="inventory-browse-drawer"]') as HTMLElement;
    expect(within(drawer).getByRole("button", { name: /One-Handed Swords/ })).toBeVisible();
    fireEvent.click(within(drawer).getByRole("button", { name: /One-Handed Swords/ }));

    expect(document.querySelector('[data-debug-kind="inventory-browse-drawer"]')).toBeNull();
    expect(screen.getByRole("button", { name: "One-Handed Swords" })).toBeVisible();
    expect(document.querySelectorAll('[data-ui-panel="inventoryBank"] [data-debug-item-id="item.training-sword"]').length).toBe(1);
  });

  it("shows results only for search or advanced filters and changes sort options by category", () => {
    render(<TooltipProvider><InventoryScreen /></TooltipProvider>);
    expect(screen.queryByText(/results/)).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Equipment" }));
    expect(screen.queryByText(/results/)).toBeNull();
    const sort = screen.getByRole("combobox", { name: "Sort inventory" }) as HTMLSelectElement;
    expect(Array.from(sort.options).map((option) => option.text)).not.toContain("Quantity");
    fireEvent.click(screen.getByRole("tab", { name: "Materials" }));
    expect(Array.from(sort.options).map((option) => option.text)).toEqual(["Sort by...", "Name", "Rarity", "Recently Acquired", "Quantity"]);
    fireEvent.change(screen.getByRole("textbox", { name: "Search inventory" }), { target: { value: "Training" } });
    expect(screen.getByText(/results/)).toBeInTheDocument();
  });

  it("updates owned browse counts when exact copies are granted or deleted", () => {
    const debug = useGameStore.getState().debug;
    render(<TooltipProvider><InventoryScreen /></TooltipProvider>);
    fireEvent.click(screen.getByRole("tab", { name: "Equipment" }));
    fireEvent.click(screen.getByRole("button", { name: "Browse" }));
    let drawer = document.querySelector('[data-debug-kind="inventory-browse-drawer"]') as HTMLElement;
    fireEvent.click(within(drawer).getByRole("button", { name: /Weapons/ }));
    drawer = document.querySelector('[data-debug-kind="inventory-browse-drawer"]') as HTMLElement;
    fireEvent.click(within(drawer).getByRole("button", { name: /One-Handed/ }));
    drawer = document.querySelector('[data-debug-kind="inventory-browse-drawer"]') as HTMLElement;
    expect(within(drawer).getByRole("button", { name: /One-Handed Swords/ })).toHaveTextContent("1");

    act(() => debug.setOwnedItemCount("item.hunter-sword", 2));
    drawer = document.querySelector('[data-debug-kind="inventory-browse-drawer"]') as HTMLElement;
    expect(within(drawer).getByRole("button", { name: /One-Handed Swords/ })).toHaveTextContent("3");
    const copies = Object.values(useGameStore.getState().game.inventory.instances).filter((instance) => instance.definitionId === "item.hunter-sword");
    act(() => debug.deleteItemInstance(copies[0].id));
    drawer = document.querySelector('[data-debug-kind="inventory-browse-drawer"]') as HTMLElement;
    expect(within(drawer).getByRole("button", { name: /One-Handed Swords/ })).toHaveTextContent("2");
  });

  it("uses concrete equipment type metadata and exposes alternate-slot movement", () => {
    const debug = useGameStore.getState().debug;
    debug.setOwnedItemCount("item.ring-of-precision", 2);
    debug.setMasteryLevel(10);
    const ringIds = Object.values(useGameStore.getState().game.inventory.instances).filter((instance) => instance.definitionId === "item.ring-of-precision").map((instance) => instance.id);
    useGameStore.getState().equipItemInstance(ringIds[0], "ring1");
    render(<TooltipProvider><InventoryScreen /></TooltipProvider>);
    const ringCard = document.querySelector('[data-debug-item-id="item.ring-of-precision"]') as HTMLElement;
    fireEvent.click(ringCard);
    const details = document.querySelector('[data-ui-panel="inventoryDetails"]') as HTMLElement;
    expect(details).not.toHaveTextContent("ACCESSORY");
    expect(details).toHaveTextContent("RING");
    fireEvent.click(within(details).getByRole("button", { name: /Ring 2/ }));
    expect(within(details).getByRole("button", { name: "Move to Ring 2" })).toBeEnabled();
    expect(details).not.toHaveTextContent("COMPARISON");
  });
});
