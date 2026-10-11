import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";
type RouteContext = Readonly<{ params: Promise<{ termId: string }> }>;

export async function GET(request: Request, { params }: RouteContext) {
  const { termId } = await params;
  if (!termId)
    return NextResponse.json(
      { message: "An academic term id is required." },
      { status: 400 },
    );
  try {
    const response = await fetch(
      `${apiUrl}/academic-terms/${encodeURIComponent(termId)}/course-offerings`,
      {
        headers: { cookie: request.headers.get("cookie") ?? "" },
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
      { message: "Course offerings could not be loaded. Please try again." },
      { status: 502 },
    );
  }
}
