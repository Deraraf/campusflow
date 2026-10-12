import { NextResponse } from "next/server";
import {
  forwardAdminMutation,
  isSameOriginRequest,
} from "../../../../../../lib/api/admin-mutation-proxy";

type RouteContext = Readonly<{
  params: Promise<{ id: string; action: string }>;
}>;

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "A same-origin request is required." },
      { status: 403 },
    );
  }
  const { id, action } = await params;
  if (!id || (action !== "read" && action !== "unread")) {
    return NextResponse.json(
      { message: "The notification action is not supported." },
      { status: 404 },
    );
  }
  return forwardAdminMutation(
    request,
    `/notifications/${encodeURIComponent(id)}/${action}`,
    "PATCH",
    "{}",
    "Notification service is unavailable. Please try again.",
  );
}