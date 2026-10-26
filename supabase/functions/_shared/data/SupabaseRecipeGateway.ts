import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Recipe,
  RecipeCreator,
  RecipeInput,
  RecipeReader,
} from "../domain/Recipe.ts";

type ProfileRow = {
  user_id: number;
};

type RecipeRow = {
  recipe_id: number;
  user_id: number;
  title: string;
  note: string | null;
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
  nutrition_info: string | null;
  created_at: string;
  updated_at: string;
};

function toRecipe(row: RecipeRow): Recipe {
  return {
    recipeId: row.recipe_id,
    userId: row.user_id,
    title: row.title,
    note: row.note ?? undefined,
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
    nutritionInfo: row.nutrition_info ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseRecipeGateway implements RecipeCreator, RecipeReader {
  constructor(private readonly client: SupabaseClient) {}

  private async resolveProfile(authUserId: string): Promise<ProfileRow> {
    const { data: profiles, error: profileError } = await this.client
      .from("profile")
      .select("user_id")
      .eq("auth_user_id", authUserId)
      .limit(1);

    if (profileError || !profiles?.[0]) {
      throw new Error("Unable to resolve the authenticated profile.");
    }

    return profiles[0] as ProfileRow;
  }

  async list(authUserId: string): Promise<Recipe[]> {
    const profile = await this.resolveProfile(authUserId);
    const { data, error } = await this.client
      .from("recipe")
      .select(
        "recipe_id,user_id,title,note,ingredients,instructions,prep_time,cook_time,servings,meal_type,course,created_at,updated_at,shared_from_platform,url,media_type,thumbnail_url,nutrition_info",
      )
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false })
      .returns<RecipeRow[]>();

    if (error || !data) {
      throw new Error(`Unable to list recipes: ${error?.message ?? "unknown error"}`);
    }

    return data.map(toRecipe);
  }

  async create(authUserId: string, input: RecipeInput): Promise<Recipe> {
    const profile = await this.resolveProfile(authUserId);
    const { data, error } = await this.client
      .from("recipe")
      .insert({
        user_id: profile.user_id,
        title: input.title,
        note: input.note ?? input.description,
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
        nutrition_info: input.nutritionInfo,
      })
      .select(
        "recipe_id,user_id,title,note,ingredients,instructions,prep_time,cook_time,servings,meal_type,course,created_at,updated_at,shared_from_platform,url,media_type,thumbnail_url,nutrition_info",
      )
      .single<RecipeRow>();

    if (error || !data) {
      throw new Error(`Unable to create recipe: ${error?.message ?? "unknown error"}`);
    }

    return toRecipe(data);
  }
}
