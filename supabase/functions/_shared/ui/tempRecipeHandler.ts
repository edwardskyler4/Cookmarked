import type { TempRecipeRepository } from "../domain/TempRecipeRepository.ts";

type TokenVerifier = (token: string) => Promise<string | null>;

function headers(origin: string | null, origins: string[]): Headers {
  const result = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  });
  if (origin && origins.includes(origin)) result.set("Access-Control-Allow-Origin", origin);
  return result;
}

function json(status: number, body: unknown, responseHeaders: Headers): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

export async function handleTempRecipe(
  request: Request,
  repository: TempRecipeRepository,
  verifyToken: TokenVerifier,
  origins: string[] = [],
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const responseHeaders = headers(origin, origins);
  if (origin && !origins.includes(origin))
    return json(403, { code: "invalid_input" }, responseHeaders);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders });

  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return json(401, { code: "unauthorized" }, responseHeaders);
  const authUserId = await verifyToken(token);
  if (!authUserId) return json(401, { code: "unauthorized" }, responseHeaders);

  try {
    if (request.method === "GET")
      return json(200, await repository.list(authUserId), responseHeaders);
    if (request.method !== "DELETE") return json(405, { code: "invalid_input" }, responseHeaders);

    const body = await request.json().catch(() => null) as { recipeId?: unknown } | null;
    if (!body || !Number.isInteger(body.recipeId) || (body.recipeId as number) < 1)
      return json(400, { code: "invalid_input" }, responseHeaders);
    await repository.remove(authUserId, body.recipeId as number);
    return new Response(null, { status: 204, headers: responseHeaders });
  } catch {
    return json(503, { code: "unavailable" }, responseHeaders);
  }
}
