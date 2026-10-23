import { afterEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("recipe edge function wiring", () => {
  it("verifies Auth and forwards the request JWT to an isolated database client", async () => {
    let serve!: (request: Request) => Promise<Response>;
    vi.stubGlobal("Deno", {
      env: {
        get: (name: string) =>
          ({
            SUPABASE_URL: "https://test.supabase.co",
            SUPABASE_ANON_KEY: "public-key",
            AUTH_ALLOWED_ORIGINS: "https://app.example",
          })[name],
      },
      serve: (handler: typeof serve) => {
        serve = handler;
      },
    });
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "verified-user" } },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({
      maybeSingle: async () => ({ data: null, error: null }),
    });
    createClient.mockReturnValue({
      auth: { getUser },
      from: () => ({ select: () => ({ eq }) }),
    });
    await import("../../supabase/functions/recipes_save/index");
    const response = await serve(
      new Request("https://api.example/recipes_save", {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          Origin: "https://app.example",
        },
        body: JSON.stringify({
          title: "Soup",
          prepTime: "10 min",
          servings: 4,
          ingredients: "Water",
          instructions: "Boil",
        }),
      }),
    );
    expect(getUser).toHaveBeenCalledWith("access-token");
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "public-key",
      {
        global: { headers: { Authorization: "Bearer access-token" } },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    expect(eq).toHaveBeenCalledWith("auth_user_id", "verified-user");
    expect(response.status).toBe(403);
  });
});
