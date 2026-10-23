import { describe, expect, it, vi } from "vitest";
import { createRecipe } from "../../supabase/functions/_shared/services/createRecipe";

export const input = {
  title: "Soup",
  prepTime: "30 min",
  servings: 4,
  ingredients: "Water",
  instructions: "Boil",
  mealType: "",
  course: "",
  url: "",
  note: "Family favorite",
  nutritionInfo: "100 kcal",
};
const repository = () => ({
  findProfileId: vi.fn().mockResolvedValue(42),
  insert: vi.fn().mockResolvedValue({ recipeId: 7 }),
});

describe("createRecipe", () => {
  it("creates a recipe for the verified account rather than a supplied owner", async () => {
    const repo = repository();
    expect(
      await createRecipe(repo, "verified-user", {
        ...input,
        user_id: 99,
        recipe_id: 888,
      }),
    ).toEqual({ recipeId: 7 });
    expect(repo.findProfileId).toHaveBeenCalledWith("verified-user");
    expect(repo.insert).toHaveBeenCalledWith({
      ...input,
      mealType: "N/A",
      course: "N/A",
      userId: 42,
    });
  });
  it.each(["mealType", "course"])(
    "defaults whitespace %s to N/A",
    async (field) => {
      const repo = repository();
      await createRecipe(repo, "user", { ...input, [field]: "  " });
      expect(repo.insert.mock.calls[0][0][field]).toBe("N/A");
    },
  );
  it("preserves valid selections and trims text", async () => {
    const repo = repository();
    await createRecipe(repo, "user", {
      ...input,
      title: " Soup ",
      mealType: "Dinner",
      course: "Entree",
      url: "https://example.com/recipe",
    });
    expect(repo.insert.mock.calls[0][0]).toMatchObject({
      title: "Soup",
      mealType: "Dinner",
      course: "Entree",
      url: "https://example.com/recipe",
    });
  });
  it.each(["title", "prepTime", "ingredients", "instructions"])(
    "rejects empty %s",
    async (field) => {
      const repo = repository();
      await expect(
        createRecipe(repo, "user", { ...input, [field]: "  " }),
      ).rejects.toMatchObject({ code: "invalid_input", field });
      expect(repo.insert).not.toHaveBeenCalled();
    },
  );
  it.each([1.5, "4 servings", "4", null, 2147483648, -2147483649])(
    "rejects invalid servings %s",
    async (servings) => {
      await expect(
        createRecipe(repository(), "user", { ...input, servings }),
      ).rejects.toMatchObject({ field: "servings" });
    },
  );
  it.each([0, -1, 2147483647])(
    "accepts integer servings %s",
    async (servings) => {
      await expect(
        createRecipe(repository(), "user", { ...input, servings }),
      ).resolves.toEqual({ recipeId: 7 });
    },
  );
  it.each([
    "http://example.com",
    "not-a-url",
    "https://",
    "https:///example.com",
    "ftp://example.com",
  ])("rejects source %s", async (url) => {
    await expect(
      createRecipe(repository(), "user", { ...input, url }),
    ).rejects.toMatchObject({ field: "url" });
  });
  it.each(["title", "prepTime"])(
    "rejects %s longer than 45 characters",
    async (field) => {
      await expect(
        createRecipe(repository(), "user", {
          ...input,
          [field]: "x".repeat(46),
        }),
      ).rejects.toMatchObject({ field });
    },
  );
  it.each(["mealType", "course"])("rejects an unknown %s", async (field) => {
    await expect(
      createRecipe(repository(), "user", { ...input, [field]: "Other" }),
    ).rejects.toMatchObject({ field });
  });
  it.each([null, [], "soup", {}, { ...input, note: 123 }])(
    "rejects malformed input %s",
    async (value) => {
      await expect(
        createRecipe(repository(), "user", value),
      ).rejects.toMatchObject({ code: "invalid_input" });
    },
  );
  it("rejects a missing profile without inserting", async () => {
    const repo = repository();
    repo.findProfileId.mockResolvedValue(null);
    await expect(createRecipe(repo, "user", input)).rejects.toMatchObject({
      code: "profile_not_found",
    });
    expect(repo.insert).not.toHaveBeenCalled();
  });
});
