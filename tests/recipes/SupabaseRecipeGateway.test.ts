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
  it("lists recipes for the authenticated profile", async () => {
    const { gateway, fetch } = setup([
      { body: [{ user_id: 42 }] },
      {
        body: [
          {
            recipe_id: 7,
            user_id: 42,
            title: "Tomato Pasta",
            description: "Family favorite",
            ingredients: null,
            instructions: null,
            prep_time: "10 min",
            cook_time: "20 min",
            servings: 2,
            meal_type: "Dinner",
            course: "Entree",
            shared_from_platform: null,
            url: null,
            media_type: null,
            thumbnail_url: null,
            nutrition_info: "100 kcal",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    ]);

    await expect(gateway.list("auth-user-id")).resolves.toMatchObject([
      {
        recipeId: 7,
        userId: 42,
        title: "Tomato Pasta",
        prepTime: "10 min",
        description: "Family favorite",
        nutritionInfo: "100 kcal",
      },
    ]);

    const recipeRequest = new Request(
      fetch.mock.calls[1][0],
      fetch.mock.calls[1][1],
    );
    expect(new URL(recipeRequest.url).pathname).toBe("/rest/v1/recipe");
    expect(new URL(recipeRequest.url).searchParams.get("user_id")).toBe(
      "eq.42",
    );
    expect(new URL(recipeRequest.url).searchParams.get("select")).toContain(
      "description",
    );
    expect(new URL(recipeRequest.url).searchParams.get("select")).not.toContain(
      "note",
    );
  });

  it("does not query recipes when the authenticated profile is missing", async () => {
    const { gateway, fetch } = setup([{ body: [] }]);
    await expect(gateway.list("auth-user-id")).rejects.toThrow(
      "Unable to resolve",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain(
      "auth_user_id=eq.auth-user-id",
    );
  });
});
