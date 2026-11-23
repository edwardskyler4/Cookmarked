import { describe, expect, it, vi } from "vitest";
import { convertTempRecipe } from "../../src/services/convertTempRecipe";
import type { RecipeDraft } from "../../src/domain/repositories/RecipeApiRepository";

const draft: RecipeDraft = {
  title: "Tomato soup",
  prepTime: "10 min",
  servings: 4,
  ingredients: "Tomatoes",
  instructions: "Simmer",
  mealType: "Dinner",
  course: "Entree",
  url: "https://example.com/soup",
  note: "Imported text",
  nutritionInfo: "",
};

describe("convertTempRecipe", () => {
  it("delegates conversion to the server as one request", async () => {
    const convert = vi.fn().mockResolvedValue({ recipeId: 9 });
    await expect(convertTempRecipe({ convert }, 3, draft)).resolves.toEqual({
      recipeId: 9,
    });
    expect(convert).toHaveBeenCalledExactlyOnceWith(3, draft);
  });

  it("propagates a failed conversion so the user can retry the same temporary ID", async () => {
    const convert = vi.fn().mockRejectedValue(new Error("conversion failed"));
    await expect(convertTempRecipe({ convert }, 3, draft)).rejects.toThrow(
      "conversion failed",
    );
    expect(convert).toHaveBeenCalledExactlyOnceWith(3, draft);
  });
});
