export type PhysicsSimulationParamSchemaEntry = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
};

export type PhysicsSimulationEditRequest = {
  instruction: string;
  presetTitle: string;
  paramSchema: PhysicsSimulationParamSchemaEntry[];
  currentValues: Record<string, number>;
};

export type PhysicsSimulationEditResponse = {
  params: Record<string, number>;
  explanation: string;
};

async function unpack<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "AI không thể chỉnh sửa mô phỏng.");
  }
  return res.json() as Promise<T>;
}

export function editPhysicsSimulation(
  authFetch: (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  body: PhysicsSimulationEditRequest,
) {
  return authFetch("/api/physics-simulations/ai-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(unpack<PhysicsSimulationEditResponse>);
}
