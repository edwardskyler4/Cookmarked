import { handleHttpRequest, jsonResponse } from "../_shared/ui/http.ts";
import { verifyUser } from "../_shared/data/verifyUser.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RecipeCreator } from "../_shared/domain/Recipe.ts";
import { SupabaseRecipeGateway } from "../_shared/data/SupabaseRecipeGateway.ts";
import { handleRecipe } from "../_shared/ui/recipeHandler.ts";

type ClientOptions = Parameters<typeof createClient>[2];
type ClientFactory = (
  url: string,
  key: string,
  options?: ClientOptions,
) => SupabaseClient;

type RecipeFunctionConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  origins: string[];
  createClient?: ClientFactory;
};

export function createRecipeRequestHandler({
  supabaseUrl,
  supabaseAnonKey,
  origins,
  createClient: makeClient = createClient,
}: RecipeFunctionConfig): (request: Request) => Promise<Response> {
  return (request: Request) =>
    handleHttpRequest(
      request,
      origins,
      "GET, POST, OPTIONS",
      async (headers) => {
        const authorization = request.headers.get("Authorization");
        const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
        if (!token || !authorization)
          return jsonResponse(401, { code: "unauthorized" }, headers);

        // The client is request-scoped so one user's authorization header cannot
        // be reused for another request.
        const client = makeClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
          global: { headers: { Authorization: authorization } },
        });

        const userId = await verifyUser(client, token);
        if (!userId)
          return jsonResponse(401, { code: "unauthorized" }, headers);

        const creator: RecipeCreator = new SupabaseRecipeGateway(client);
        return handleRecipe(request, userId, creator, origins);
      },
    );
}

if (typeof Deno !== "undefined") {
  const origins = (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  Deno.serve(
    createRecipeRequestHandler({
      supabaseUrl: Deno.env.get("SUPABASE_URL")!,
      supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
      origins,
    }),
  );
}
