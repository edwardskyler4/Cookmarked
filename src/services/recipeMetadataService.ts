
import type { RecipeMetadataRepository } from "../domain/repositories/RecipeMetadataRepository";

export function createRecipeMetadataService(
  repository: RecipeMetadataRepository,
): RecipeMetadataRepository {
  return {
    getMetadata: (url) => repository.getMetadata(url),
  };
}

export type RecipeMetadataService = ReturnType<
  typeof createRecipeMetadataService
>;
