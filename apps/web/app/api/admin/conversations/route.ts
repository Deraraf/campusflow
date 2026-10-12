import { NextResponse } from "next/server";
import {
  forwardAdminMutation,
  isSameOriginRequest,
} from "../../../../lib/api/admin-mutation-proxy";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "A same-origin request is required." },
      { status: 403 },
    );
  }
  return forwardAdminMutation(
    request,
    "/conversations",
    "POST",
    JSON.stringify({}),
    "Conversation service is unavailable. Please try again.",
  );
}