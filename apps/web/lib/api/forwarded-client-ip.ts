export function forwardedClientIpHeader(
  request: Request,
): Record<string, string> {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return forwardedFor ? { "x-forwarded-for": forwardedFor } : {};
}