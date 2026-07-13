/**
 * Provenance for the reviewed, committed periodic-table snapshot.  These URLs
 * are intentionally data documentation, not runtime dependencies.
 */
export const PERIODIC_TABLE_SNAPSHOT_METADATA = {
  schemaVersion: 1,
  reviewedAt: '2026-07-13',
  retrievedAt: '2026-07-13',
  sources: {
    identityAndAtomicWeight: {
      provider: 'IUPAC/CIAAW',
      version: 'CIAAW 2024',
      url: 'https://ciaaw.org/atomic-weights.htm',
    },
    isotopes: {
      provider: 'NIST/CIAAW',
      url: 'https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?isotype=all',
    },
    electronConfigurationAndIonizationEnergy: {
      provider: 'NIST ASD',
      url: 'https://physics.nist.gov/asd',
      unit: 'kJ/mol',
    },
    physicalProperties: {
      provider: 'PubChem PUG REST',
      url: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/CSV',
      fields: ['state', 'melting point', 'boiling point', 'density', 'Pauling electronegativity', 'electron affinity'],
      note: 'The PUG CSV has AtomicRadius, not a van der Waals radius, so VdW data is tracked as a separate reviewed snapshot.',
    },
    vanDerWaalsRadii: {
      provider: 'HORTON elements.csv',
      url: 'https://github.com/theochem/horton/blob/master/data/elements.csv',
      unit: 'pm',
      fields: ['vdw_radius_bondi', 'vdw_radius_truhlar', 'vdw_radius_rt', 'vdw_radius_batsanov'],
      note: 'Values are converted from angstrom to picometer. Missing reviewed values remain null.',
    },
  },
} as const;
