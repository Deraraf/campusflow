import { NextResponse } from "next/server";
import {
  forwardAdminMutation,
  isSameOriginRequest,
} from "../../../../lib/api/admin-mutation-proxy";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  if (!isRecord(input)) {
    return NextResponse.json(
      { message: "A notification recipient, title, and message are required." },
      { status: 400 },
    );
  }
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!userId || !title || !message) {
    return NextResponse.json(
      { message: "userId, title, and message are required." },
      { status: 400 },
    );
  }

  return forwardAdminMutation(
    request,
    "/notifications",
    "POST",
    JSON.stringify({ userId, title, message }),
    "Notification service is unavailable. Please try again.",
  );
}