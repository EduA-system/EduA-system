type MoleculeAiBuildLogInput = {
  input: string;
  ok: boolean;
  status: number;
  statusText?: string;
  body: unknown;
};

type MoleculeAiBuildDiagnostics = {
  success: boolean;
  reasonCode?: string;
  userMessage: string;
  developerReason?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getMessage(body: unknown): string | undefined {
  if (isRecord(body)) return typeof body.message === "string" ? body.message : undefined;
  if (typeof body !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(body);
    return isRecord(parsed) && typeof parsed.message === "string" ? parsed.message : body;
  } catch {
    return body || undefined;
  }
}

function hasMoleculeShape(body: unknown): boolean {
  return isRecord(body)
    && typeof body.name === "string"
    && body.name.trim().length > 0
    && Array.isArray(body.atoms)
    && Array.isArray(body.bonds);
}

export function getMoleculeAiBuildDiagnostics({ input, ok, body }: MoleculeAiBuildLogInput): MoleculeAiBuildDiagnostics {
  const validShape = hasMoleculeShape(body);
  const message = getMessage(body);

  if (ok && validShape) {
    return {
      success: true,
      userMessage: "Đã tạo mô hình phân tử.",
    };
  }

  const normalizedMessage = message?.toLocaleLowerCase("vi") ?? "";

  if (normalizedMessage.includes("phản hồi quá lâu")) {
    return {
      success: false,
      reasonCode: "ai_timeout",
      userMessage: "AI phản hồi quá lâu. Hãy thử lại sau vài giây.",
      developerReason: message,
    };
  }

  if (normalizedMessage.includes("không thể kết nối")) {
    return {
      success: false,
      reasonCode: "ai_unavailable",
      userMessage: "Chưa kết nối được dịch vụ AI. Hãy thử lại sau.",
      developerReason: message,
    };
  }

  if (normalizedMessage.includes("nguyên tố không được hỗ trợ")) {
    return {
      success: false,
      reasonCode: "unsupported_element",
      userMessage: "Mô hình hiện chỉ hỗ trợ các nguyên tố C, N, O, F, P, S, Cl, Br và I.",
      developerReason: message,
    };
  }

  if (normalizedMessage.includes("không nhận ra")) {
    return {
      success: false,
      reasonCode: "not_a_chemical_request",
      userMessage: message ?? `Không nhận ra "${input}" là tên hoặc công thức hoá học. Hãy nhập tên chất cụ thể như etanol hoặc công thức như C2H4.`,
      developerReason: message,
    };
  }

  if (normalizedMessage.includes("chưa đủ cụ thể") || normalizedMessage.includes("phân tử đơn lẻ")) {
    return {
      success: false,
      reasonCode: "ambiguous_chemical_request",
      userMessage: message ?? `Yêu cầu "${input}" chưa đủ cụ thể để xác định một phân tử đơn lẻ. Hãy nhập tên/công thức cụ thể hơn, ví dụ C2H4 hoặc PVC repeat unit.`,
      developerReason: message,
    };
  }

  if (normalizedMessage.includes("vượt hoá trị") || normalizedMessage.includes("vượt hóa trị") || normalizedMessage.includes("liên kết")) {
    return {
      success: false,
      reasonCode: "invalid_chemical_structure",
      userMessage: "AI tạo được cấu trúc nhưng cấu trúc đó chưa hợp lệ về liên kết hoặc hoá trị. Hãy thử nhập tên/công thức cụ thể hơn.",
      developerReason: message,
    };
  }

  if (normalizedMessage.includes("thiếu tên") || normalizedMessage.includes("json") || normalizedMessage.includes("không hợp lệ") || (!ok && !validShape)) {
    return {
      success: false,
      reasonCode: "ambiguous_or_unusable_request",
      userMessage: `Chưa tạo được mô hình cho "${input}" vì yêu cầu chưa đủ cụ thể để xác định một phân tử đơn lẻ. Hãy thử nhập tên hoặc công thức cụ thể, ví dụ: etanol, C2H4 hoặc PVC repeat unit.`,
      developerReason: message,
    };
  }

  return {
    success: false,
    reasonCode: "unknown_ai_build_error",
    userMessage: "Chưa tạo được mô hình phân tử. Hãy thử lại với tên hoặc công thức hoá học cụ thể hơn.",
    developerReason: message,
  };
}

export function logMoleculeAiBuildResponse(input: MoleculeAiBuildLogInput) {
  const { input: requestInput, ok, status, statusText, body } = input;
  const diagnostics = getMoleculeAiBuildDiagnostics(input);
  const httpStatus = statusText ? `${status} ${statusText}` : String(status);

  if (diagnostics.success) {
    console.info("[molecules AI] build success", {
      requestInput,
      httpStatus,
      userMessage: diagnostics.userMessage,
      rawResponse: body,
    });
    return;
  }

  console.warn("[molecules AI] build failed", {
    requestInput,
    httpStatus,
    reasonCode: diagnostics.reasonCode,
    userMessage: diagnostics.userMessage,
    developerReason: diagnostics.developerReason,
    technicalResult: ok ? "AI payload has invalid molecule schema" : "Backend rejected AI result",
    expectedShape: "{ name: string, atoms: Array<{ element: string }>, bonds: Array<{ from: number, to: number, order: 1 | 2 | 3 }> }",
    rawResponse: body,
  });
}
