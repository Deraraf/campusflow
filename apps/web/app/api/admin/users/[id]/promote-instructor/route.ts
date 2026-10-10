import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

type RouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

type PromotionInput = Readonly<{
  departmentId?: unknown;
  employeeNumber?: unknown;
}>;

export async function PATCH(request: Request, { params }: RouteContext) {
  let input: PromotionInput;
  try {
    input = (await request.json()) as PromotionInput;
  } catch {
    return NextResponse.json(
      { message: "A valid JSON request body is required." },
      { status: 400 },
    );
  }

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return NextResponse.json(
      { message: "A valid promotion request is required." },
      { status: 400 },
    );
  }

  const departmentId =
    typeof input.departmentId === "string" ? input.departmentId.trim() : "";
  const employeeNumber =
    typeof input.employeeNumber === "string" ? input.employeeNumber.trim() : "";

  if (!departmentId || !employeeNumber) {
    return NextResponse.json(
      { message: "departmentId and employeeNumber are required." },
      { status: 400 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "A user id is required." },
      { status: 400 },
    );
  }

  try {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const response = await fetch(
      `${apiUrl}/users/${encodeURIComponent(id)}/promote-instructor`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") ?? "",
          ...(origin ? { origin } : {}),
          ...(!origin && referer ? { referer } : {}),
        },
        body: JSON.stringify({
          role: "INSTRUCTOR",
          departmentId,
          employeeNumber,
        }),
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
      { message: "Promotion service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}
