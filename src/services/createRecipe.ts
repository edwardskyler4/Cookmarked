import type { Recipe, RecipeInput } from "../domain/models/Recipe";
import type { RecipeRepository } from "../domain/repositories/RecipeRepository";

export function createRecipe(
  repository: RecipeRepository,
  userId: number,
  input: RecipeInput,
): Promise<Recipe> {
  return repository.create(userId, input);
}
