import { describe, expect, it, vi } from "vitest";
import { handleRecipe, handleRecipeList } from "../fakes/endpoints";
import { recipeInput } from "../fakes/recipe";
const origin = "https://cookmarked.example";
const repository = () => ({
  findProfileId: vi.fn().mockResolvedValue(42),
  insert: vi.fn().mockResolvedValue({ recipeId: 7 }),
});
const request = (
  body = JSON.stringify(recipeInput),
  method = "POST",
  site = origin,
  token = "Bearer valid",
) =>
  new Request("https://api.example/recipes_save", {
    method,
    headers: {
      Origin: site,
      Authorization: token,
      "Content-Type": "application/json",
    },
    ...(method === "POST" ? { body } : {}),
  });
describe("recipe handler", () => {
  it("verifies the bearer token before creating an owned recipe", async () => {
    const verify = vi.fn().mockResolvedValue("verified-user");
    const repo = repository();
    const response = await handleRecipe(request(), repo, verify, [origin]);
    expect(verify).toHaveBeenCalledWith("valid");
    expect(repo.findProfileId).toHaveBeenCalledWith("verified-user");
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ recipeId: 7 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each(["", "Basic xyz", "Bearer"])(
    "rejects missing or malformed authorization %s",
    async (token) => {
      const verify = vi.fn();
      const repo = repository();
      expect(
        (
          await handleRecipe(
            request(undefined, "POST", origin, token),
            repo,
            verify,
            [origin],
          )
        ).status,
      ).toBe(401);
      expect(verify).not.toHaveBeenCalled();
      expect(repo.insert).not.toHaveBeenCalled();
    },
  );
  it("rejects a token the auth server does not verify", async () => {
    const repo = repository();
    expect(
      (await handleRecipe(request(), repo, async () => null, [origin])).status,
    ).toBe(401);
    expect(repo.findProfileId).not.toHaveBeenCalled();
  });
  it("allows preflight without authentication", async () => {
    const verify = vi.fn();
    const response = await handleRecipe(
      request("", "OPTIONS", origin, ""),
      repository(),
      verify,
      [origin],
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(verify).not.toHaveBeenCalled();
  });
  it("rejects unconfigured origins", async () => {
    expect(
      (
        await handleRecipe(
          request("{}", "POST", "https://other.example"),
          repository(),
          vi.fn(),
          [origin],
        )
      ).status,
    ).toBe(403);
  });
  it("rejects unsupported methods", async () => {
    expect(
      (await handleRecipe(request("", "GET"), repository(), vi.fn(), [origin]))
        .status,
    ).toBe(405);
  });
  it.each(["{", "null", "{}"])("rejects malformed input %s", async (body) => {
    expect(
      (
        await handleRecipe(request(body), repository(), async () => "user", [
          origin,
        ])
      ).status,
    ).toBe(400);
  });
  it("accepts HTTP URLs without changing their scheme", async () => {
    const repo = repository();
    const response = await handleRecipe(
      request(JSON.stringify({ ...recipeInput, url: "http://example.com" })),
      repo,
      async () => "user",
      [origin],
    );
    expect(response.status).toBe(201);
    expect(repo.insert.mock.calls[0][0].url).toBe("http://example.com");
  });
  it("returns 403 when the account has no profile", async () => {
    const repo = repository();
    repo.findProfileId.mockResolvedValue(null);
    expect(
      (await handleRecipe(request(), repo, async () => "user", [origin]))
        .status,
    ).toBe(403);
  });
  it("hides database error details", async () => {
    const repo = repository();
    repo.insert.mockRejectedValue(new Error("secret"));
    const response = await handleRecipe(request(), repo, async () => "user", [
      origin,
    ]);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "unavailable" });
  });

  it("logs recipe-list failures while hiding database details", async () => {
    const failure = new Error("profile lookup failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = {
      create: vi.fn(),
      list: vi.fn().mockRejectedValue(failure),
    };

    const response = await handleRecipeList(
      new Request("https://api.example/recipes", {
        method: "GET",
        headers: { Origin: origin, Authorization: "Bearer valid" },
      }),
      "user",
      repo,
      [origin],
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "unavailable" });
    expect(errorSpy).toHaveBeenCalledWith("Unable to list recipes", {
      name: "Error",
    });
    errorSpy.mockRestore();
  });
});

describe("recipe conversion HTTP contract", () => {
  it("uses atomic conversion when the request identifies a temporary recipe", async () => {
    const repo = {
      ...repository(),
      convert: vi.fn().mockResolvedValue({ recipeId: 9 }),
    };
    const response = await handleRecipe(
      request(JSON.stringify({ ...recipeInput, tempRecipeId: 3 })),
      repo,
      async () => "user",
      [origin],
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ recipeId: 9 });
    expect(repo.convert).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ userId: 42 }),
    );
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it("returns a CORS-readable 404 for a missing temporary recipe", async () => {
    const { RecipeError } =
      await import("../../supabase/functions/_shared/domain/RecipeRepository");
    const repo = {
      ...repository(),
      convert: vi
        .fn()
        .mockRejectedValue(new RecipeError("temp_recipe_not_found")),
    };
    const response = await handleRecipe(
      request(JSON.stringify({ ...recipeInput, tempRecipeId: 3 })),
      repo,
      async () => "user",
      [origin],
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });
});

describe("safe recipe diagnostics", () => {
  it("logs storage categories without logging sensitive error messages", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const repo = repository();
      repo.insert.mockRejectedValue(
        Object.assign(new Error("sensitive recipe text or bearer token"), {
          code: "23514",
        }),
      );
      const response = await handleRecipe(request(), repo, async () => "user", [
        origin,
      ]);
      expect(response.status).toBe(503);
      expect(log).toHaveBeenCalledWith("Unable to save recipe", {
        name: "Error",
        code: "23514",
      });
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "sensitive recipe text or bearer token",
      );
    } finally {
      log.mockRestore();
    }
  });
});
