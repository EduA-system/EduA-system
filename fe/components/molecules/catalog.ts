import type { Molecule } from "./types";

export const MOLECULE_CATALOG: Molecule[] = [
  { name: "Metan", formula: "CH₄", atoms: [{ element: "C" }], bonds: [] },
  { name: "Etan", formula: "C₂H₆", atoms: [{ element: "C" }, { element: "C" }], bonds: [{ from: 0, to: 1, order: 1 }] },
  { name: "Propan", formula: "C₃H₈", atoms: [{ element: "C" }, { element: "C" }, { element: "C" }], bonds: [{ from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }] },
  { name: "Eten", formula: "C₂H₄", atoms: [{ element: "C" }, { element: "C" }], bonds: [{ from: 0, to: 1, order: 2 }] },
  { name: "Propen", formula: "C₃H₆", atoms: [{ element: "C" }, { element: "C" }, { element: "C" }], bonds: [{ from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 1 }] },
  { name: "Etin", formula: "C₂H₂", atoms: [{ element: "C" }, { element: "C" }], bonds: [{ from: 0, to: 1, order: 3 }] },
  { name: "Ethanol", formula: "C₂H₆O", atoms: [{ element: "C" }, { element: "C" }, { element: "O" }], bonds: [{ from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }] },
  { name: "Nước", formula: "H₂O", atoms: [{ element: "O" }], bonds: [] },
];

export function findMolecules(query: string, family: "all" | "alkane" | "alkene" | "alkyne") {
  const normalized = query.toLocaleLowerCase("vi").replaceAll(/[₂₃₄₅₆₇₈₉]/g, (c) => String("₂₃₄₅₆₇₈₉".indexOf(c) + 2));
  return MOLECULE_CATALOG.filter((molecule) => {
    const carbons = molecule.atoms.filter((atom) => atom.element === "C").length;
    const highestOrder = Math.max(0, ...molecule.bonds.map((bond) => bond.order));
    const matchesFamily = family === "all" || (family === "alkane" && carbons > 0 && highestOrder <= 1 && molecule.atoms.every((a) => a.element === "C")) || (family === "alkene" && highestOrder === 2) || (family === "alkyne" && highestOrder === 3);
    return matchesFamily && (!normalized || `${molecule.name} ${molecule.formula}`.toLocaleLowerCase("vi").includes(normalized));
  });
}
