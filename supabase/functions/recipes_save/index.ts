import { verifyUser } from "../_shared/data/verifyUser.ts";
import { handleHttpRequest } from "../_shared/ui/http.ts";
import { createClient } from "@supabase/supabase-js";
import { SupabaseRecipeRepository } from "../_shared/data/SupabaseRecipeRepository.ts";
import { handleRecipe } from "../_shared/ui/recipeHandler.ts";

if (typeof Deno !== "undefined")
  Deno.serve((request: Request) => {
    const origins = (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return handleHttpRequest(request, origins, "POST, OPTIONS", async () => {
      // Each request gets an owner-scoped client, never a service-role client.
      const client = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
          global: {
            headers: {
              Authorization: request.headers.get("Authorization") ?? "",
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        },
      );

      return handleRecipe(
        request,
        new SupabaseRecipeRepository(client),
        (token) => verifyUser(client, token),
        origins,
      );
    });
  });
