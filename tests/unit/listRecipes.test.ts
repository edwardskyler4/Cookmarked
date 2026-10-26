import { describe, expect, it } from "vitest";
import { listRecipes } from "../../src/services/listRecipes";
import type { Recipe } from "../../src/domain/models/Recipe";
import type { RecipeReader } from "../../src/domain/repositories/RecipeReader";

describe("listRecipes", () => {
  it("returns the recipes available to the signed-in user", async () => {
    const recipes: Recipe[] = [
      {
        recipeId: 7,
        userId: 42,
        title: "Tomato Pasta",
        mealType: "Dinner",
        course: "Entree",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];
    const reader: RecipeReader = {
      list: async () => recipes,
    };

    await expect(listRecipes(reader)).resolves.toEqual(recipes);
  });
});
