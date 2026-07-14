import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const periodicTableDir = path.join(here, '..', 'components', 'periodic-table');
const diffPath = path.join(here, '..', 'data', 'periodic-table', 'snapshot-diff.csv');
const data = fs.readFileSync(path.join(periodicTableDir, 'data.ts'), 'utf8');
const isotopeSource = fs.readFileSync(path.join(periodicTableDir, 'representative-isotopes.ts'), 'utf8');
const provenance = fs.readFileSync(path.join(periodicTableDir, 'periodic-table-sources.ts'), 'utf8');
const pubChemProperties = fs.readFileSync(path.join(periodicTableDir, 'snapshot-pubchem-properties.ts'), 'utf8');
const csv = process.argv.includes('--format=csv');
const superscripts = Object.fromEntries(['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'].map((value, index) => [value, String(index)]));
const nobleGasElectrons = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };
const nobleGasConfigurations = {
  He: '1s2',
  Ne: '1s2 2s2 2p6',
  Ar: '1s2 2s2 2p6 3s2 3p6',
  Kr: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6',
  Xe: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6',
  Rn: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6',
};
const subshellCapacity = { s: 2, p: 6, d: 10, f: 14 };
const angularMomentum = { s: 0, p: 1, d: 2, f: 3 };

function field(line, name) {
  const match = line.match(new RegExp(`${name}:\\s*([^,}]+)`));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? null;
}

function electronCount(configuration) {
  const nobleGas = configuration.match(/^\[([A-Za-z]+)\]/)?.[1];
  let total = nobleGas ? nobleGasElectrons[nobleGas] : 0;
  const expanded = configuration.replace(/^\[[A-Za-z]+\]/, '');
  for (const [, exponent] of expanded.matchAll(/\d[spdf]([⁰¹²³⁴⁵⁶⁷⁸⁹\d]+)/g)) {
    total += Number([...exponent].map((char) => superscripts[char] ?? char).join(''));
  }
  return total;
}

function configurationErrors(configuration, atomicNumber) {
  const errors = [];
  const expanded = configuration.replace(/^\[[A-Za-z]+\]/, '');
  for (const [, nText, type, exponent] of expanded.matchAll(/(\d+)([spdf])([â°Â¹Â²Â³â´âµâ¶â·â¸â¹\d]+)/g)) {
    const n = Number(nText);
    const electrons = Number([...exponent].map((char) => superscripts[char] ?? char).join(''));
    if (n <= angularMomentum[type]) errors.push(`${n}${type}: invalid subshell (l must be less than n)`);
    if (electrons > subshellCapacity[type]) errors.push(`${n}${type}: exceeds ${subshellCapacity[type]} electron capacity`);
  }
  if (electronCount(configuration) !== atomicNumber) errors.push('electron total does not match atomic number');
  return errors;
}

function shellDistribution(configuration) {
  const nobleGas = configuration.match(/^\[([A-Za-z]+)\]/)?.[1];
  const expanded = configuration.replace(/^\[[A-Za-z]+\]/, nobleGasConfigurations[nobleGas] ?? '');
  const normalized = [...expanded].map((char) => superscripts[char] ?? char).join('');
  const shells = [];
  for (const [, nText, , electronsText] of normalized.matchAll(/(\d+)([spdf])(\d+)/g)) {
    const index = Number(nText) - 1;
    shells[index] = (shells[index] ?? 0) + Number(electronsText);
  }
  return shells.map((electrons) => electrons ?? 0);
}

const expectedShells = {
  H: [1],
  O: [2, 6],
  Cr: [2, 8, 13, 1],
  Cu: [2, 8, 18, 1],
  Ce: [2, 8, 18, 19, 9, 2],
};

const massNumbersBlock = isotopeSource.match(/REPRESENTATIVE_MASS_NUMBERS = \[([\s\S]*?)\] as const/);
const massNumbers = massNumbersBlock?.[1]
  .split(',').map((value) => value.trim().replace(/\s+/g, '')).filter(Boolean)
  .map((value) => value === 'null' ? null : Number(value)) ?? [];
const elements = data.split('\n').filter((line) => line.includes('{ atomicNumber:')).map((line) => ({
  atomicNumber: Number(field(line, 'atomicNumber')),
  symbol: field(line, 'symbol'),
  period: Number(field(line, 'period')),
  group: field(line, 'group'),
  block: field(line, 'block'),
  protons: Number(field(line, 'protons')),
  legacyNeutrons: Number(field(line, 'neutrons')),
  electrons: Number(field(line, 'electrons')),
  configuration: field(line, 'electronConfig'),
}));

