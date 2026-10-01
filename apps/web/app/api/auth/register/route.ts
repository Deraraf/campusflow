import { NextResponse } from "next/server";
import { forwardedClientIpHeader } from "../../../../lib/api/forwarded-client-ip";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const response = await fetch(`${apiUrl}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...forwardedClientIpHeader(request),
    },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
