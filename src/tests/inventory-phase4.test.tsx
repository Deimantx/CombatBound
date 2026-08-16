import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DebugItemsTab } from "../app/debug/admin/tabs/DebugItemsTab";
import { InventoryScreen } from "../app/screens/inventory/InventoryScreen";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { useGameStore } from "../state/gameStore";

describe("Phase 4 inventory and debug UI", () => {
  beforeEach(() => localStorage.clear());
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
  });
});
