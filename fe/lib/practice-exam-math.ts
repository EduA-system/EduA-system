const COMMANDS = [
  "frac",
  "sqrt",
  "overline",
  "times",
  "theta",
  "alpha",
  "beta",
  "gamma",
  "pi",
  "Rightarrow",
  "leftarrow",
  "leq",
  "geq",
  "Delta",
];

export function normalizePracticeExamLatex(value: string): string {
  return value
    .trim()
    .replace(/\\\\(?=[A-Za-z])/g, "\\")
    .replaceAll("²", "^2")
    .replace(/(?<!\\)frac\s*Delta\s*([A-Za-z])\s*Delta\s*([A-Za-z])/g, "\\frac{\\Delta $1}{\\Delta $2}")
    .replace(/\\frac\s*Delta\s*([A-Za-z])\s*Delta\s*([A-Za-z])/g, "\\frac{\\Delta $1}{\\Delta $2}")
    .replace(/(?<!\\)frac\s*([0-9])\s*([0-9])/g, "\\frac{$1}{$2}")
    .replace(/\\frac\s*([0-9])\s*([0-9])/g, "\\frac{$1}{$2}")
    .replace(/(?<!\\)frac\s*([A-Za-z])\s*([A-Za-z])/g, "\\frac{$1}{$2}")
    .replace(/\\frac\s*([A-Za-z])\s*([A-Za-z])(?![A-Za-z])/g, "\\frac{$1}{$2}")
    .replace(/(?<!\\)text\s*([A-Za-z][A-Za-z0-9/^]*)/g, "\\text{$1}")
    .replace(/\\text(?!\{)\s*([A-Za-z][A-Za-z0-9/^]*)/g, "\\text{$1}")
    .replace(/(?<!\\)(cdot|approx|cos|sin|tan)(?=[0-9A-Za-z({])/g, "\\$1 ")
    .replace(new RegExp(`(?<!\\\\)\\b(${COMMANDS.join("|")})\\b`, "g"), "\\$1")
    .replace(/\\(cdot|approx|cos|sin|tan)(?=[0-9A-Za-z({])/g, "\\$1 ")
    .replace(/(?<!\\)\bDelta\b/g, "\\Delta");
}

export function normalizePracticeExamMathText(value: string): string {
  return value.split("\n").map((line) => {
    if (line.includes("$")) return line;
    const unescaped = line.replace(/\\\\(?=[A-Za-z])/g, "\\");
    if (/(?:\\)?(?:frac|sqrt|overline|vec|cdot|approx|cos|sin|tan|text|Delta)\b/.test(unescaped)) {
      return `$${normalizePracticeExamLatex(unescaped)}$`;
    }
    return unescaped.replace(/(?<!\\)\bvec\s*([A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?)/g, "$\\vec{$1}$");
  }).join("\n");
}
