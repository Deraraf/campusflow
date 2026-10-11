import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

function headers(request: Request, withBody = false) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  return {
    ...(withBody
      ? {
          "Content-Type":
            request.headers.get("content-type") ?? "application/json",
        }
      : {}),
    cookie: request.headers.get("cookie") ?? "",
    ...(origin ? { origin } : {}),
    ...(!origin && referer ? { referer } : {}),
  };
}

async function forward(request: Request, method: "GET" | "POST") {
  try {
    const response = await fetch(`${apiUrl}/courses`, {
      method,
      headers: headers(request, method === "POST"),
      ...(method === "POST" ? { body: await request.text() } : {}),
      cache: "no-store",
    });
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
      { message: "Course service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}

export function GET(request: Request) {
  return forward(request, "GET");
}

export function POST(request: Request) {
  return forward(request, "POST");
}
