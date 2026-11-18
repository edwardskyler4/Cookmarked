import type { RecipeReader } from "../domain/Recipe.ts";
import { listRecipes } from "../services/listRecipes.ts";
import { jsonResponse } from "./http.ts";
export async function handleRecipeList(
  userId: string,
  reader: RecipeReader,
  headers: Headers,
): Promise<Response> {
  return jsonResponse(200, await listRecipes(reader, userId), headers);
}
