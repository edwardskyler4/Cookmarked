import type { RecipeApiRepository, RecipeDraft } from "../domain/repositories/RecipeApiRepository";
import type { TempRecipeRepository } from "../domain/repositories/TempRecipeRepository";

// A temporary recipe is removed only after the permanent recipe save succeeds.
export async function convertTempRecipe(
  recipeService: RecipeApiRepository,
  tempRecipeRepository: TempRecipeRepository,
  tempRecipeId: number,
  draft: RecipeDraft,
): Promise<{ recipeId: number }> {
  const savedRecipe = await recipeService.create(draft);
  await tempRecipeRepository.remove(tempRecipeId);
  return savedRecipe;
}
