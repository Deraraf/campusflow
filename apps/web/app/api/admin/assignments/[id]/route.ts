import { NextResponse } from "next/server";
import {
  forwardAdminDelete,
  forwardAdminMutation,
  isSameOriginRequest,
} from "../../../../../lib/api/admin-mutation-proxy";

type RouteContext = Readonly<{ params: Promise<{ id: string }> }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
      { message: "An assignment id is required." },
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
  if (!isRecord(input)) {
    return NextResponse.json(
      { message: "An assignment update is required." },
      { status: 400 },
    );
  }

  const payload: {
    title?: string;
    description?: string | null;
    dueDate?: string;
    maxScore?: number;
  } = {};
  if ("title" in input) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      return NextResponse.json(
        { message: "title must be a non-empty string." },
        { status: 400 },
      );
    }
    payload.title = input.title.trim();
  }
  if ("description" in input) {
    if (typeof input.description !== "string" && input.description !== null) {
      return NextResponse.json(
        { message: "description must be a string or null." },
        { status: 400 },
      );
    }
    payload.description = input.description;
  }
  if ("dueDate" in input) {
    if (typeof input.dueDate !== "string" || Number.isNaN(Date.parse(input.dueDate))) {
      return NextResponse.json(
        { message: "dueDate must be a valid date string." },
        { status: 400 },
      );
    }
    payload.dueDate = input.dueDate;
  }
  if ("maxScore" in input) {
    if (typeof input.maxScore !== "number" || input.maxScore < 1) {
      return NextResponse.json(
        { message: "maxScore must be a positive number." },
        { status: 400 },
      );
    }
    payload.maxScore = input.maxScore;
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "Provide at least one assignment field to update." },
      { status: 400 },
    );
  }

  return forwardAdminMutation(
    request,
    `/assignments/${encodeURIComponent(id)}`,
    "PATCH",
    JSON.stringify(payload),
    "Assignment service is unavailable. Please try again.",
  );
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "An assignment id is required." },
      { status: 400 },
    );
  }
  return forwardAdminDelete(
    request,
    `/assignments/${encodeURIComponent(id)}`,
    "Assignment service is unavailable. Please try again.",
  );
}