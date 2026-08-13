import { ELEMENTS } from "@/components/periodic-table/data";
import type { Element } from "@/components/periodic-table/types";
import type { PeriodicSimulationPayload } from "../types";

/**
 * Selects the first valid highlighted element in the order authored on a
 * periodic simulation. The authoring order is intentional: it determines the
 * element opened when a presentation viewer clicks the simulation.
 */
export function defaultPeriodicSimulationElement(
  periodic: PeriodicSimulationPayload,
): Element | null {
  const elementsBySymbol = new Map(ELEMENTS.map((element) => [element.symbol, element]));

  for (const symbol of periodic.elementSymbols) {
    const element = elementsBySymbol.get(symbol);
    if (element) return element;
  }

  return null;
}
