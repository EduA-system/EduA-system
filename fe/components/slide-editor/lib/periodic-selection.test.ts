import { describe, expect, it } from "vitest";
import { defaultPeriodicSimulationElement } from "./periodic-selection";

describe("defaultPeriodicSimulationElement", () => {
  it("uses the first highlighted symbol authored for a periodic simulation", () => {
    const element = defaultPeriodicSimulationElement({
      mode: "table",
      elementSymbols: ["N"],
    });

    expect(element?.symbol).toBe("N");
  });

  it("returns null when the simulation has no valid highlighted symbol", () => {
    expect(defaultPeriodicSimulationElement({
      mode: "table",
      elementSymbols: ["not-an-element", "Xx"],
    })).toBeNull();
  });
});
