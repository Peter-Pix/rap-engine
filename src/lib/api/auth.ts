/**
 * API authentication middleware.
 * Validates the `X-API-Key` header against the configured secret.
 */

export function validateApiKey(request: Request): { valid: boolean; reason?: string } {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return { valid: false, reason: "Missing X-API-Key header" };
  }

  const expected = process.env.API_SECRET_KEY;
  if (!expected) {
    return { valid: false, reason: "API_SECRET_KEY not configured on server" };
  }

  if (apiKey !== expected) {
    return { valid: false, reason: "Invalid API key" };
  }

  return { valid: true };
}

/**
 * Wraps a Next.js App Router route handler with API key validation.
 * Supports both simple handlers and handlers with route params.
 */
export function withAuth<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  const wrapped = async (...args: Parameters<T>): Promise<Response> => {
    const request = args[0] as Request;
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return Response.json({ error: auth.reason }, { status: 401 });
    }
    return handler(...args);
  };
  return wrapped as T;
}
