import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createRecipeRequestHandler } from "../../supabase/functions/recipes";

describe("recipes Edge Function entry point", () => {
  it("answers the browser preflight before requiring a JWT", async () => {
    const handler = createRecipeRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
    });

    const response = await handler(
      new Request("https://example.test/recipes", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization,apikey",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "GET",
    );
  });
  it("allows DELETE requests in the browser preflight", async () => {
    const handler = createRecipeRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
    });

    const response = await handler(
      new Request("https://example.test/recipes", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "DELETE",
          "Access-Control-Request-Headers": "authorization,apikey",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "DELETE",
    );
  });

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
  it("validates the JWT and deletes the user's recipe", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "auth-user-id",
            email: "test@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ user_id: 42 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ recipe_id: 19 }]), {
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
      new Request("https://example.test/recipes?recipeId=19", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer access-token",
          Origin: "http://localhost:5173",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(fetch).toHaveBeenCalledTimes(3);

    const [deleteUrl, deleteOptions] = fetch.mock.calls[2];
    const url = new URL(String(deleteUrl));

    expect(deleteOptions?.method).toBe("DELETE");
    expect(url.pathname).toBe("/rest/v1/recipe");
    expect(url.searchParams.get("recipe_id")).toBe("eq.19");
    expect(url.searchParams.get("user_id")).toBe("eq.42");
  });
  it("rejects the retired POST route before accessing Auth or storage", async () => {
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

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ code: "method_not_allowed" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("browser SDK CORS compatibility", () => {
  it("allows every request header emitted by the installed browser SDK", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ recipeId: 7 }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const browserClient = createClient(
      "https://example.supabase.co",
      "public-key",
      {
        global: { fetch },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    await browserClient.functions.invoke("recipes_save", {
      body: { title: "Soup" },
    });
    const sentHeaders = [
      ...new Headers(fetch.mock.calls[0][1]?.headers).keys(),
    ];
    expect(sentHeaders).toContain("authorization");
    const handler = createRecipeRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["https://app.example"],
    });
    const response = await handler(
      new Request("https://example.test/recipes", {
        method: "OPTIONS",
        headers: {
          Origin: "https://app.example",
          "Access-Control-Request-Headers": sentHeaders.join(","),
          "Access-Control-Request-Method": "POST",
        },
      }),
    );
    expect(response.status).toBe(204);
    const allowedHeaders = response.headers
      .get("Access-Control-Allow-Headers")!
      .toLowerCase()
      .split(",")
      .map((value) => value.trim());
    for (const header of sentHeaders) expect(allowedHeaders).toContain(header);
  });
});
