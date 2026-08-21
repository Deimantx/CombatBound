import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { useGameStore } from "../state/gameStore";

describe("Equipment specialization presentation", () => {
  beforeEach(() => {
    cleanup();
    useGameStore.getState().resetGameplay();
  });

  afterEach(() => cleanup());

  it("keeps the production Hero Equipment screen free of the upgrade tree", () => {
    useGameStore.getState().debug.grantItem("item.iron-sword", 1);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(document.querySelector('[data-debug-kind="equipment-slot"][data-debug-slot-id="weapon"]') as HTMLElement);
    expect(document.querySelector('[data-debug-kind="item-upgrade-tree"]')).toBeNull();
    expect(document.body).not.toHaveTextContent("Tempered Edge I");
    expect(document.body).not.toHaveTextContent("Unlock");
    expect(document.body).toHaveTextContent(/Unspecialized/);
    expect(document.body).toHaveTextContent(/0 \/ 4/);
  });
});
