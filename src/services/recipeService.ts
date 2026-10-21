import type { RecipeApiRepository } from "../domain/repositories/RecipeApiRepository";

// Browser orchestration only; the Edge Function owns validation and ownership.
export function createRecipeService(
  repository: RecipeApiRepository,
): RecipeApiRepository {
  return { create: (recipe) => repository.create(recipe) };
}
export type RecipeService = ReturnType<typeof createRecipeService>;
