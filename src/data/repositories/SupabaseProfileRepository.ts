import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../../domain/models/Profile";
import type { ProfileRepository } from "../../domain/repositories/ProfileRepository";

type ProfileRow = { first_name: string | null };

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getCurrent(): Promise<Profile> {
    const { data, error } = await this.client
      .from("profile")
      .select("first_name")
      .single<ProfileRow>();
    if (error) throw new Error(`Unable to load profile: ${error.message}`);
    return { firstName: data.first_name ?? "" };
  }

  async updateFirstName(firstName: string): Promise<Profile> {
    const {
      data: { user },
      error: userError,
    } = await this.client.auth.getUser();
    if (userError || !user) {
      throw new Error("Unable to identify the current user");
    }

    const { data, error } = await this.client
      .from("profile")
      .update({ first_name: firstName })
      .eq("auth_user_id", user.id)
      .select("first_name")
      .single<ProfileRow>();
    if (error) throw new Error(`Unable to update profile: ${error.message}`);
    return { firstName: data.first_name ?? "" };
  }
}
