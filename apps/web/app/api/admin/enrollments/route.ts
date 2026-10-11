import { NextResponse } from "next/server";
import {
  forwardAdminMutation,
  forwardAdminRead,
  isSameOriginRequest,
} from "../../../../lib/api/admin-mutation-proxy";

const enrollmentStatuses = ["ACTIVE", "DROPPED", "COMPLETED", "FAILED"] as const;

export function GET(request: Request) {
  const incoming = new URL(request.url);
  const query = new URLSearchParams();

  for (const key of incoming.searchParams.keys()) {
    if (key !== "status" && key !== "studentId" && key !== "offeringId") {
      return NextResponse.json(
        { message: `Enrollment filtering by ${key} is not supported.` },
        { status: 400 },
      );
    }
  }

  const status = incoming.searchParams.get("status");
  if (status && !enrollmentStatuses.includes(status as (typeof enrollmentStatuses)[number])) {
    return NextResponse.json(
      { message: "A supported enrollment status is required." },
      { status: 400 },
    );
  }

  for (const key of ["status", "studentId", "offeringId"] as const) {
    const value = incoming.searchParams.get(key);
    if (value) query.set(key, value);
  }

  const suffix = query.size ? `?${query.toString()}` : "";
  return forwardAdminRead(request, `/enrollments${suffix}`);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "A same-origin request is required." },
      { status: 403 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { message: "A valid JSON request body is required." },
      { status: 400 },
    );
  }

  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !("studentId" in input) ||
    typeof input.studentId !== "string" ||
    !input.studentId.trim() ||
    !("offeringId" in input) ||
    typeof input.offeringId !== "string" ||
    !input.offeringId.trim()
  ) {
    return NextResponse.json(
      { message: "studentId and offeringId are required." },
      { status: 400 },
    );
  }

  return forwardAdminMutation(
    request,
    "/enrollments",
    "POST",
    JSON.stringify({
      studentId: input.studentId.trim(),
      offeringId: input.offeringId.trim(),
    }),
  );
}