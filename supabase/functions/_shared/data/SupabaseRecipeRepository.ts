import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RecipeInput,
  RecipeRepository,
} from "../domain/RecipeRepository.ts";

export class SupabaseRecipeRepository implements RecipeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findProfileId(authUserId: string): Promise<number | null> {
    const { data, error } = await this.client
      .from("profile")
      .select("user_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) throw error;
    return data?.user_id ?? null;
  }

  async insert(
    recipe: RecipeInput & { userId: number },
  ): Promise<{ recipeId: number }> {
    const { data, error } = await this.client
      .from("recipe")
      .insert({
        user_id: recipe.userId,
        title: recipe.title,
        prep_time: recipe.prepTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        meal_type: recipe.mealType,
        course: recipe.course,
        url: recipe.url || null,
        note: recipe.note || null,
        nutrition_info: recipe.nutritionInfo || null,
      })
      .select("recipe_id")
      .single();
    if (error) throw error;
    return { recipeId: data.recipe_id };
  }
}
