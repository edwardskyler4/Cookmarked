import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AuthError,
  type AuthGateway,
  type AuthTokens,
} from "../domain/AuthGateway.ts";

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: SupabaseClient) {}

  async register(
    email: string,
    password: string,
    username: string,
  ): Promise<AuthTokens> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return this.tokens(data.session, error);
  }

  async login(
    email: string,
    password: string,
    _username: string,
  ): Promise<AuthTokens> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    return this.tokens(data.session, error);
  }

  private tokens(
    session: AuthTokens | null,
    error: { code?: string; status?: number } | null,
  ): AuthTokens {
    if (error) {
      if (error.status === 429) throw new AuthError("rate_limited");
      if (error.code === "invalid_credentials")
        throw new AuthError("invalid_credentials");
      if (error.code === "user_already_exists" || error.code === "email_exists")
        throw new AuthError("username_taken");
      if (error.code === "weak_password") throw new AuthError("weak_password");
      throw new AuthError("unavailable");
    }
    // Missing tokens mean immediate sign-in is impossible (e.g. confirmations enabled).
    if (!session?.access_token || !session.refresh_token)
      throw new AuthError("unavailable");
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
  }
}
