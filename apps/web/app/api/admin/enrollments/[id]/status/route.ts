import { NextResponse } from "next/server";
import { forwardAdminMutation, isSameOriginRequest } from "../../../../../../lib/api/admin-mutation-proxy";

const enrollmentStatuses = ["ACTIVE", "DROPPED", "COMPLETED", "FAILED"] as const;
type RouteContext = Readonly<{ params: Promise<{ id: string }> }>;

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "A same-origin request is required." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "An enrollment id is required." },
      { status: 400 },
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
    !("status" in input) ||
    typeof input.status !== "string" ||
    !enrollmentStatuses.includes(input.status as (typeof enrollmentStatuses)[number])
  ) {
    return NextResponse.json(
      { message: "A supported enrollment status is required." },
      { status: 400 },
    );
  }

  return forwardAdminMutation(
    request,
    `/enrollments/${encodeURIComponent(id)}/status`,
    "PATCH",
    JSON.stringify({ status: input.status }),
  );
}