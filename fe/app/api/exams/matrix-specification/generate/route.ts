const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

// AI generation may exceed the 30-second generic rewrite proxy window.
export const maxDuration = 180;

export async function POST(request: Request) {
  const clientRequestId = request.headers.get("X-Client-Request-ID") ?? `exam-${Date.now()}`;
  try {
    const upstream = await fetch(`${backendUrl}/api/exams/matrix-specification/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Request-ID": clientRequestId,
        ...(request.headers.get("Authorization") ? { Authorization: request.headers.get("Authorization")! } : {}),
      },
      body: await request.text(),
      cache: "no-store",
    });
    const headers = new Headers({
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "X-Exam-Request-ID": upstream.headers.get("X-Exam-Request-ID") ?? clientRequestId,
    });
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("[exam-route] BACKEND_PROXY_FAILED", { clientRequestId, error });
    return Response.json(
      { message: "Không kết nối được backend tạo Ma trận.", requestId: clientRequestId },
      { status: 502, headers: { "X-Exam-Request-ID": clientRequestId } },
    );
  }
}
