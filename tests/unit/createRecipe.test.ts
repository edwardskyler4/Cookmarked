import { describe, expect, it } from "vitest";
import { createRecipe } from "../../src/services/createRecipe";
import type { RecipeInput } from "../../src/domain/models/Recipe";
import type { RecipeRepository } from "../../src/domain/repositories/RecipeRepository";

describe("createRecipe", () => {
  it("creates a recipe for the authenticated profile owner", async () => {
    const input: RecipeInput = {
      title: "Tomato Pasta",
      description: "A quick pasta dinner.",
      ingredients: "Pasta\nTomatoes",
      instructions: "Boil pasta and add tomatoes.",
      prepTime: "10 min",
      cookTime: "20 min",
      servings: 2,
      mealType: "Dinner",
      course: "Entree",
    };
    const saved = {
      recipeId: 7,
      userId: 42,
      ...input,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const calls: Array<{ userId: number; input: RecipeInput }> = [];
    const repository: RecipeRepository = {
      async create(userId, recipeInput) {
        calls.push({ userId, input: recipeInput });
        return saved;
      },
    };

    const result = await createRecipe(repository, 42, input);

    expect(calls).toEqual([{ userId: 42, input }]);
    expect(result).toEqual(saved);
  });
});
