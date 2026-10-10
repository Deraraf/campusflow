import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

type RouteContext = Readonly<{
  params: Promise<{ yearId: string }>;
}>;

export async function PATCH(request: Request, { params }: RouteContext) {
  const { yearId } = await params;
  if (!yearId) {
    return NextResponse.json(
      { message: "An academic year id is required." },
      { status: 400 },
    );
  }

  try {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const response = await fetch(
      `${apiUrl}/academic-years/${encodeURIComponent(yearId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") ?? "",
          ...(origin ? { origin } : {}),
          ...(!origin && referer ? { referer } : {}),
        },
        body: await request.text(),
        cache: "no-store",
      },
    );
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const { yearId } = await params;
  if (!yearId) {
    return NextResponse.json(
      { message: "An academic year id is required." },
      { status: 400 },
    );
  }

  try {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const response = await fetch(
      `${apiUrl}/academic-years/${encodeURIComponent(yearId)}`,
      {
        method: "DELETE",
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          ...(origin ? { origin } : {}),
          ...(!origin && referer ? { referer } : {}),
        },
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
      { message: "Academic year service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}
