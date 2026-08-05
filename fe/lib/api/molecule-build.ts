import type { Molecule } from "@/components/molecules/types";
import { BACKEND_HTTP_URL } from "@/lib/backend-url";
import { logSlideApi } from "@/lib/ws/slide-debug-log";

const BE = BACKEND_HTTP_URL;

type MoleculeBuildResponse = {
  name: string;
  atoms: Molecule["atoms"];
  bonds: Molecule["bonds"];
};

/** Reuses the existing AI molecule-structure endpoint (same as `MoleculeExplorer`'s "Tạo bằng AI"). */
export async function buildMolecule(input: string): Promise<Molecule> {
  logSlideApi("POST /api/molecules/build", { input });
  const res = await fetch(`${BE}/api/molecules/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`POST /api/molecules/build ${res.status}: ${detail || res.statusText}`);
  }
  const data = (await res.json()) as MoleculeBuildResponse;
  logSlideApi("molecules/build OK", { name: data.name, atoms: data.atoms.length, bonds: data.bonds.length });
  return { ...data, formula: "AI tạo" };
}
