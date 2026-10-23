import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseRecipeRepository } from "../../supabase/functions/_shared/data/SupabaseRecipeRepository";
import { SupabaseRecipeApiRepository } from "../../src/data/repositories/SupabaseRecipeApiRepository";
import { createRecipeService } from "../../src/services/recipeService";
import { recipeInput } from "../fakes/recipe";
function setup() {
  const requests: Request[] = [];
  const respond = vi.fn().mockResolvedValue({ recipe_id: 7 });
  const client = createClient("https://test.supabase.co", "test-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, init) => {
        const req = new Request(url, init);
        requests.push(req);
        const body = await respond(req);
        if (body instanceof Response) return body;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  return { client, requests, respond };
}
describe("recipe repositories with the real SDK and local HTTP responses", () => {
  it("looks up a profile by the verified auth UUID", async () => {
    const { client, requests, respond } = setup();
    respond.mockResolvedValue({ user_id: 42 });
    expect(
      await new SupabaseRecipeRepository(client).findProfileId("verified-id"),
    ).toBe(42);
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/rest/v1/profile");
    expect(url.searchParams.get("auth_user_id")).toBe("eq.verified-id");
  });
  it("returns null for a missing profile", async () => {
    const { client, respond } = setup();
    respond.mockResolvedValue(null);
    expect(
      await new SupabaseRecipeRepository(client).findProfileId("missing"),
    ).toBeNull();
  });
  it("maps all form fields to recipe columns without client IDs or timestamps", async () => {
    const { client, requests } = setup();
    expect(
      await new SupabaseRecipeRepository(client).insert({
        ...recipeInput,
        userId: 42,
      }),
    ).toEqual({ recipeId: 7 });
    expect(await requests[0].json()).toEqual({
      user_id: 42,
      title: "Soup",
      prep_time: "30 min",
      servings: 4,
      ingredients: "Water",
      instructions: "Boil",
      meal_type: "",
      course: "",
      url: null,
      note: "Family favorite",
      nutrition_info: "100 kcal",
    });
    expect(new URL(requests[0].url).pathname).toBe("/rest/v1/recipe");
    expect(requests[0].headers.get("Prefer")).toContain(
      "return=representation",
    );
  });
  it("passes storage errors to the caller", async () => {
    const { client, respond } = setup();
    respond.mockRejectedValue(new Error("offline"));
    await expect(
      new SupabaseRecipeRepository(client).insert({
        ...recipeInput,
        userId: 42,
      }),
    ).rejects.toThrow();
  });
  it("invokes the recipe edge function through the browser service", async () => {
    const { client, respond, requests } = setup();
    respond.mockResolvedValue({ recipeId: 7 });
    expect(
      await createRecipeService(new SupabaseRecipeApiRepository(client)).create(
        recipeInput,
      ),
    ).toEqual({ recipeId: 7 });
    expect(new URL(requests[0].url).pathname).toBe(
      "/functions/v1/recipes_save",
    );
    expect(await requests[0].json()).toEqual(recipeInput);
  });
  it("preserves structured function validation errors", async () => {
    const { client, respond } = setup();
    respond.mockResolvedValue(
      new Response(JSON.stringify({ code: "invalid_input", field: "url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(
      new SupabaseRecipeApiRepository(client).create(recipeInput),
    ).rejects.toMatchObject({ code: "invalid_input", field: "url" });
  });
  it("rejects a malformed success response", async () => {
    const { client, respond } = setup();
    respond.mockResolvedValue({});
    await expect(
      new SupabaseRecipeApiRepository(client).create(recipeInput),
    ).rejects.toMatchObject({ code: "unavailable" });
  });
});
