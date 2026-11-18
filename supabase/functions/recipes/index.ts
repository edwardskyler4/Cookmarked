import {
  createUserEndpoint,
  environmentConfig,
  type FunctionConfig,
} from "../_shared/endpoint.ts";
import { SupabaseRecipeGateway } from "../_shared/data/SupabaseRecipeGateway.ts";
import { handleRecipeList } from "../_shared/ui/recipeListHandler.ts";
export function createRecipeRequestHandler(config: FunctionConfig) {
  return createUserEndpoint("recipes", config, (_request, context, headers) =>
    handleRecipeList(
      context.userId,
      new SupabaseRecipeGateway(context.resource),
      headers,
    ),
  );
}
if (typeof Deno !== "undefined")
  Deno.serve(createRecipeRequestHandler(environmentConfig()));
