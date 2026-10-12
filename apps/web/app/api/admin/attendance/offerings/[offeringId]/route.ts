import { NextResponse } from "next/server";
import { forwardAdminRead } from "../../../../../../lib/api/admin-mutation-proxy";

type RouteContext = Readonly<{
  params: Promise<{ offeringId: string }>;
}>;

export async function GET(request: Request, { params }: RouteContext) {
  const { offeringId } = await params;
  if (!offeringId) {
    return NextResponse.json(
      { message: "A course offering id is required." },
      { status: 400 },
    );
  }

  return forwardAdminRead(
    request,
    `/course-offerings/${encodeURIComponent(offeringId)}/attendance`,
  );
}