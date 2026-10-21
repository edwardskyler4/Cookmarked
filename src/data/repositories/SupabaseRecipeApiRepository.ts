import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RecipeSaveError,
  type RecipeApiRepository,
  type RecipeDraft,
} from "../../domain/repositories/RecipeApiRepository";

export class SupabaseRecipeApiRepository implements RecipeApiRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(recipe: RecipeDraft): Promise<{ recipeId: number }> {
    const { data, error } = await this.client.functions.invoke("recipes_save", {
      body: recipe,
    });
    if (error) {
      let code = "unavailable";
      let field: string | undefined;
      if (error.context instanceof Response) {
        try {
          const body = await error.context.json();
          if (typeof body?.code === "string") code = body.code;
          if (typeof body?.field === "string") field = body.field;
        } catch {
          /* Transport errors use the generic message. */
        }
      }
      throw new RecipeSaveError(code, field);
    }
    if (!Number.isInteger(data?.recipeId))
      throw new RecipeSaveError("unavailable");
    return { recipeId: data.recipeId };
  }
}
