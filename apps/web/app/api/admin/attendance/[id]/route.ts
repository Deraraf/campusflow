import { NextResponse } from "next/server";
import {
  forwardAdminMutation,
  isSameOriginRequest,
} from "../../../../../lib/api/admin-mutation-proxy";

const attendanceStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
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
      { message: "An attendance id is required." },
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

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return NextResponse.json(
      { message: "An attendance update is required." },
      { status: 400 },
    );
  }

  const payload: { date?: string; status?: (typeof attendanceStatuses)[number] } = {};
  if ("date" in input) {
    if (typeof input.date !== "string" || !input.date.trim()) {
      return NextResponse.json(
        { message: "date must be a non-empty date string." },
        { status: 400 },
      );
    }
    payload.date = input.date.trim();
  }
  if ("status" in input) {
    if (
      typeof input.status !== "string" ||
      !attendanceStatuses.includes(input.status as (typeof attendanceStatuses)[number])
    ) {
      return NextResponse.json(
        { message: "A supported attendance status is required." },
        { status: 400 },
      );
    }
    payload.status = input.status as (typeof attendanceStatuses)[number];
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "Provide a date or status to update." },
      { status: 400 },
    );
  }

  return forwardAdminMutation(
    request,
    `/attendance/${encodeURIComponent(id)}`,
    "PATCH",
    JSON.stringify(payload),
    "Attendance service is unavailable. Please try again.",
  );
}