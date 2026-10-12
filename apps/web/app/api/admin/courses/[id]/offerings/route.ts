import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";
type RouteContext = Readonly<{ params: Promise<{ id: string }> }>;

export async function POST(request: Request, { params }: RouteContext) {
  const { id: courseId } = await params;
  if (!courseId) {
    return NextResponse.json(
      { message: "A course id is required." },
      { status: 400 },
    );
  }
  try {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const response = await fetch(
      `${apiUrl}/courses/${encodeURIComponent(courseId)}/offerings`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            request.headers.get("content-type") ?? "application/json",
          cookie: request.headers.get("cookie") ?? "",
          ...(origin ? { origin } : {}),
          ...(!origin && referer ? { referer } : {}),
        },
        body: await request.text(),
        cache: "no-store",
      },
    );
    const body = await response.text();
    return new NextResponse(body || null, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Course offering service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}
