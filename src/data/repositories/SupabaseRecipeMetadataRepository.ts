
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeMetadataRepository } from "../../domain/repositories/RecipeMetadataRepository";
import type { RecipeMetadata } from "../../domain/models/RecipeMetaData";

export class SupabaseRecipeMetadataRepository
  implements RecipeMetadataRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async getMetadata(url: string): Promise<RecipeMetadata> {
    const { data, error } = await this.client.functions.invoke(
      "recipe_metadata",
      {
        body: { url },
      },
    );

    if (error) {
      throw new Error("Unable to retrieve recipe metadata.");
    }

    return data as RecipeMetadata;
  }
}
