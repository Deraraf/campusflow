import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";
const supportedActions = new Set(["review", "approve", "reject"]);

type RouteContext = Readonly<{
  params: Promise<{ id: string; action: string }>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id, action } = await params;
  if (!id || !supportedActions.has(action)) {
    return errorResponse("Unsupported student application action.", 404);
  }

  let body: Record<string, unknown> | undefined;
  if (action === "approve" || action === "reject") {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return errorResponse("A valid JSON request body is required.");
    }
    if (!isRecord(input))
      return errorResponse("A valid request body is required.");

    if (action === "approve") {
      const {
        studentNumber,
        admissionAcademicYearId,
        academicTermId,
        programYear,
      } = input;
      if (
        typeof studentNumber !== "string" ||
        !studentNumber.trim() ||
        typeof admissionAcademicYearId !== "string" ||
        !admissionAcademicYearId.trim() ||
        typeof academicTermId !== "string" ||
        !academicTermId.trim() ||
        typeof programYear !== "number" ||
        !Number.isInteger(programYear) ||
        programYear < 1
      ) {
        return errorResponse(
          "studentNumber, admissionAcademicYearId, academicTermId, and a positive integer programYear are required.",
        );
      }
      body = {
        studentNumber: studentNumber.trim(),
        admissionAcademicYearId,
        academicTermId,
        programYear,
      };
    } else {
      const rejectionReason = input.rejectionReason;
      if (typeof rejectionReason !== "string" || !rejectionReason.trim()) {
        return errorResponse("A rejectionReason is required.");
      }
      body = { rejectionReason: rejectionReason.trim() };
    }
  }

  try {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const response = await fetch(
      `${apiUrl}/student-applications/${encodeURIComponent(id)}/${action}`,
      {
        method: "POST",
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(origin ? { origin } : {}),
          ...(!origin && referer ? { referer } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
      },
    );
    const responseBody = await response.text();

    return new NextResponse(responseBody || null, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "The admission service is unavailable. Please try again." },
      { status: 502 },
    );
  }
}
