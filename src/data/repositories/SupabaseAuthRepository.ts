import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  AuthenticationError,
  type AuthUser,
} from "../../domain/models/AuthUser";
import type { AuthRepository } from "../../domain/repositories/AuthRepository";

function toUser(user: User): AuthUser {
  const match = user.email?.match(
    /^([a-z0-9_]{3,32})@accounts\.cookmarked\.edw20009\.workers\.dev$/,
  );
  if (!match) throw new AuthenticationError("unavailable");
  return { id: user.id, username: match[1] };
}

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  register(username: string, password: string) {
    return this.authenticate("register", username, password);
  }
  login(username: string, password: string) {
    return this.authenticate("login", username, password);
  }

  private async authenticate(
    action: "register" | "login",
    username: string,
    password: string,
  ): Promise<AuthUser> {
    const { data, error } = await this.client.functions.invoke("auth", {
      body: { action, username, password },
    });
    if (error) {
      let code = "unavailable";
      if (error.context instanceof Response) {
        try {
          const body = await error.context.json();
          if (typeof body.code === "string") code = body.code;
        } catch {
          /* Non-JSON transport errors use the generic message. */
        }
      }
      throw new AuthenticationError(code);
    }
    if (
      typeof data?.access_token !== "string" ||
      typeof data?.refresh_token !== "string"
    )
      throw new AuthenticationError("unavailable");
    const { data: installed, error: sessionError } =
      await this.client.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
    if (sessionError || !installed.session)
      throw new AuthenticationError("unavailable");
    return toUser(installed.session.user);
  }

  async restore(): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error) {
      if (error.name === "AuthSessionMissingError") return null;
      if (
        error.status === 401 ||
        error.status === 403 ||
        [
          "refresh_token_not_found",
          "refresh_token_already_used",
          "session_not_found",
          "user_not_found",
          "bad_jwt",
        ].includes(error.code ?? "")
      ) {
        await this.client.auth.signOut({ scope: "local" });
        return null;
      }
      throw new AuthenticationError("unavailable");
    }
    return data.user ? toUser(data.user) : null;
  }

  async logout(): Promise<void> {
    const { error } = await this.client.auth.signOut({ scope: "local" });
    if (error) throw new AuthenticationError("unavailable");
  }

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      // Cached startup data must pass getUser() before the library is shown.
      if (event === "INITIAL_SESSION") return;
      try {
        listener(session ? toUser(session.user) : null);
      } catch {
        listener(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }
}
