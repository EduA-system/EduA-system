import { describe, expect, it } from "vitest";
import { resolvePeriodicPayload } from "@/lib/periodic-table/resolve-periodic";

describe("resolvePeriodicPayload", () => {
  it("extracts element symbols from formulas and symbol lists", () => {
    expect(resolvePeriodicPayload("H2O")?.elementSymbols).toEqual(["H", "O"]);
    expect(resolvePeriodicPayload("Na, Cl trong bảng tuần hoàn")).toMatchObject({
      mode: "table",
      elementSymbols: ["Na", "Cl"],
    });
  });

  it("expands common periodic groups locally", () => {
    const payload = resolvePeriodicPayload("nhóm halogen");

    expect(payload?.mode).toBe("table");
    expect(payload?.focus).toBe("Nhóm halogen");
    expect(payload?.elementSymbols).toEqual(expect.arrayContaining(["F", "Cl", "Br", "I"]));
  });
});
