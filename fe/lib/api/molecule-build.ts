import type { Molecule } from "@/components/molecules/types";
import { BACKEND_HTTP_URL } from "@/lib/backend-url";
import { getMoleculeAiBuildDiagnostics, logMoleculeAiBuildResponse } from "@/lib/api/molecule-ai-debug";
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
    const aiResult = {
      input,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      body: detail,
    };
    logMoleculeAiBuildResponse(aiResult);
    throw new Error(getMoleculeAiBuildDiagnostics(aiResult).userMessage);
  }
  const data = (await res.json()) as MoleculeBuildResponse;
  const aiResult = {
    input,
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    body: data,
  };
  logMoleculeAiBuildResponse(aiResult);
  const diagnostics = getMoleculeAiBuildDiagnostics(aiResult);
  if (!diagnostics.success) throw new Error(diagnostics.userMessage);
  logSlideApi("molecules/build OK", { name: data.name, atoms: data.atoms.length, bonds: data.bonds.length });
  return { ...data, formula: "AI tạo" };
}
