import { describe, expect, it } from "vitest";
import { normalizePracticeExamLatex, normalizePracticeExamMathText } from "./practice-exam-math";

describe("normalizePracticeExamLatex", () => {
  it("repairs common AI latex command omissions", () => {
    expect(normalizePracticeExamLatex("frac12gt² = frac12 cdot9,8 cdot(3,1)^2 approx47,1 textm"))
      .toBe("\\frac{1}{2}gt^2 = \\frac{1}{2} \\cdot 9,8 \\cdot (3,1)^2 \\approx 47,1 \\text{m}");
  });

  it("repairs malformed fractions with symbols", () => {
    expect(normalizePracticeExamLatex("a = fracDelta vDeltat = fracFm"))
      .toBe("a = \\frac{\\Delta v}{\\Delta t} = \\frac{F}{m}");
  });

  it("keeps already escaped compact fractions renderable", () => {
    expect(normalizePracticeExamLatex("\\frac12 m/s^2"))
      .toBe("\\frac{1}{2} m/s^2");
  });

  it("wraps an un-delimited, double-escaped formula", () => {
    expect(normalizePracticeExamMathText("F' = \\\\frac{k}{r^2}"))
      .toBe("$F' = \\frac{k}{r^2}$");
  });

  it("wraps bare frac, overline, and Delta as inline LaTex", () => {
    expect(normalizePracticeExamMathText("δ s = frac{Delta s}{overline{s}} · 100%"))
      .toBe("$δ s = \\frac{\\Delta s}{\\overline{s}} · 100%$");
  });
});
