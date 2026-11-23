import type {
  RecipeRepository,
  RecipeConversionRepository,
} from "../../supabase/functions/_shared/domain/RecipeRepository";
import type { RecipeReader } from "../../supabase/functions/_shared/domain/Recipe";
import type { TempRecipeRepository } from "../../supabase/functions/_shared/domain/TempRecipeRepository";
import type { AuthGateway } from "../../supabase/functions/_shared/domain/AuthGateway";
type Verify = (token: string) => Promise<string | null>;
// Exercise the real HTTP boundary with injected authentication and repositories.
import {
  userEndpoint,
  credentialEndpoint,
} from "../../supabase/functions/_shared/ui/endpoint";
import { handleRecipe as save } from "../../supabase/functions/_shared/ui/recipeHandler";
import { handleTempRecipe as temporary } from "../../supabase/functions/_shared/ui/tempRecipeHandler";
import { handleAuth as credentials } from "../../supabase/functions/_shared/ui/authHandler";
import { handleRecipeList as list } from "../../supabase/functions/_shared/ui/recipeListHandler";
export function handleRecipe(
  request: Request,
  repository: RecipeRepository & Partial<RecipeConversionRepository>,
  verify: Verify,
  origins: string[],
) {
  return userEndpoint(
    "recipes_save",
    request,
    origins,
    async (token) => {
      const userId = await verify(token);
      return userId ? { userId, resource: repository } : null;
    },
    (context, headers) =>
      save(request, context.userId, context.resource, headers),
  );
}
export function handleTempRecipe(
  request: Request,
  repository: TempRecipeRepository,
  verify: Verify,
  origins: string[] = [],
) {
  return userEndpoint(
    "temp_recipes",
    request,
    origins,
    async (token) => {
      const userId = await verify(token);
      return userId ? { userId, resource: repository } : null;
    },
    (context, headers) =>
      temporary(request, context.userId, context.resource, headers),
  );
}
export function handleAuth(
  request: Request,
  gateway: AuthGateway,
  origins: string[],
) {
  return credentialEndpoint(request, origins, (headers) =>
    credentials(request, gateway, headers),
  );
}
export function handleRecipeList(
  request: Request,
  userId: string,
  repository: RecipeReader,
  origins: string[],
) {
  return userEndpoint(
    "recipes",
    request,
    origins,
    async () => ({ userId, resource: repository }),
    (context, headers) => list(context.userId, context.resource, headers),
  );
}
