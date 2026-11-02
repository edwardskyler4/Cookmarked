import { describe, expect, it, vi } from "vitest";
import { SupabaseRecipeRepository } from "../../src/data/repositories/SupabaseRecipeRepository";

describe("SupabaseRecipeRepository", () => {
  it("loads recipes from the authenticated recipes function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: [
        {
          recipeId: 7,
          userId: 42,
          title: "Tomato Pasta",
          mealType: "Dinner",
          course: "Entree",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const repository = new SupabaseRecipeRepository({ functions: { invoke } } as never);

    await expect(repository.list()).resolves.toMatchObject([
      { recipeId: 7, title: "Tomato Pasta", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    expect(invoke).toHaveBeenCalledWith("recipes", { method: "GET" });
  });
});
