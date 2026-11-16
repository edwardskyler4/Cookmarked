import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TempRecipe,
  TempRecipeRepository,
} from "../domain/TempRecipeRepository.ts";
import type { Capture, CaptureRepository, NewCapture } from "../domain/Capture.ts";

type TempRecipeRow = {
  recipe_id: number;
  title: string;
  text: string | null;
  shared_from_platform: string | null;
  url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
};

export class SupabaseTempRecipeRepository implements TempRecipeRepository, CaptureRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async profileId(authUserId: string): Promise<number> {
    const { data, error } = await this.client
      .from("profile")
      .select("user_id")
      .eq("auth_user_id", authUserId)
      .single();
    if (error || !data) throw error ?? new Error("Profile not found");
    return data.user_id;
  }

  async list(authUserId: string): Promise<TempRecipe[]> {
    const userId = await this.profileId(authUserId);
    const { data, error } = await this.client
      .from("temp_recipe")
      .select("recipe_id,title,text,shared_from_platform,url,media_type,thumbnail_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as TempRecipeRow[]).map((row) => ({
      recipeId: row.recipe_id,
      title: row.title,
      text: row.text,
      sharedFromPlatform: row.shared_from_platform,
      url: row.url,
      mediaType: row.media_type,
      thumbnailUrl: row.thumbnail_url,
    }));
  }

  async remove(authUserId: string, recipeId: number): Promise<void> {
    const userId = await this.profileId(authUserId);
    const { error } = await this.client
      .from("temp_recipe")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  async findByCanonicalUrl(authUserId: string, canonicalUrl: string): Promise<Capture | null> {
    const userId = await this.profileId(authUserId);
    const { data, error } = await this.client
      .from("temp_recipe")
      .select("recipe_id,title,text,shared_from_platform,url,media_type,thumbnail_url")
      .eq("user_id", userId)
      .eq("url", canonicalUrl)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as TempRecipeRow;
    return {
      captureId: row.recipe_id,
      authUserId,
      canonicalUrl,
      platform: row.shared_from_platform as Capture["platform"],
      title: row.title,
      description: row.text ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
      mediaType: row.media_type ?? undefined,
    };
  }

  async save(capture: NewCapture): Promise<Capture> {
    const userId = await this.profileId(capture.authUserId);
    const { data, error } = await this.client
      .from("temp_recipe")
      .insert({
        user_id: userId,
        title: capture.title,
        text: capture.description ?? null,
        shared_from_platform: capture.platform,
        url: capture.canonicalUrl,
        media_type: capture.mediaType ?? null,
        thumbnail_url: capture.thumbnailUrl ?? null,
      })
      .select("recipe_id,title,text,shared_from_platform,url,media_type,thumbnail_url")
      .single();
    if (error || !data) throw error ?? new Error("Unable to save capture");
    const row = data as TempRecipeRow;
    return {
      captureId: row.recipe_id,
      authUserId: capture.authUserId,
      canonicalUrl: row.url ?? capture.canonicalUrl,
      platform: capture.platform,
      title: row.title,
      description: row.text ?? undefined,
      thumbnailUrl: row.thumbnail_url ?? undefined,
      mediaType: row.media_type ?? undefined,
    };
  }
}
