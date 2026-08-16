import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebugItemsTab } from "../app/debug/admin/tabs/DebugItemsTab";
import { useGameStore } from "../state/gameStore";

function renderItems() {
  const debug = useGameStore.getState().debug;
  render(<DebugItemsTab debug={debug} run={(_, action) => action()} />);
}

describe("Debug Items Phase 3 inspector", () => {
  it("keeps the browser shallow and exposes a responsive inspector", () => {
    renderItems();
    const workspace = document.querySelector('[data-debug-kind="debug-items-workspace"]');
    expect(workspace).not.toBeNull();
    const browser = document.querySelector('[data-debug-kind="debug-item-browser"]') as HTMLElement;
    expect(browser).toBeInTheDocument();
    expect(within(browser).queryByRole("textbox")).toBeNull();
    expect(document.querySelector('[data-debug-kind="debug-item-inspector"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="debug-item-instance-controls"]')).toBeNull();
  });

  it("supports copy editing, exact-tier add, reroll feedback, removal, and advanced IDs", () => {
    renderItems();
    const inspector = document.querySelector('[data-debug-kind="debug-copy-inspector"]') as HTMLElement;
    fireEvent.click(within(inspector).getByRole("button", { name: "Increase quality" }));
    expect(document.querySelector('[data-debug-kind="debug-item-copy"]')).toHaveTextContent("Q1");
    fireEvent.change(within(inspector).getByRole("combobox", { name: /Choose affix/ }), { target: { value: "affix.sharpened|affix.sharpened.t1" } });
    fireEvent.click(within(inspector).getByRole("button", { name: "ADD" }));
    expect(inspector.querySelector(".debug-affix-row small")).toHaveTextContent("Sharpened: Increased Physical Damage");
    fireEvent.click(within(inspector).getByRole("button", { name: "REROLL" }));
    expect(within(inspector).getByRole("status")).toHaveTextContent(/rerolled/i);
    fireEvent.click(within(inspector).getByRole("button", { name: "REMOVE" }));
    expect(within(inspector).getByText("No affixes on this copy.")).toBeInTheDocument();
    fireEvent.click(within(inspector).getByRole("button", { name: "Advanced technical data" }));
    expect(within(inspector).getByText(/Instance: item-instance-/)).toBeInTheDocument();
  });
});
