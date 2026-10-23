import { createClient } from "@supabase/supabase-js";
import { SupabaseRecipeRepository } from "../_shared/data/SupabaseRecipeRepository.ts";
import { handleRecipe } from "../_shared/ui/recipeHandler.ts";

Deno.serve((request: Request) => {
  // Each request gets an owner-scoped client, never a service-role client.
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: request.headers.get("Authorization") ?? "" },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const origins = (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return handleRecipe(
    request,
    new SupabaseRecipeRepository(client),
    async (token) => {
      const { data, error } = await client.auth.getUser(token);
      if (error) {
        if (
          error.status === 401 ||
          error.status === 403 ||
          error.status === 400
        )
          return null;
        throw error;
      }
      return data.user?.id ?? null;
    },
    origins,
  );
});
