import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createRecipeRequestHandler } from "../../supabase/functions/recipes";

describe("recipes Edge Function entry point", () => {
  it("validates the JWT and lists the user's recipes", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "auth-user-id",
            email: "evan@accounts.cookmarked.edw20009.workers.dev",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ user_id: 42 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const handler = createRecipeRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
      createClient: (url, key, options) =>
        createClient(url, key, {
          ...options,
          global: { ...options?.global, fetch },
        }),
    });

    const response = await handler(
      new Request("https://example.test/recipes", {
        method: "GET",
        headers: {
          Authorization: "Bearer access-token",
          Origin: "http://localhost:5173",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("validates the JWT and creates a recipe through the gateway", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "auth-user-id",
            email: "evan@accounts.cookmarked.edw20009.workers.dev",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ user_id: 42 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
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
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const handler = createRecipeRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
      createClient: (url, key, options) =>
        createClient(url, key, {
          ...options,
          global: { ...options?.global, fetch },
        }),
    });

    const response = await handler(
      new Request("https://example.test/recipes", {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          Origin: "http://localhost:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Tomato Pasta",
          description: "A quick pasta dinner.",
          ingredients: "Pasta\nTomatoes",
          instructions: "Boil pasta and add tomatoes.",
          prepTime: "10 min",
          cookTime: "20 min",
          servings: 2,
          mealType: "Dinner",
          course: "Entree",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).recipeId).toBe(7);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });
});
