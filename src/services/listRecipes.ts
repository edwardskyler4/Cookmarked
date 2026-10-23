import type { Recipe } from "../domain/models/Recipe";
import type { RecipeReader } from "../domain/repositories/RecipeReader";

export function listRecipes(reader: RecipeReader): Promise<Recipe[]> {
  return reader.list();
}
