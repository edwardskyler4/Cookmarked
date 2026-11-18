import { vi } from "vitest";
import type { RecipeMetadataService } from "../../src/services/recipeMetadataService";

export const fakeRecipeMetadataService = (): RecipeMetadataService => ({
  getMetadata: vi.fn().mockResolvedValue({
    title: null,
    description: null,
    thumbnailUrl: null,
    platform: "Instagram",
    sourceUrl: "https://www.instagram.com/p/example/",
  }),
});
