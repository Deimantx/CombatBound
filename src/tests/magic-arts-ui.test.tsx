import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { useGameStore } from "../state/gameStore";

beforeEach(() => useGameStore.getState().resetGameplay());
afterEach(() => cleanup());

describe("Magic Arts browser", () => {
  it("opens the dedicated browser and inert specialization preview", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Proficiencies" }));
    fireEvent.click(document.querySelector('[data-debug-kind="proficiency-tile"][data-debug-proficiency-id="magic-arts"]') as HTMLElement);
    expect(document.querySelector('[data-debug-kind="magic-arts-browser"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-debug-kind="magic-art-node"]')).toHaveLength(16);
    fireEvent.click(screen.getByRole("button", { name: "Earth Shield, Magic Art" }));
    fireEvent.click(screen.getByRole("button", { name: "OPEN SPECIALIZATION" }));
    expect(document.querySelector('[data-debug-kind="magic-art-specialization"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-debug-kind="magic-art-specialization-node"]')).toHaveLength(23);
    const before = JSON.stringify(useGameStore.getState().game);
    fireEvent.click(screen.getByRole("button", { name: /Specialization placeholder earth-shield.preview.01/ }));
    expect(JSON.stringify(useGameStore.getState().game)).toBe(before);
    fireEvent.click(screen.getByRole("button", { name: "BACK" }));
    expect(document.querySelector('[data-debug-kind="magic-arts-browser"]')).toBeInTheDocument();
  });
});
