import { corsHeaders, jsonResponse, logHttpFailure } from "./http.ts";
import type { TempRecipeRepository } from "../domain/TempRecipeRepository.ts";

type TokenVerifier = (token: string) => Promise<string | null>;

export async function handleTempRecipe(
  request: Request,
  repository: TempRecipeRepository,
  verifyToken: TokenVerifier,
  origins: string[] = [],
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const responseHeaders = corsHeaders(request, origins, "GET, DELETE, OPTIONS");
  if (origin && !origins.includes(origin))
    return jsonResponse(403, { code: "invalid_input" }, responseHeaders);
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: responseHeaders });

  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token)
    return jsonResponse(401, { code: "unauthorized" }, responseHeaders);
  try {
    const authUserId = await verifyToken(token);
    if (!authUserId)
      return jsonResponse(401, { code: "unauthorized" }, responseHeaders);

    if (request.method === "GET")
      return jsonResponse(
        200,
        await repository.list(authUserId),
        responseHeaders,
      );
    if (request.method !== "DELETE")
      return jsonResponse(405, { code: "invalid_input" }, responseHeaders);

    const body = (await request.json().catch(() => null)) as {
      recipeId?: unknown;
    } | null;
    if (
      !body ||
      !Number.isInteger(body.recipeId) ||
      (body.recipeId as number) < 1
    )
      return jsonResponse(400, { code: "invalid_input" }, responseHeaders);
    await repository.remove(authUserId, body.recipeId as number);
    return new Response(null, { status: 204, headers: responseHeaders });
  } catch (error) {
    logHttpFailure("Unable to access temporary recipes", error);
    return jsonResponse(503, { code: "unavailable" }, responseHeaders);
  }
}
