import { verifyUser } from "../_shared/data/verifyUser.ts";
import { handleHttpRequest } from "../_shared/ui/http.ts";
import { createClient } from "@supabase/supabase-js";
import { SupabaseTempRecipeRepository } from "../_shared/data/SupabaseTempRecipeRepository.ts";
import { handleTempRecipe } from "../_shared/ui/tempRecipeHandler.ts";

if (typeof Deno !== "undefined")
  Deno.serve((request: Request) => {
    const origins = (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return handleHttpRequest(
      request,
      origins,
      "GET, DELETE, OPTIONS",
      async () => {
        const authorization = request.headers.get("Authorization") ?? "";

        const client = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          {
            global: { headers: { Authorization: authorization } },
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          },
        );
        return handleTempRecipe(
          request,
          new SupabaseTempRecipeRepository(client),
          (token) => verifyUser(client, token),
          origins,
        );
      },
    );
  });
