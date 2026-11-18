import { vi } from "vitest";
export const fakeRecipeService = () => ({
  convert: vi.fn().mockResolvedValue({ recipeId: 7 }),
  create: vi.fn().mockResolvedValue({ recipeId: 7 }),
});
