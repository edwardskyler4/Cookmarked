import { describe, expect, it, vi } from "vitest";
import { handleTempRecipe } from "../../supabase/functions/_shared/ui/tempRecipeHandler";

describe("handleTempRecipe", () => {
  it("lists the authenticated user's temporary recipes", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue([{ recipeId: 3, title: "Soup" }]),
      remove: vi.fn(),
    };

    const response = await handleTempRecipe(
      new Request("https://api.example/temp_recipes", {
        headers: { Authorization: "Bearer good-token" },
      }),
      repository,
      async (token) => (token === "good-token" ? "auth-user-1" : null),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ recipeId: 3, title: "Soup" }]);
    expect(repository.list).toHaveBeenCalledWith("auth-user-1");
  });

  it("removes only the requested temporary recipe for the authenticated user", async () => {
    const repository = {
      list: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const response = await handleTempRecipe(
      new Request("https://api.example/temp_recipes", {
        method: "DELETE",
        headers: { Authorization: "Bearer good-token" },
        body: JSON.stringify({ recipeId: 3 }),
      }),
      repository,
      async () => "auth-user-1",
    );

    expect(response.status).toBe(204);
    expect(repository.remove).toHaveBeenCalledWith("auth-user-1", 3);
  });

  it("rejects requests without a verified bearer token", async () => {
    const repository = { list: vi.fn(), remove: vi.fn() };
    const response = await handleTempRecipe(
      new Request("https://api.example/temp_recipes"),
      repository,
      async () => null,
    );

    expect(response.status).toBe(401);
    expect(repository.list).not.toHaveBeenCalled();
  });
});
