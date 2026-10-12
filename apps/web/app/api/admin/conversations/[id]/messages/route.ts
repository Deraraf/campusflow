import { NextResponse } from "next/server";
import {
  forwardAdminMutation,
  forwardAdminRead,
  isSameOriginRequest,
} from "../../../../../../lib/api/admin-mutation-proxy";

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
    `/conversations/${encodeURIComponent(id)}/messages`,
    "Conversation messages are unavailable. Please try again.",
  );
}

export async function POST(request: Request, { params }: RouteContext) {
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
    input.role !== "USER" ||
    typeof input.content !== "string" ||
    !input.content.trim()
  ) {
    return NextResponse.json(
      { message: "A non-empty USER message is required." },
      { status: 400 },
    );
  }
  return forwardAdminMutation(
    request,
    `/conversations/${encodeURIComponent(id)}/messages`,
    "POST",
    JSON.stringify({ role: "USER", content: input.content.trim() }),
    "Conversation service is unavailable. Please try again.",
  );
}