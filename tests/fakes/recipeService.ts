import { vi } from "vitest";
export const fakeRecipeService = () => ({
  create: vi.fn().mockResolvedValue({ recipeId: 7 }),
});
