const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

// Sinh lời giải cho các câu MC/TF đã có sẵn — payload nhẹ hơn generate-questions.
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("Authorization");
    const upstream = await fetch(`${backendUrl}/api/practice-exams/generate-explanations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: await request.text(),
      cache: "no-store",
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[practice-exam-route] BACKEND_PROXY_FAILED", error);
    return Response.json({ message: "Không kết nối được backend sinh lời giải." }, { status: 502 });
  }
}
