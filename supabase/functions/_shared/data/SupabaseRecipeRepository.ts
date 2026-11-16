import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RecipeError,
  type RecipeInput,
  type RecipeRepository,
  type RecipeConversionRepository,
} from "../domain/RecipeRepository.ts";

export class SupabaseRecipeRepository
  implements RecipeRepository, RecipeConversionRepository
{
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

  async convert(
    tempRecipeId: number,
    recipe: RecipeInput & { userId: number },
  ): Promise<{ recipeId: number }> {
    const { data, error } = await this.client.rpc("convert_temp_recipe", {
      p_temp_recipe_id: tempRecipeId,
      p_recipe: toRow(recipe),
    });
    if (error?.code === "P0002") throw new RecipeError("temp_recipe_not_found");
    if (error) throw error;
    if (!Number.isInteger(data?.recipeId) || data.recipeId < 1)
      throw new Error("Invalid conversion response");
    return { recipeId: data.recipeId };
  }

  async insert(
    recipe: RecipeInput & { userId: number },
  ): Promise<{ recipeId: number }> {
    const { data, error } = await this.client
      .from("recipe")
      .insert(toRow(recipe))
      .select("recipe_id")
      .single();
    if (error) throw error;
    return { recipeId: data.recipe_id };
  }
}

function toRow(recipe: RecipeInput & { userId: number }) {
  return {
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
    description: recipe.description || null,
    shared_from_platform: recipe.sharedFromPlatform || null,
    thumbnail_url: recipe.thumbnailUrl || null,
  };
}
