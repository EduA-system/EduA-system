import type { BondOrder, MoleculeGraph } from "@/components/molecules/types";

const BE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type MoleculeBuildResponse = {
  name: string;
  atoms: Array<{ element: string }>;
  bonds: Array<{ from: number; to: number; order: number }>;
};

export async function buildMoleculeFromAi(input: string): Promise<MoleculeGraph> {
  const response = await fetch(`${BE}/api/molecules/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    let message = `Không thể tạo phân tử (HTTP ${response.status}).`;
    try {
      const body = await response.json() as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // Giữ thông báo HTTP khi backend không trả JSON.
    }
    throw new Error(message);
  }

  const body = await response.json() as MoleculeBuildResponse;
  return {
    name: body.name,
    atoms: body.atoms,
    bonds: body.bonds.map((bond) => ({
      a: bond.from,
      b: bond.to,
      order: bond.order as BondOrder,
    })),
  };
}
