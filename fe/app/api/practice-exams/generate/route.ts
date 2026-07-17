const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

// Sinh đề gọi AI theo nhiều lô, có thể vượt quá timeout của generic rewrite.
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const upstream = await fetch(`${backendUrl}/api/practice-exams/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
    return Response.json({ message: "Không kết nối được backend tạo đề kiểm tra." }, { status: 502 });
  }
}
