const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("Authorization");
    const upstream = await fetch(`${backendUrl}/api/practice-exams/validate-configuration`, {
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
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json({ message: "Không kết nối được backend đánh giá cấu hình bài tập." }, { status: 502 });
  }
}
