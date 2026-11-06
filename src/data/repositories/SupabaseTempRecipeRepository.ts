import type { SupabaseClient } from "@supabase/supabase-js";
import type { TempRecipe } from "../../domain/models/TempRecipe";
import type { TempRecipeRepository } from "../../domain/repositories/TempRecipeRepository";

export class SupabaseTempRecipeRepository implements TempRecipeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<TempRecipe[]> {
    const { data, error } = await this.client.functions.invoke("temp_recipes", {
      method: "GET",
    });
    if (error || !Array.isArray(data))
      throw new Error(`Unable to load temporary recipes: ${error?.message ?? "unknown error"}`);
    return data as TempRecipe[];
  }

  async remove(recipeId: number): Promise<void> {
    const { error } = await this.client.functions.invoke("temp_recipes", {
      method: "DELETE",
      body: { recipeId },
    });
    if (error)
      throw new Error(`Unable to remove temporary recipe: ${error.message}`);
  }
}
