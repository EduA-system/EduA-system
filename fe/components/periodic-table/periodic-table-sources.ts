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
      note: 'The PUG CSV currently has AtomicRadius, not a van der Waals radius. The UI therefore stores vanDerWaalsRadius as null until an attributable VdW source is reviewed.',
    },
  },
} as const;
