import { describe, expect, it, vi } from "vitest";
import { SupabaseTempRecipeRepository } from "../../src/data/repositories/SupabaseTempRecipeRepository";

describe("SupabaseTempRecipeRepository", () => {
  it("loads temporary recipes from the authenticated temp recipe function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: [
        {
          recipeId: 3,
          title: "Tomato soup",
          text: "Imported recipe text",
          url: "https://example.com/soup",
          sharedFromPlatform: "Instagram",
          mediaType: "video",
          thumbnailUrl: "https://example.com/soup.jpg",
        },
      ],
      error: null,
    });
    const repository = new SupabaseTempRecipeRepository({
      functions: { invoke },
    } as never);

    await expect(repository.list()).resolves.toEqual([
      {
        recipeId: 3,
        title: "Tomato soup",
        text: "Imported recipe text",
        url: "https://example.com/soup",
        sharedFromPlatform: "Instagram",
        mediaType: "video",
        thumbnailUrl: "https://example.com/soup.jpg",
      },
    ]);
    expect(invoke).toHaveBeenCalledWith("temp_recipes", { method: "GET" });
  });

  it("removes a temporary recipe through the authenticated function", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: null });
    const repository = new SupabaseTempRecipeRepository({
      functions: { invoke },
    } as never);

    await repository.remove(3);

    expect(invoke).toHaveBeenCalledWith("temp_recipes", {
      method: "DELETE",
      body: { recipeId: 3 },
    });
  });
});
