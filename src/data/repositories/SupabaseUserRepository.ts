import type { User } from "../../domain/models/User";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import { supabase } from "../supabaseClient";

type UserRow = {
  user_id: number;
  username: string;
};

export class SupabaseUserRepository implements UserRepository {
  async save(username: string): Promise<User> {
    const { data, error } = await supabase
      .from("Users")
      .insert({ username })
      .select("user_id, username")
      .single<UserRow>();

    if (error) {
      throw new Error(`Unable to save user: ${error.message}`);
    }

    return { id: data.user_id, username: data.username };
  }
}
