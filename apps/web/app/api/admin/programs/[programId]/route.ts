import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

type RouteContext = Readonly<{
  params: Promise<{ programId: string }>;
}>;

export async function GET(request: Request, { params }: RouteContext) {
  const { programId } = await params;
  if (!programId) {
    return NextResponse.json(
      { message: "A program id is required." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${apiUrl}/programs/${encodeURIComponent(programId)}`,
      {
        headers: { cookie: request.headers.get("cookie") ?? "" },
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
      { message: "Program details could not be loaded. Please try again." },
      { status: 502 },
    );
  }
}
