export const SUBSHELL_TYPES = ['s', 'p', 'd', 'f'] as const;
export type SubshellType = typeof SUBSHELL_TYPES[number];

export interface Subshell {
  n: number;
  type: SubshellType;
  electrons: number;
}

export interface OrbitalBox {
  arrows: ('up' | 'down')[];
}

export interface EnergySubshell extends Subshell {
  key: string;
  boxes: OrbitalBox[];
}

export interface ElectronShell {
  n: number;
  electrons: number;
  subshells: Subshell[];
}

export const SUBSHELL_CAPACITY: Record<SubshellType, number> = { s: 2, p: 6, d: 10, f: 14 };
export const ORBITAL_BOX_COUNT: Record<SubshellType, number> = { s: 1, p: 3, d: 5, f: 7 };

// Madelung / Aufbau order. It is deliberately independent from how a source
// writes a configuration (for example, [Ar] 3d2 4s2 for titanium).
export const AUFBAU_ORDER = [
  '1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s',
  '4f', '5d', '6p', '7s', '5f', '6d', '7p',
] as const;

const NOBLE_GAS: Record<string, string> = {
  He: '1s2', Ne: '1s2 2s2 2p6', Ar: '1s2 2s2 2p6 3s2 3p6',
  Kr: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6',
  Xe: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6',
  Rn: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6',
};

function normalizeSuperscripts(value: string): string {
  const chars = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return [...value].map(char => {
    const digit = chars.indexOf(char);
    return digit === -1 ? char : String(digit);
  }).join('');
}

export function subshellKey(subshell: Pick<Subshell, 'n' | 'type'>): string {
  return `${subshell.n}${subshell.type}`;
}

export function parseElectronConfig(config: string): Subshell[] {
  const expanded = normalizeSuperscripts(config).replace(/\[([A-Za-z]+)\]/g, (_, symbol: string) => NOBLE_GAS[symbol] ?? '');
  const byKey = new Map<string, Subshell>();
  for (const match of expanded.matchAll(/(\d+)([spdf])(\d+)/g)) {
    const n = Number(match[1]);
    const type = match[2] as SubshellType;
    const electrons = Number(match[3]);
    const valid = Number.isInteger(n) && n > 0 && n > SUBSHELL_TYPES.indexOf(type) && electrons >= 0 && electrons <= SUBSHELL_CAPACITY[type];
    if (!valid) continue;
    byKey.set(`${n}${type}`, { n, type, electrons });
  }
  return [...byKey.values()];
}

/**
 * Groups the ground-state configuration by principal quantum number.  This is
 * the only valid source for Bohr-style K–Q rings: transition and f-block
 * electrons must stay in their own n shell even when their energy is higher.
 */
export function getShellDistribution(config: string): ElectronShell[] {
  const shells = new Map<number, Subshell[]>();
  for (const subshell of parseElectronConfig(config)) {
    const current = shells.get(subshell.n) ?? [];
    current.push(subshell);
    shells.set(subshell.n, current);
  }
  return [...shells.entries()]
    .sort(([a], [b]) => a - b)
    .map(([n, subshells]) => ({
      n,
      subshells,
      electrons: subshells.reduce((total, subshell) => total + subshell.electrons, 0),
    }));
}

export function fillOrbitalBoxes(type: SubshellType, electrons: number): OrbitalBox[] {
  const boxes = Array.from({ length: ORBITAL_BOX_COUNT[type] }, () => ({ arrows: [] as ('up' | 'down')[] }));
  for (let index = 0; index < Math.min(electrons, boxes.length); index++) boxes[index].arrows.push('up');
  for (let index = 0; index < Math.min(Math.max(electrons - boxes.length, 0), boxes.length); index++) boxes[index].arrows.push('down');
  return boxes;
}

export function getEnergySubshells(config: string): EnergySubshell[] {
  const occupied = new Map(parseElectronConfig(config).map(subshell => [subshellKey(subshell), subshell]));
  return AUFBAU_ORDER.flatMap(key => {
    const subshell = occupied.get(key);
    return subshell ? [{ ...subshell, key, boxes: fillOrbitalBoxes(subshell.type, subshell.electrons) }] : [];
  });
}

export function validateElectronConfig(config: string, atomicNumber: number): string[] {
  const parsed = parseElectronConfig(config);
  const errors: string[] = [];
  if (parsed.reduce((total, subshell) => total + subshell.electrons, 0) !== atomicNumber) errors.push('electron total does not match atomic number');
  for (const subshell of parsed) {
    if (subshell.n <= SUBSHELL_TYPES.indexOf(subshell.type)) errors.push(`${subshellKey(subshell)} is not a valid subshell`);
    if (subshell.electrons > SUBSHELL_CAPACITY[subshell.type]) errors.push(`${subshellKey(subshell)} exceeds capacity`);
  }
  return errors;
}
