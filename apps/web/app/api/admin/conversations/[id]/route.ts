import { NextResponse } from "next/server";
import {
  forwardAdminDelete,
  forwardAdminMutation,
  forwardAdminRead,
  isSameOriginRequest,
} from "../../../../../lib/api/admin-mutation-proxy";

type RouteContext = Readonly<{ params: Promise<{ id: string }> }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "A conversation id is required." },
      { status: 400 },
    );
  }
  return forwardAdminRead(
    request,
    `/conversations/${encodeURIComponent(id)}`,
    "Conversation service is unavailable. Please try again.",
  );
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
      { message: "A conversation id is required." },
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
    !isRecord(input) ||
    typeof input.title !== "string" ||
    !input.title.trim()
  ) {
    return NextResponse.json(
      { message: "A non-empty conversation title is required." },
      { status: 400 },
    );
  }
  return forwardAdminMutation(
    request,
    `/conversations/${encodeURIComponent(id)}`,
    "PATCH",
    JSON.stringify({ title: input.title.trim() }),
    "Conversation service is unavailable. Please try again.",
  );
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "A conversation id is required." },
      { status: 400 },
    );
  }
  return forwardAdminDelete(
    request,
    `/conversations/${encodeURIComponent(id)}`,
    "Conversation service is unavailable. Please try again.",
  );
}