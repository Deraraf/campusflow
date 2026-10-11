import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";
const resourcePaths = {
  colleges: "/colleges",
  departments: "/departments",
  programs: "/programs",
  instructors: "/instructors",
} as const;
type Resource = keyof typeof resourcePaths;
type RouteContext = Readonly<{ params: Promise<{ resource: string }> }>;

function isResource(value: string): value is Resource {
  return Object.hasOwn(resourcePaths, value);
}

function forwardHeaders(request: Request, withBody = false) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  return {
    ...(withBody
      ? {
          "Content-Type":
            request.headers.get("content-type") ?? "application/json",
        }
      : {}),
    cookie: request.headers.get("cookie") ?? "",
    ...(origin ? { origin } : {}),
    ...(!origin && referer ? { referer } : {}),
  };
}

async function proxy(request: Request, path: string, method: "GET" | "POST") {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: forwardHeaders(request, method === "POST"),
      ...(method === "POST" ? { body: await request.text() } : {}),
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body || null, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: "Academic structure service is unavailable. Please try again.",
      },
      { status: 502 },
    );
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const { resource } = await params;
  if (!isResource(resource)) {
    return NextResponse.json(
      { message: "Unknown academic structure resource." },
      { status: 404 },
    );
  }
  return proxy(request, resourcePaths[resource], "GET");
}

export async function POST(request: Request, { params }: RouteContext) {
  const { resource } = await params;
  if (!isResource(resource) || resource === "instructors") {
    return NextResponse.json(
      { message: "Create is not supported for this resource." },
      { status: 404 },
    );
  }
  return proxy(request, resourcePaths[resource], "POST");
}