const errors = [];
const seenNumbers = new Set();
const seenSymbols = new Set();
for (const element of elements) {
  if (seenNumbers.has(element.atomicNumber)) errors.push(`${element.symbol}: duplicate atomic number`);
  if (seenSymbols.has(element.symbol)) errors.push(`${element.symbol}: duplicate symbol`);
  seenNumbers.add(element.atomicNumber);
  seenSymbols.add(element.symbol);
  if (element.period < 1 || element.period > 7) errors.push(`${element.symbol}: invalid period`);
  if (element.group !== 'null' && (!Number.isInteger(Number(element.group)) || Number(element.group) < 1 || Number(element.group) > 18)) errors.push(`${element.symbol}: invalid group`);
  if (!['s', 'p', 'd', 'f'].includes(element.block)) errors.push(`${element.symbol}: invalid block`);
  if (element.protons !== element.atomicNumber || element.electrons !== element.atomicNumber) errors.push(`${element.symbol}: neutral atom invariant failed`);
  for (const error of configurationErrors(element.configuration, element.atomicNumber)) errors.push(`${element.symbol}: ${error}`);
  const shellTotal = shellDistribution(element.configuration).reduce((total, electrons) => total + electrons, 0);
  if (shellTotal !== element.atomicNumber) errors.push(`${element.symbol}: shell distribution total is invalid`);
  const expected = expectedShells[element.symbol];
  if (expected && shellDistribution(element.configuration).join(',') !== expected.join(',')) errors.push(`${element.symbol}: expected shells ${expected.join('-')}, found ${shellDistribution(element.configuration).join('-')}`);
}
if (elements.length !== 118) errors.push(`Expected 118 elements, found ${elements.length}`);
if (massNumbers.length !== 118) errors.push(`Expected 118 isotope entries, found ${massNumbers.length}`);
for (const [index, massNumber] of massNumbers.entries()) {
  if (massNumber !== null && (!Number.isInteger(massNumber) || massNumber - (index + 1) < 0)) errors.push(`Z=${index + 1}: invalid representative isotope`);
}
for (const required of ['CIAAW 2024', 'NIST ASD', 'PubChem PUG REST', 'reviewedAt']) {
  if (!provenance.includes(required)) errors.push(`Missing provenance: ${required}`);
}
if ((pubChemProperties.match(/^  \d+: /gm) ?? []).length !== 118) errors.push('Expected 118 normalized PubChem property records');
if (!data.includes('...pubChem')) errors.push('UI snapshot is not using normalized PubChem properties');
if (!data.includes('atomicWeightFor') || !data.includes('representativeIsotope')) errors.push('Snapshot does not expose atomic-weight and isotope fields');
if (data.includes('neutrons={shown.neutrons}')) errors.push('UI still passes legacy neutron data to the model');

const csvLines = ['atomicNumber,symbol,legacyNeutronCount,representativeMassNumber,representativeNeutronCount,status'];
for (const element of elements) {
    const massNumber = massNumbers[element.atomicNumber - 1];
    const neutronCount = massNumber === null ? '' : massNumber - element.atomicNumber;
    const status = massNumber === null ? 'NO_REPRESENTATIVE_ISOTOPE' : neutronCount === element.legacyNeutrons ? 'UNCHANGED' : 'ISOTOPE_DISPLAY_CHANGED';
    csvLines.push(`${element.atomicNumber},${element.symbol},${element.legacyNeutrons},${massNumber ?? ''},${neutronCount},${status}`);
}
if (process.argv.includes('--write-diff')) {
  fs.mkdirSync(path.dirname(diffPath), { recursive: true });
  fs.writeFileSync(diffPath, `${csvLines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${diffPath}`);
}
if (csv) {
  console.log(csvLines.join('\n'));
} else {
  console.log(`Checked ${elements.length} reviewed snapshot records, ${massNumbers.length} isotope records, and provenance metadata.`);
  console.log(`Errors: ${errors.length}.`);
  for (const error of errors) console.error(`ERROR: ${error}`);
}
process.exitCode = errors.length ? 1 : 0;
