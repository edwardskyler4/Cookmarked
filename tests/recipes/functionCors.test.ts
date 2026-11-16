import { afterEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
const origin = "https://cookmarked.edw20009.workers.dev";
const functions = [
  "auth",
  "recipes",
  "recipes_save",
  "temp_recipes",
  "recipe_metadata",
];

async function load(name: string) {
  let handler!: (request: Request) => Promise<Response>;
  vi.stubGlobal("Deno", {
    env: {
      get: (key: string) =>
        ({
          AUTH_ALLOWED_ORIGINS: origin,
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_ANON_KEY: "public-key",
        })[key],
    },
    serve: (callback: typeof handler) => {
      handler = callback;
    },
  });
  await import(`../../supabase/functions/${name}/index.ts`);
  return handler;
}

function request(
  name: string,
  method = "POST",
  token = "Bearer session",
  site = origin,
) {
  return new Request(`https://example.test/${name}`, {
    method,
    headers: {
      Origin: site,
      Authorization: token,
      "Content-Type": "application/json",
      "Access-Control-Request-Method":
        name === "temp_recipes" ? "DELETE" : "POST",
      "Access-Control-Request-Headers":
        "authorization, apikey, content-type, x-client-info",
    },
    ...(method === "POST" ? { body: JSON.stringify({ title: "Soup" }) } : {}),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
  createClient.mockReset();
});

describe.each(functions)("%s HTTP boundary", (name) => {
  it("answers preflight without constructing a database client", async () => {
    createClient.mockImplementation(() => {
      throw new Error("bad configuration");
    });
    const response = await (await load(name))(request(name, "OPTIONS", ""));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "content-type",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      name === "temp_recipes" ? "DELETE" : "POST",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns a CORS response when client construction fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createClient.mockImplementation(() => {
      throw new Error("bad configuration");
    });
    const response = await (await load(name))(request(name));
    expect(response.status).toBe(503);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(await response.json()).toEqual({ code: "unavailable" });
  });

  it("rejects an unconfigured origin before constructing a client", async () => {
    const response = await (
      await load(name)
    )(request(name, "OPTIONS", "", "https://untrusted.example"));
    expect(response.status).toBe(403);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe.each(functions.filter((name) => name !== "auth"))(
  "%s authentication errors",
  (name) => {
    it.each(["", "Basic invalid", "Bearer"])(
      "keeps CORS headers for malformed authorization %s",
      async (token) => {
        createClient.mockReturnValue({ auth: {} });
        const response = await (
          await load(name)
        )(request(name, name === "temp_recipes" ? "GET" : "POST", token));
        expect(response.status).toBe(401);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
          origin,
        );
      },
    );

    it("returns a CORS response for an Auth outage", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockRejectedValue(new Error("Auth unavailable")),
        },
      });
      const response = await (
        await load(name)
      )(request(name, name === "temp_recipes" ? "GET" : "POST"));
      expect(response.status).toBe(503);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(await response.json()).toEqual({ code: "unavailable" });
    });

    it("distinguishes expired credentials from an Auth service error", async () => {
      createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { status: 401 },
          }),
        },
      });
      const response = await (
        await load(name)
      )(request(name, name === "temp_recipes" ? "GET" : "POST"));
      expect(response.status).toBe(401);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    });

    it("returns 503 for an Auth service error response", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { status: 503 },
          }),
        },
      });
      const response = await (
        await load(name)
      )(request(name, name === "temp_recipes" ? "GET" : "POST"));
      expect(response.status).toBe(503);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    });
  },
);

describe.each(["recipes", "recipes_save", "temp_recipes"])(
  "%s storage failures",
  (name) => {
    it("keeps CORS headers when storage is unavailable", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "verified-user" } },
            error: null,
          }),
        },
        from: () => {
          throw Object.assign(new Error("private database details"), {
            code: "PGRST204",
          });
        },
      });
      const handler = await load(name);
      const response = await handler(
        new Request(`https://example.test/${name}`, {
          method: name === "recipes_save" ? "POST" : "GET",
          headers: {
            Origin: origin,
            Authorization: "Bearer session",
            "Content-Type": "application/json",
          },
          ...(name === "recipes_save"
            ? {
                body: JSON.stringify({
                  title: "Soup",
                  prepTime: "10 min",
                  servings: 4,
                  ingredients: "Water",
                  instructions: "Boil",
                }),
              }
            : {}),
        }),
      );
      expect(response.status).toBe(503);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(await response.json()).toEqual({ code: "unavailable" });
    });
  },
);
