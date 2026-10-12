import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";
type RouteContext = Readonly<{ params: Promise<{ programId: string }> }>;

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function forward(
  request: Request,
  params: Promise<{ programId: string }>,
  method: "GET" | "POST",
) {
  const { programId } = await params;
  if (!programId) {
    return NextResponse.json(
      { message: "A Program id is required." },
      { status: 400 },
    );
  }
  if (method === "POST" && !hasSameOrigin(request)) {
    return NextResponse.json(
      { message: "A same-origin request is required." },
      { status: 403 },
    );
  }
  try {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const withBody = method === "POST";
    const response = await fetch(
      `${apiUrl}/programs/${encodeURIComponent(programId)}/curriculum`,
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
      { message: "Curriculum service is unavailable. Please try again." },
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
