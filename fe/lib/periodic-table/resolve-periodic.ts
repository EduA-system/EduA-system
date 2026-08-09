import { ELEMENTS } from "@/components/periodic-table/data";
import type { PeriodicSimulationPayload } from "@/components/slide-editor/types";

const CATEGORY_KEYWORDS: Array<{ keyword: string; category: string; focus: string }> = [
  { keyword: "halogen", category: "halogen", focus: "Nhóm halogen" },
  { keyword: "khi hiem", category: "noble-gas", focus: "Khí hiếm" },
  { keyword: "noble gas", category: "noble-gas", focus: "Khí hiếm" },
  { keyword: "kim loai kiem tho", category: "alkaline-earth", focus: "Kim loại kiềm thổ" },
  { keyword: "alkaline earth", category: "alkaline-earth", focus: "Kim loại kiềm thổ" },
  { keyword: "kim loai kiem", category: "alkali-metal", focus: "Kim loại kiềm" },
  { keyword: "alkali", category: "alkali-metal", focus: "Kim loại kiềm" },
  { keyword: "kim loai chuyen tiep", category: "transition-metal", focus: "Kim loại chuyển tiếp" },
  { keyword: "transition metal", category: "transition-metal", focus: "Kim loại chuyển tiếp" },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function uniqueSymbols(symbols: string[]): string[] {
  const valid = new Set(ELEMENTS.map((element) => element.symbol));
  return [...new Set(symbols.filter((symbol) => valid.has(symbol)))];
}

function symbolsFromText(sourceText: string): string[] {
  const normalized = normalizeText(sourceText);
  const found: string[] = [];

  for (const match of sourceText.matchAll(/[A-Z][a-z]?/g)) {
    found.push(match[0]);
  }

  for (const element of ELEMENTS) {
    const nameNeedles = [element.name, element.nameVi].map(normalizeText).filter(Boolean);
    if (nameNeedles.some((name) => normalized.includes(name))) found.push(element.symbol);
  }

  return uniqueSymbols(found);
}

function groupSymbols(sourceText: string): { symbols: string[]; focus?: string } {
  const normalized = normalizeText(sourceText);
  const matched = CATEGORY_KEYWORDS.find((item) => normalized.includes(item.keyword));
  if (!matched) return { symbols: [] };
  return {
    symbols: ELEMENTS.filter((element) => element.category === matched.category).map((element) => element.symbol),
    focus: matched.focus,
  };
}

export function resolvePeriodicPayload(sourceText: string): PeriodicSimulationPayload | null {
  const requested = sourceText.trim();
  if (!requested) return null;

  const group = groupSymbols(requested);
  const symbols = uniqueSymbols([...group.symbols, ...symbolsFromText(requested)]);
  if (!symbols.length) return null;

  const normalized = normalizeText(requested);
  const tableKeywords = /\b(table|periodic|bang|nhom|chu ky|group|period|halogen)\b/i.test(normalized);
  return {
    mode: symbols.length === 1 && !tableKeywords ? "element" : "table",
    elementSymbols: symbols,
    focus: group.focus ?? requested,
  };
}
