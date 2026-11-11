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
  it("deletes the temporary recipe after the permanent recipe is saved", async () => {
    const create = vi.fn().mockResolvedValue({ recipeId: 9 });
    const remove = vi.fn().mockResolvedValue(undefined);

    await convertTempRecipe({ create }, { remove }, 3, draft);

    expect(create).toHaveBeenCalledWith(draft);
    expect(remove).toHaveBeenCalledWith(3);
  });

  it("does not delete the temporary recipe when saving the permanent recipe fails", async () => {
    const create = vi.fn().mockRejectedValue(new Error("save failed"));
    const remove = vi.fn().mockResolvedValue(undefined);

    await expect(
      convertTempRecipe({ create }, { remove }, 3, draft),
    ).rejects.toThrow("save failed");

    expect(remove).not.toHaveBeenCalled();
  });
});
