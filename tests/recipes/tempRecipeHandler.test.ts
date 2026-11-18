import { describe, expect, it, vi } from "vitest";
import { handleTempRecipe } from "../fakes/endpoints";

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

describe("temporary recipe outage diagnostics", () => {
  it("returns a CORS-readable failure with a safe storage diagnostic", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await handleTempRecipe(
        new Request("https://example.test/temp_recipes", {
          headers: {
            Authorization: "Bearer token",
            Origin: "https://app.example",
          },
        }),
        {
          list: vi.fn().mockRejectedValue(
            Object.assign(new Error("private recipe text"), {
              code: "PGRST204",
            }),
          ),
          remove: vi.fn(),
        },
        async () => "user",
        ["https://app.example"],
      );
      expect(response.status).toBe(503);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://app.example",
      );
      expect(log).toHaveBeenCalledWith("Unable to access temporary recipes", {
        name: "Error",
        code: "PGRST204",
      });
    } finally {
      log.mockRestore();
    }
  });
});
