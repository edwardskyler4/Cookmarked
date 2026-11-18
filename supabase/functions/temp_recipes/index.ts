import { createUserEndpoint, environmentConfig } from "../_shared/endpoint.ts";
import { SupabaseTempRecipeRepository } from "../_shared/data/SupabaseTempRecipeRepository.ts";
import { handleTempRecipe } from "../_shared/ui/tempRecipeHandler.ts";
if (typeof Deno !== "undefined")
  Deno.serve(
    createUserEndpoint(
      "temp_recipes",
      environmentConfig(),
      (request, context, headers) =>
        handleTempRecipe(
          request,
          context.userId,
          new SupabaseTempRecipeRepository(context.resource),
          headers,
        ),
    ),
  );
