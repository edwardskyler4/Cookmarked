
import {
  createUserEndpoint,
  environmentConfig,
  type FunctionConfig,
} from "../_shared/endpoint.ts";
import { SupabaseRecipeGateway } from "../_shared/data/SupabaseRecipeGateway.ts";
import { handleRecipeList } from "../_shared/ui/recipeListHandler.ts";

export function createRecipeRequestHandler(config: FunctionConfig) {
  return createUserEndpoint(
    "recipes",
    config,
    async (request, context, headers) => {
      const gateway = new SupabaseRecipeGateway(context.resource);

      // Delete a saved recipe
      if (request.method === "DELETE") {
        const url = new URL(request.url);
        const id = Number(url.searchParams.get("recipeId"));

        if (
          !url.searchParams.has("recipeId") ||
          !Number.isSafeInteger(id) ||
          id <= 0
        ) {
          return new Response(
            JSON.stringify({ code: "invalid_input" }),
            { status: 400, headers },
          );
        }

        try {
          await gateway.delete(context.userId, id);

          return new Response(null, {
            status: 204,
            headers,
          });
        } catch (error) {
          console.error("Unable to delete recipe", error);

          return new Response(
            JSON.stringify({ code: "unavailable" }),
            { status: 503, headers },
          );
        }
      }

      // List saved recipes
      return handleRecipeList(
        context.userId,
        gateway,
        headers,
      );
    },
  );
}

if (typeof Deno !== "undefined") {
  Deno.serve(createRecipeRequestHandler(environmentConfig()));
}

