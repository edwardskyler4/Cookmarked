import type { RecipeCreator, RecipeInput } from "../domain/Recipe.ts";
import {
  RecipeError,
  type RecipeRepository,
} from "../domain/RecipeRepository.ts";
import { createRecipe } from "../services/createRecipe.ts";

export async function handleRecipe(
  request: Request,
  authUserId: string,
  creator: RecipeCreator,
  origins: string[],
): Promise<Response>;
export async function handleRecipe(
  request: Request,
  repository: RecipeRepository,
  verifyToken: (token: string) => Promise<string | null>,
  origins: string[],
): Promise<Response>;
export async function handleRecipe(
  request: Request,
  repositoryOrAuthUserId: RecipeRepository | string,
  verifyTokenOrCreator:
    | ((token: string) => Promise<string | null>)
    | RecipeCreator,
  origins: string[],
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !origins.includes(origin))
    return respond(403, { code: "invalid_input" });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return respond(405, { code: "invalid_input" });

  if (typeof repositoryOrAuthUserId === "string") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respond(400, { code: "invalid_input" });
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return respond(400, { code: "invalid_input" });
    try {
      const recipe = await verifyTokenOrCreator.create(
        repositoryOrAuthUserId,
        body as RecipeInput,
      );
      return respond(201, recipe);
    } catch {
      return respond(503, { code: "unavailable" });
    }
  }

  try {
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new RecipeError("unauthorized");
    const verifyToken = verifyTokenOrCreator as (
      token: string,
    ) => Promise<string | null>;
    const authUserId = await verifyToken(token);
    if (!authUserId) throw new RecipeError("unauthorized");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new RecipeError("invalid_input");
    }
    return respond(
      201,
      await createRecipe(repositoryOrAuthUserId, authUserId, body),
    );
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
    return respond(status, {
      code: failure.code,
      ...(failure.field ? { field: failure.field } : {}),
    });
  }
}
