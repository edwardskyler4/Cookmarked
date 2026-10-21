import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
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

function errorResponse(status: number): Response {
  return new Response(JSON.stringify({ code: "unauthorized" }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function createRecipeRequestHandler({
  supabaseUrl,
  supabaseAnonKey,
  origins,
  createClient: makeClient = createClient,
}: RecipeFunctionConfig): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const authorization = request.headers.get("Authorization");
    const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token || !authorization) return errorResponse(401);

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

    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return errorResponse(401);

    const creator: RecipeCreator = new SupabaseRecipeGateway(client);
    return handleRecipe(request, data.user.id, creator, origins);
  };
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
