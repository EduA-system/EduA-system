export type ElementSymbol = "C" | "N" | "O" | "F" | "P" | "S" | "Cl" | "Br" | "I" | "H";

export type MoleculeAtom = { element: ElementSymbol; position?: [number, number, number] };
export type MoleculeBond = { from: number; to: number; order: 1 | 2 | 3 };
export type Molecule = { name: string; formula: string; atoms: MoleculeAtom[]; bonds: MoleculeBond[] };
export type RenderMode = "ball-and-stick" | "space-filling";
