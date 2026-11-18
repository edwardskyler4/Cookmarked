import type {
  RecipeRepository,
  RecipeConversionRepository,
} from "../domain/RecipeRepository.ts";
import { RecipeError } from "../domain/RecipeRepository.ts";
import { createRecipe, convertTempRecipe } from "../services/createRecipe.ts";
import { readJson } from "./apiError.ts";
import { jsonResponse } from "./http.ts";

export async function handleRecipe(
  request: Request,
  userId: string,
  repository: RecipeRepository & Partial<RecipeConversionRepository>,
  headers: Headers,
): Promise<Response> {
  const body = await readJson(request);
  if (body && typeof body === "object" && "tempRecipeId" in body) {
    const convert = repository.convert?.bind(repository);
    if (!convert) throw new RecipeError("unavailable");
    return jsonResponse(
      201,
      await convertTempRecipe(
        {
          findProfileId: (id) => repository.findProfileId(id),
          convert,
        },
        userId,
        body.tempRecipeId,
        body,
      ),
      headers,
    );
  }
  return jsonResponse(
    201,
    await createRecipe(repository, userId, body),
    headers,
  );
}
