import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebugItemsTab } from "../app/debug/admin/tabs/DebugItemsTab";
import { useGameStore } from "../state/gameStore";

describe("Debug Items gear inspector", () => {
  it("keeps the browser shallow and exposes an exact-instance upgrade harness", () => {
    const debug = useGameStore.getState().debug;
    render(<DebugItemsTab debug={debug} run={(_, action) => action()} />);
    const workspace = document.querySelector('[data-debug-kind="debug-items-workspace"]');
    expect(workspace).not.toBeNull();
    const tree = document.querySelector('[data-debug-kind="item-upgrade-tree"]') as HTMLElement;
    expect(tree).toBeInTheDocument();
    expect(tree).toHaveAttribute("data-debug-instance-id");
    expect(within(tree).getByText("Tempered")).toBeInTheDocument();
    expect(within(tree).getByText("Duelist")).toBeInTheDocument();
    expect(within(tree).getByText("Counterguard")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("DEBUG RESET ITEM UPGRADES");
  });
});
