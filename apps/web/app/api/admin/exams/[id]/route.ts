import { NextResponse } from "next/server";
import {
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
      { message: "An exam id is required." },
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
      { message: "An exam update is required." },
      { status: 400 },
    );
  }

  const payload: { title?: string; examDate?: string; maxScore?: number } = {};
  if ("title" in input) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      return NextResponse.json(
        { message: "title must be a non-empty string." },
        { status: 400 },
      );
    }
    payload.title = input.title.trim();
  }
  if ("examDate" in input) {
    if (typeof input.examDate !== "string" || Number.isNaN(Date.parse(input.examDate))) {
      return NextResponse.json(
        { message: "examDate must be a valid date string." },
        { status: 400 },
      );
    }
    payload.examDate = input.examDate;
  }
  if ("maxScore" in input) {
    if (typeof input.maxScore !== "number" || input.maxScore <= 0) {
      return NextResponse.json(
        { message: "maxScore must be greater than zero." },
        { status: 400 },
      );
    }
    payload.maxScore = input.maxScore;
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "Provide at least one exam field to update." },
      { status: 400 },
    );
  }

  return forwardAdminMutation(
    request,
    `/exams/${encodeURIComponent(id)}`,
    "PATCH",
    JSON.stringify(payload),
    "Exam service is unavailable. Please try again.",
  );
}