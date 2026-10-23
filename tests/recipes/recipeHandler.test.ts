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
import { describe, expect, it, vi } from "vitest";
import { handleRecipe } from "../../supabase/functions/_shared/ui/recipeHandler";
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
  it("returns a validation field for invalid HTTPS URLs", async () => {
    const response = await handleRecipe(
      request(JSON.stringify({ ...recipeInput, url: "http://example.com" })),
      repository(),
      async () => "user",
      [origin],
    );
    expect(await response.json()).toEqual({
      code: "invalid_input",
      field: "url",
    });
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
});
