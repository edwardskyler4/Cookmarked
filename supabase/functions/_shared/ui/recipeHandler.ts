import type {
  RecipeCreator,
  RecipeInput as LegacyRecipeInput,
  RecipeReader,
} from "../domain/Recipe.ts";
import { RecipeError, type RecipeRepository } from "../domain/RecipeRepository.ts";
import { createRecipe } from "../services/createRecipe.ts";
import { listRecipes } from "../services/listRecipes.ts";

type LegacyRepository = RecipeCreator & Partial<RecipeReader>;

function responseHeaders(origin: string | null, origins: string[]): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  if (origin && origins.includes(origin))
    headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function jsonResponse(status: number, body: unknown, headers: Headers): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

export function handleRecipe(
  request: Request,
  authUserId: string,
  repository: LegacyRepository,
  origins: string[],
): Promise<Response>;

export function handleRecipe(
  request: Request,
  repository: RecipeRepository,
  verifyToken: (token: string) => Promise<string | null>,
  origins: string[],
): Promise<Response>;

export async function handleRecipe(
  request: Request,
  authOrRepository: string | RecipeRepository,
  repositoryOrVerifier: LegacyRepository | ((token: string) => Promise<string | null>),
  origins: string[],
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = responseHeaders(origin, origins);

  if (origin && !origins.includes(origin))
    return jsonResponse(403, { code: "invalid_input" }, headers);
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });

  if (typeof authOrRepository === "string") {
    const authUserId = authOrRepository;
    const repository = repositoryOrVerifier as LegacyRepository;
    if (request.method === "GET") {
      if (!repository.list)
        return jsonResponse(503, { code: "unavailable" }, headers);
      try {
        return jsonResponse(200, await listRecipes(repository, authUserId), headers);
      } catch (error) {
        console.error("Unable to list recipes", error);
        return jsonResponse(503, { code: "unavailable" }, headers);
      }
    }
    if (request.method !== "POST")
      return jsonResponse(405, { code: "invalid_input" }, headers);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, { code: "invalid_input" }, headers);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return jsonResponse(400, { code: "invalid_input" }, headers);
    try {
      return jsonResponse(
        201,
        await createRecipe(repository, authUserId, body as LegacyRecipeInput),
        headers,
      );
    } catch {
      return jsonResponse(503, { code: "unavailable" }, headers);
    }
  }

  const repository = authOrRepository as RecipeRepository;
  const verifyToken = repositoryOrVerifier as (token: string) => Promise<string | null>;
  if (request.method !== "POST")
    return jsonResponse(405, { code: "invalid_input" }, headers);
  try {
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new RecipeError("unauthorized");
    const authUserId = await verifyToken(token);
    if (!authUserId) throw new RecipeError("unauthorized");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RecipeError("invalid_input");
    }
    return jsonResponse(201, await createRecipe(repository, authUserId, body), headers);
  } catch (error) {
    const failure =
      error instanceof RecipeError ? error : new RecipeError("unavailable");
    const status =
      failure.code === "unauthorized"
        ? 401
        : failure.code === "profile_not_found"
          ? 403
          : failure.code === "invalid_input"
            ? 400
            : 503;
    return jsonResponse(
      status,
      { code: failure.code, ...(failure.field ? { field: failure.field } : {}) },
      headers,
    );
  }
}
