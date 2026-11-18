import { functionFailure } from "../functionFailure";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RecipeSaveError,
  type RecipeApiRepository,
  type RecipeDraft,
} from "../../domain/repositories/RecipeApiRepository";

export class SupabaseRecipeApiRepository implements RecipeApiRepository {
  constructor(private readonly client: SupabaseClient) {}

  create(recipe: RecipeDraft): Promise<{ recipeId: number }> {
    return this.save(recipe);
  }

  convert(
    tempRecipeId: number,
    recipe: RecipeDraft,
  ): Promise<{ recipeId: number }> {
    return this.save({ ...recipe, tempRecipeId });
  }

  private async save(
    recipe: RecipeDraft & { tempRecipeId?: number },
  ): Promise<{ recipeId: number }> {
    const { data, error } = await this.client.functions.invoke("recipes_save", {
      body: recipe,
    });
    if (error) {
      const { code, field } = await functionFailure(error);
      throw new RecipeSaveError(code, field);
    }
    if (!Number.isInteger(data?.recipeId))
      throw new RecipeSaveError("unavailable");
    return { recipeId: data.recipeId };
  }
}
