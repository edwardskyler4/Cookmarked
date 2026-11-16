import { corsHeaders, jsonResponse, logHttpFailure } from "./http.ts";
import type {
  RecipeCreator,
  RecipeInput as LegacyRecipeInput,
  RecipeReader,
} from "../domain/Recipe.ts";
import {
  RecipeError,
  type RecipeRepository,
  type RecipeConversionRepository,
} from "../domain/RecipeRepository.ts";
import { createRecipe, convertTempRecipe } from "../services/createRecipe.ts";
import { listRecipes } from "../services/listRecipes.ts";

type LegacyRepository = RecipeCreator & Partial<RecipeReader>;

export function handleRecipe(
  request: Request,
  authUserId: string,
  creator: LegacyRepository,
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
  repositoryOrVerifier:
    LegacyRepository | ((token: string) => Promise<string | null>),
  origins: string[],
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(request, origins, "GET, POST, OPTIONS");

  if (origin && !origins.includes(origin))
    return jsonResponse(403, { code: "invalid_input" }, headers);
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });

  if (typeof authOrRepository === "string") {
    const authUserId = authOrRepository;
    const repository = repositoryOrVerifier as LegacyRepository;
    if (request.method === "GET") {
      const list = repository.list?.bind(repository);
      if (!list) return jsonResponse(503, { code: "unavailable" }, headers);
      try {
        return jsonResponse(
          200,
          await listRecipes({ list }, authUserId),
          headers,
        );
      } catch (error) {
        logHttpFailure("Unable to list recipes", error);
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
    } catch (error) {
      logHttpFailure("Unable to save recipe", error);
      return jsonResponse(503, { code: "unavailable" }, headers);
    }
  }

  const repository = authOrRepository as RecipeRepository;
  if (request.method !== "POST")
    return jsonResponse(405, { code: "invalid_input" }, headers);
  try {
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new RecipeError("unauthorized");
    const verifyToken = repositoryOrVerifier as (
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
    if (body && typeof body === "object" && "tempRecipeId" in body) {
      const converter = repository as RecipeRepository &
        Partial<RecipeConversionRepository>;
      const convert = converter.convert?.bind(converter);
      if (!convert) throw new RecipeError("unavailable");
      return jsonResponse(
        201,
        await convertTempRecipe(
          {
            findProfileId: (id) => repository.findProfileId(id),
            convert,
          },
          authUserId,
          body.tempRecipeId,
          body,
        ),
        headers,
      );
    }
    return jsonResponse(
      201,
      await createRecipe(repository, authUserId, body),
      headers,
    );
  } catch (error) {
    if (!(error instanceof RecipeError))
      logHttpFailure("Unable to save recipe", error);
    const failure =
      error instanceof RecipeError ? error : new RecipeError("unavailable");
    const status =
      failure.code === "unauthorized"
        ? 401
        : failure.code === "profile_not_found"
          ? 403
          : failure.code === "temp_recipe_not_found"
            ? 404
            : failure.code === "invalid_input"
              ? 400
              : 503;
    return jsonResponse(
      status,
      {
        code: failure.code,
        ...(failure.field ? { field: failure.field } : {}),
      },
      headers,
    );
  }
}
