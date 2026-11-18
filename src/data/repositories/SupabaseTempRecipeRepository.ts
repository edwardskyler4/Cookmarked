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

  async capture(url: string): Promise<TempRecipe> {
    const { data, error } = await this.client.functions.invoke("capture", {
      body: { url },
    });
    if (error || !data?.capture) {
      let detail = error?.message ?? "unknown error";
      if (error?.context instanceof Response) {
        try {
          const body = await error.context.clone().json();
          if (typeof body?.code === "string") detail = `${detail} (${body.code})`;
        } catch {
          // Keep the SDK error when the function did not return JSON.
        }
      }
      throw new Error(`Unable to capture recipe: ${detail}`);
    }
    const capture = data.capture;
    return {
      recipeId: capture.captureId,
      title: capture.title,
      text: capture.description,
      sharedFromPlatform: capture.platform,
      url: capture.canonicalUrl,
      mediaType: capture.mediaType,
      thumbnailUrl: capture.thumbnailUrl,
    };
  }
}
