import { NextResponse } from "next/server";
import { forwardAdminRead } from "../../../../../../lib/api/admin-mutation-proxy";

type RouteContext = Readonly<{ params: Promise<{ id: string }> }>;

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "An assignment id is required." },
      { status: 400 },
    );
  }
  return forwardAdminRead(
    request,
    `/assignments/${encodeURIComponent(id)}/submissions`,
    "Assignment submissions are unavailable. Please try again.",
  );
}