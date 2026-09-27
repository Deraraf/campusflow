"server-only";

import { cookies } from "next/headers";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

type ServerApiOptions = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

export async function apiFetch<T>(
  path: string,
  options: ServerApiOptions = {},
): Promise<T> {
  const requestCookies = await cookies();
  const headers = new Headers(options.headers);
  const cookieHeader = requestCookies.toString();

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
