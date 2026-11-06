import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recipe } from "../../domain/models/Recipe";
import type { RecipeReader } from "../../domain/repositories/RecipeReader";
import { supabase } from "../supabaseClient";

type RecipeResponse = Omit<Recipe, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export class SupabaseRecipeRepository implements RecipeReader {
  constructor(private readonly client: SupabaseClient = supabase) {}

  async list(): Promise<Recipe[]> {
    const { data, error } = await this.client.functions.invoke("recipes", {
      method: "GET",
    });

    if (error || !Array.isArray(data)) {
      throw new Error(`Unable to load recipes: ${error?.message ?? "unknown error"}`);
    }

    return (data as RecipeResponse[]).map((recipe) => ({
      ...recipe,
      createdAt: new Date(recipe.createdAt),
      updatedAt: new Date(recipe.updatedAt),
    }));
  }
}
