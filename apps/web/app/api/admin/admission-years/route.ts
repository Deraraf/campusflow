import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

export async function GET(request: Request) {
  try {
    const response = await fetch(`${apiUrl}/academic-years`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Academic years could not be loaded. Please try again." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const response = await fetch(`${apiUrl}/academic-years`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
        ...(request.headers.get("origin")
          ? { origin: request.headers.get("origin") as string }
          : request.headers.get("referer")
            ? { referer: request.headers.get("referer") as string }
            : {}),
      },
      body: await request.text(),
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Academic year service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}
