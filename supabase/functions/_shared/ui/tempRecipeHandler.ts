import type { TempRecipeRepository } from "../domain/TempRecipeRepository.ts";
import { ApiError, readJson } from "./apiError.ts";
import { jsonResponse } from "./http.ts";
export async function handleTempRecipe(
  request: Request,
  userId: string,
  repository: TempRecipeRepository,
  headers: Headers,
): Promise<Response> {
  if (request.method === "GET")
    return jsonResponse(200, await repository.list(userId), headers);
  const body = (await readJson(request)) as { recipeId?: unknown } | null;
  if (
    !body ||
    !Number.isInteger(body.recipeId) ||
    (body.recipeId as number) < 1 ||
    (body.recipeId as number) > 2147483647
  )
    throw new ApiError("invalid_input", "recipeId");
  await repository.remove(userId, body.recipeId as number);
  return new Response(null, { status: 204, headers });
}
