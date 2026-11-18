import { describe, expect, it, vi } from "vitest";
import { convertTempRecipe } from "../../supabase/functions/_shared/services/createRecipe";
import { recipeInput } from "../fakes/recipe";

function repository() {
  return {
    findProfileId: vi.fn().mockResolvedValue(42),
    convert: vi.fn().mockResolvedValue({ recipeId: 7 }),
  };
}

describe("server-side temporary recipe conversion", () => {
  it("passes validated input to one atomic storage operation", async () => {
    const repo = repository();
    await expect(
      convertTempRecipe(repo, "verified-user", 3, {
        ...recipeInput,
        user_id: 99,
      }),
    ).resolves.toEqual({ recipeId: 7 });
    expect(repo.findProfileId).toHaveBeenCalledWith("verified-user");
    expect(repo.convert).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        userId: 42,
        title: "Soup",
        mealType: "N/A",
        course: "N/A",
      }),
    );
  });

  it.each([0, -1, 1.5, "3", null, 2147483648])(
    "rejects an invalid temporary recipe ID %s",
    async (tempId) => {
      const repo = repository();
      await expect(
        convertTempRecipe(repo, "verified-user", tempId, recipeInput),
      ).rejects.toMatchObject({ code: "invalid_input", field: "tempRecipeId" });
      expect(repo.convert).not.toHaveBeenCalled();
    },
  );

  it("does not write when the draft is invalid", async () => {
    const repo = repository();
    await expect(
      convertTempRecipe(repo, "verified-user", 3, {
        ...recipeInput,
        title: "",
      }),
    ).rejects.toMatchObject({ code: "invalid_input", field: "title" });
    expect(repo.convert).not.toHaveBeenCalled();
  });

  it("does not write without an owned profile", async () => {
    const repo = repository();
    repo.findProfileId.mockResolvedValue(null);
    await expect(
      convertTempRecipe(repo, "verified-user", 3, recipeInput),
    ).rejects.toMatchObject({ code: "profile_not_found" });
    expect(repo.convert).not.toHaveBeenCalled();
  });
});
