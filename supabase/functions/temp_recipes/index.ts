import { createClient } from "@supabase/supabase-js";
import { SupabaseTempRecipeRepository } from "../_shared/data/SupabaseTempRecipeRepository.ts";
import { handleTempRecipe } from "../_shared/ui/tempRecipeHandler.ts";

Deno.serve((request: Request) => {
  const authorization = request.headers.get("Authorization") ?? "";
  const origins = (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  return handleTempRecipe(
    request,
    new SupabaseTempRecipeRepository(client),
    async (token) => {
      const { data, error } = await client.auth.getUser(token);
      return error ? null : data.user?.id ?? null;
    },
    origins,
  );
});
