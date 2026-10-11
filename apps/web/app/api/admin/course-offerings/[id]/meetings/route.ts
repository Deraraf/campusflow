import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";
type RouteContext = Readonly<{ params: Promise<{ id: string }> }>;

async function forward(
  request: Request,
  params: Promise<{ id: string }>,
  method: "GET" | "POST",
) {
  const { id: offeringId } = await params;
  if (!offeringId) {
    return NextResponse.json(
      { message: "A course offering id is required." },
      { status: 400 },
    );
  }
  try {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const withBody = method === "POST";
    const response = await fetch(
      `${apiUrl}/course-offerings/${encodeURIComponent(offeringId)}/meetings`,
      {
        method,
        headers: {
          ...(withBody
            ? {
                "Content-Type":
                  request.headers.get("content-type") ?? "application/json",
              }
            : {}),
          cookie: request.headers.get("cookie") ?? "",
          ...(origin ? { origin } : {}),
          ...(!origin && referer ? { referer } : {}),
        },
        ...(withBody ? { body: await request.text() } : {}),
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
      { message: "Course meeting service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}

export function GET(request: Request, context: RouteContext) {
  return forward(request, context.params, "GET");
}

export function POST(request: Request, context: RouteContext) {
  return forward(request, context.params, "POST");
}
