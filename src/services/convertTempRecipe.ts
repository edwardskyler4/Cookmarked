import type {
  RecipeApiRepository,
  RecipeDraft,
} from "../domain/repositories/RecipeApiRepository";

// Validation, ownership, atomic writes and retries belong to the Edge Function.
export function convertTempRecipe(
  recipeService: Pick<RecipeApiRepository, "convert">,
  tempRecipeId: number,
  draft: RecipeDraft,
): Promise<{ recipeId: number }> {
  return recipeService.convert(tempRecipeId, draft);
}
