import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Recipe,
  RecipeCreator,
  RecipeInput,
} from "../domain/Recipe.ts";

type ProfileRow = {
  user_id: number;
};

type RecipeRow = {
  recipe_id: number;
  user_id: number;
  title: string;
  description: string | null;
  ingredients: string | null;
  instructions: string | null;
  prep_time: string | null;
  cook_time: string | null;
  servings: number | null;
  meal_type: RecipeInput["mealType"];
  course: RecipeInput["course"];
  shared_from_platform: string | null;
  url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

function toRecipe(row: RecipeRow): Recipe {
  return {
    recipeId: row.recipe_id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    ingredients: row.ingredients ?? undefined,
    instructions: row.instructions ?? undefined,
    prepTime: row.prep_time ?? undefined,
    cookTime: row.cook_time ?? undefined,
    servings: row.servings ?? undefined,
    mealType: row.meal_type,
    course: row.course,
    sharedFromPlatform: row.shared_from_platform ?? undefined,
    url: row.url ?? undefined,
    mediaType: row.media_type ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseRecipeGateway implements RecipeCreator {
  constructor(private readonly client: SupabaseClient) {}

  async create(authUserId: string, input: RecipeInput): Promise<Recipe> {
    const { data: profiles, error: profileError } = await this.client
      .from("profile")
      .select("user_id")
      .eq("auth_user_id", authUserId)
      .limit(1);

    if (profileError || !profiles?.[0]) {
      throw new Error("Unable to resolve the authenticated profile.");
    }

    const profile = profiles[0] as ProfileRow;
    const { data, error } = await this.client
      .from("recipe")
      .insert({
        user_id: profile.user_id,
        title: input.title,
        description: input.description,
        ingredients: input.ingredients,
        instructions: input.instructions,
        prep_time: input.prepTime,
        cook_time: input.cookTime,
        servings: input.servings,
        meal_type: input.mealType,
        course: input.course,
        shared_from_platform: input.sharedFromPlatform,
        url: input.url,
        media_type: input.mediaType,
        thumbnail_url: input.thumbnailUrl,
      })
      .select(
        "recipe_id,user_id,title,description,ingredients,instructions,prep_time,cook_time,servings,meal_type,course,shared_from_platform,url,media_type,thumbnail_url,created_at,updated_at",
      )
      .single<RecipeRow>();

    if (error || !data) {
      throw new Error(`Unable to create recipe: ${error?.message ?? "unknown error"}`);
    }

    return toRecipe(data);
  }
}
