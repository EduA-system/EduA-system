import type { ElementSymbol, Molecule, MoleculeAtom, MoleculeBond } from "./types";

const VALENCE: Record<ElementSymbol, number> = { C: 4, N: 3, O: 2, F: 1, P: 5, S: 6, Cl: 1, Br: 1, I: 1, H: 1 };
const DIRECTIONS: [number, number, number][] = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1], [1, 0, 0], [0, 1, 0]];

export type PositionedMolecule = { atoms: Required<MoleculeAtom>[]; bonds: MoleculeBond[] };

export function buildGeometry(molecule: Molecule): PositionedMolecule {
  const atoms = molecule.atoms.map((atom, index) => ({ ...atom, position: atom.position ?? [index * 1.5 - ((molecule.atoms.length - 1) * 1.5) / 2, index % 2 ? 0.35 : -0.35, 0] as [number, number, number] }));
  const bonds = [...molecule.bonds];
  molecule.atoms.forEach((atom, index) => {
    const used = molecule.bonds.reduce((sum, bond) => sum + (bond.from === index || bond.to === index ? bond.order : 0), 0);
    const hydrogens = Math.max(0, VALENCE[atom.element] - used);
    for (let h = 0; h < hydrogens; h += 1) {
      const direction = DIRECTIONS[(index + h) % DIRECTIONS.length];
      const p = atoms[index].position;
      atoms.push({ element: "H", position: [p[0] + direction[0] * 0.72, p[1] + direction[1] * 0.72, p[2] + direction[2] * 0.72] });
      bonds.push({ from: index, to: atoms.length - 1, order: 1 });
    }
  });
  return { atoms, bonds };
}
