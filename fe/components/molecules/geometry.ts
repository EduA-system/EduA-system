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
  return { atoms: centerOnOrigin(atoms), bonds };
}

/**
 * Vị trí mặc định ở trên xếp nguyên tử zig-zag quanh trục x với y = ±0.35, nên phân tử có số
 * nguyên tử lẻ (CH₄, H₂O) nằm hẳn dưới gốc toạ độ và hiển thị lệch xuống đáy khung. Dời cả khối
 * theo tâm bounding box để camera luôn nhìn vào giữa phân tử, kể cả khi hydro sinh thêm không đối xứng.
 */
function centerOnOrigin(atoms: Required<MoleculeAtom>[]): Required<MoleculeAtom>[] {
  if (!atoms.length) return atoms;
  const center = ([0, 1, 2] as const).map((axis) => {
    const values = atoms.map((atom) => atom.position[axis]);
    return (Math.min(...values) + Math.max(...values)) / 2;
  });
  return atoms.map((atom) => ({
    ...atom,
    position: [atom.position[0] - center[0], atom.position[1] - center[1], atom.position[2] - center[2]] as [number, number, number],
  }));
}
