import { createUserEndpoint, environmentConfig } from "../_shared/endpoint.ts";
import { SupabaseRecipeRepository } from "../_shared/data/SupabaseRecipeRepository.ts";
import { handleRecipe } from "../_shared/ui/recipeHandler.ts";
if (typeof Deno !== "undefined")
  Deno.serve(
    createUserEndpoint(
      "recipes_save",
      environmentConfig(),
      (request, context, headers) =>
        handleRecipe(
          request,
          context.userId,
          new SupabaseRecipeRepository(context.resource),
          headers,
        ),
    ),
  );
