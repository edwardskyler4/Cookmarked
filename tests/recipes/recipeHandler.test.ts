import { describe, expect, it, vi } from "vitest";
import { handleRecipe } from "../../supabase/functions/_shared/ui/recipeHandler";
import type {
  Recipe,
  RecipeCreator,
  RecipeInput,
} from "../../supabase/functions/_shared/domain/Recipe";

const recipe: Recipe = {
  recipeId: 7,
  userId: 42,
  title: "Tomato Pasta",
  description: "A quick pasta dinner.",
  ingredients: "Pasta\nTomatoes",
  instructions: "Boil pasta and add tomatoes.",
  prepTime: "10 min",
  cookTime: "20 min",
  servings: 2,
  mealType: "Dinner",
  course: "Entree",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("handleRecipe", () => {
  it("creates a recipe from an authenticated POST request", async () => {
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
    const create = vi.fn<RecipeCreator["create"]>().mockResolvedValue(recipe);
    const creator: RecipeCreator = { create };

    const response = await handleRecipe(
      new Request("https://example.test/recipes", {
        method: "POST",
        headers: { Origin: "http://localhost:5173" },
        body: JSON.stringify(input),
      }),
      "auth-user-id",
      creator,
      ["http://localhost:5173"],
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
    expect(await response.json()).toEqual(JSON.parse(JSON.stringify(recipe)));
    expect(create).toHaveBeenCalledWith("auth-user-id", input);
  });
});
