import type { Recipe, RecipeReader } from "../domain/Recipe.ts";

export function listRecipes(
  reader: RecipeReader,
  authUserId: string,
): Promise<Recipe[]> {
  return reader.list(authUserId);
}
