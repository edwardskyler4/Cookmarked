import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseRecipeGateway } from "../../supabase/functions/_shared/data/SupabaseRecipeGateway";

function setup(responses: Array<{ body: unknown; status?: number }>) {
  const fetch = vi.fn();
  for (const response of responses) {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify(response.body), {
        status: response.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  const client = createClient("https://example.supabase.co", "public-key", {
    global: { fetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return { gateway: new SupabaseRecipeGateway(client), fetch };
}

describe("SupabaseRecipeGateway", () => {
  it("resolves the authenticated profile and inserts its recipe", async () => {
    const { gateway, fetch } = setup([
      { body: [{ user_id: 42 }] },
      {
        body: {
          recipe_id: 7,
          user_id: 42,
          title: "Tomato Pasta",
          description: "A quick pasta dinner.",
          ingredients: "Pasta\nTomatoes",
          instructions: "Boil pasta and add tomatoes.",
          prep_time: "10 min",
          cook_time: "20 min",
          servings: 2,
          meal_type: "Dinner",
          course: "Entree",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      },
    ]);

    const result = await gateway.create("auth-user-id", {
      title: "Tomato Pasta",
      description: "A quick pasta dinner.",
      ingredients: "Pasta\nTomatoes",
      instructions: "Boil pasta and add tomatoes.",
      prepTime: "10 min",
      cookTime: "20 min",
      servings: 2,
      mealType: "Dinner",
      course: "Entree",
    });

    expect(result).toMatchObject({
      recipeId: 7,
      userId: 42,
      title: "Tomato Pasta",
      mealType: "Dinner",
      course: "Entree",
    });

    const profileRequest = new Request(
      fetch.mock.calls[0][0],
      fetch.mock.calls[0][1],
    );
    expect(new URL(profileRequest.url).pathname).toBe("/rest/v1/profile");
    expect(new URL(profileRequest.url).searchParams.get("auth_user_id")).toBe(
      "eq.auth-user-id",
    );

    const recipeRequest = new Request(
      fetch.mock.calls[1][0],
      fetch.mock.calls[1][1],
    );
    expect(new URL(recipeRequest.url).pathname).toBe("/rest/v1/recipe");
    expect(await recipeRequest.json()).toEqual({
      user_id: 42,
      title: "Tomato Pasta",
      description: "A quick pasta dinner.",
      ingredients: "Pasta\nTomatoes",
      instructions: "Boil pasta and add tomatoes.",
      prep_time: "10 min",
      cook_time: "20 min",
      servings: 2,
      meal_type: "Dinner",
      course: "Entree",
    });
  });
});
