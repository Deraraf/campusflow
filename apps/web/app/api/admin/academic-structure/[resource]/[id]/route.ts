import { NextResponse } from "next/server";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";
const resourcePaths = {
  colleges: "/colleges",
  departments: "/departments",
  programs: "/programs",
} as const;
type Resource = keyof typeof resourcePaths;
type RouteContext = Readonly<{
  params: Promise<{ resource: string; id: string }>;
}>;

function isResource(value: string): value is Resource {
  return Object.hasOwn(resourcePaths, value);
}

function forwardHeaders(request: Request, withBody: boolean) {
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

async function proxy(
  request: Request,
  path: string,
  method: "PATCH" | "DELETE",
) {
  try {
    const withBody = method === "PATCH";
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: forwardHeaders(request, withBody),
      ...(withBody ? { body: await request.text() } : {}),
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

async function resolvePath(params: Promise<{ resource: string; id: string }>) {
  const { resource, id } = await params;
  if (!isResource(resource) || !id) return null;
  return `${resourcePaths[resource]}/${encodeURIComponent(id)}`;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const path = await resolvePath(params);
  if (!path) {
    return NextResponse.json(
      { message: "Unknown academic structure resource or id." },
      { status: 404 },
    );
  }
  return proxy(request, path, "PATCH");
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const path = await resolvePath(params);
  if (!path) {
    return NextResponse.json(
      { message: "Unknown academic structure resource or id." },
      { status: 404 },
    );
  }
  return proxy(request, path, "DELETE");
}
