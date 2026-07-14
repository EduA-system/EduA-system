/**
 * Isotopes used only for the educational atom visualisation.
 *
 * An element's standard atomic weight is a weighted average and cannot be
 * converted into a neutron count.  Each value below is a representative
 * isotope (generally the most abundant naturally occurring isotope). Elements
 * without a characteristic natural isotopic abundance deliberately have no
 * representative isotope rather than an inferred neutron count.
 * Source: https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?isotype=all
 * Cross-check: https://www.ciaaw.org/isotopic-abundances.htm
 */
interface RepresentativeIsotopeRecord {
  atomicNumber: number;
  massNumber: number | null;
  neutronCount: number | null;
  label: string;
  source: "NIST/CIAAW";
  requiresIsotopeSelection: boolean;
}

const REPRESENTATIVE_MASS_NUMBERS = [
  1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 40,
  39, 40, 45, 48, 51, 52, 55, 56, 59, 58, 63, 64, 69, 74, 75, 80, 79, 84,
  85, 88, 89, 90, 93, 98, null, 102, 103, 106, 107, 114, 115, 120, 121, 130,
  127, 132, 133, 138, 139, 140, 141, 142, null, 152, 153, 158, 159, 164,
  165, 166, 169, 174, 175, 180, 181, 184, 187, 192, 193, 195, 197, 202,
  205, 208, 209, null, null, null, null, null, null, 232, 231, 238, null, null,
  null, null, null, null, null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null, null, null,
] as const;

export const REPRESENTATIVE_ISOTOPES: Readonly<Record<number, RepresentativeIsotopeRecord>> =
  Object.fromEntries(
    REPRESENTATIVE_MASS_NUMBERS.map((massNumber, index) => {
      const atomicNumber = index + 1;
      return [
        atomicNumber,
        {
          atomicNumber,
          massNumber,
          neutronCount: massNumber === null ? null : massNumber - atomicNumber,
          label: massNumber === null ? "Không có đồng vị minh họa" : `A=${massNumber}`,
          source: "NIST/CIAAW" as const,
          requiresIsotopeSelection: massNumber === null,
        },
      ];
    }),
  );

export function representativeIsotopeFor(atomicNumber: number): RepresentativeIsotopeRecord | null {
  return REPRESENTATIVE_ISOTOPES[atomicNumber] ?? null;
}
