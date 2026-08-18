import { describe, expect, it } from "vitest";
import { perHour } from "../game/offline/offlineResultMetrics";

describe("Offline result metrics", () => {
  it("uses the full requested skip for effective hourly rates", () => {
    expect(perHour(500, 1800)).toBe(1000);
    expect(perHour(500, 600)).toBe(3000);
    expect(perHour(500, 0)).toBe(0);
  });
});
