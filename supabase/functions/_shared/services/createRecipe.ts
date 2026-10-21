import type { Recipe, RecipeCreator, RecipeInput } from "../domain/Recipe.ts";

export function createRecipe(
  creator: RecipeCreator,
  authUserId: string,
  input: RecipeInput,
): Promise<Recipe> {
  return creator.create(authUserId, input);
}
