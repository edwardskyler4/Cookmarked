import { AuthError, type AuthGateway } from "../domain/AuthGateway.ts";
import { authenticate } from "../services/authenticate.ts";

export async function handleAuth(
  request: Request,
  gateway: AuthGateway,
  origins: string[],
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  });
  if (origin && !origins.includes(origin))
    return new Response(JSON.stringify({ code: "invalid_input" }), {
      status: 403,
      headers,
    });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  headers.set(
    "Access-Control-Allow-Headers",
    "authorization, apikey, content-type, x-client-info",
  );
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST")
    return new Response(JSON.stringify({ code: "invalid_input" }), {
      status: 405,
      headers,
    });
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ code: "invalid_input" }), {
      status: 400,
      headers,
    });
  }
  if (!body || (body.action !== "register" && body.action !== "login")) {
    return new Response(JSON.stringify({ code: "invalid_input" }), {
      status: 400,
      headers,
    });
  }
  try {
    const tokens = await authenticate(gateway, body.action, body);
    return new Response(JSON.stringify(tokens), { status: 200, headers });
  } catch (error) {
    const code = error instanceof AuthError ? error.code : "unavailable";
    const status =
      code === "invalid_credentials"
        ? 401
        : code === "username_taken"
          ? 409
          : code === "rate_limited"
            ? 429
            : code === "unavailable"
              ? 503
              : 400;
    return new Response(JSON.stringify({ code }), { status, headers });
  }
}
