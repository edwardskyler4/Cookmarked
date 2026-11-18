import { describe, expect, it, vi } from "vitest";
import { checkCors } from "../../scripts/check-cors.mjs";

const origin = "https://cookmarked.edw20009.workers.dev";
function setup(overrides: Record<string, string> = {}, status = 204) {
  return vi.fn(
    async () =>
      new Response(
        status === 204 ? null : JSON.stringify({ code: "BOOT_ERROR" }),
        {
          status,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers":
              "authorization,apikey,content-type,x-client-info",
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
            Vary: "Origin",
            ...overrides,
          },
        },
      ),
  );
}

describe("read-only deployed CORS check", () => {
  it("probes every endpoint using only unauthenticated OPTIONS", async () => {
    const fetch = setup();
    const checked = await checkCors(
      "https://example.supabase.co",
      origin,
      fetch,
    );
    expect(checked).toEqual([
      "auth",
      "recipe_metadata",
      "recipes",
      "recipes_save",
      "temp_recipes",
    ]);
    expect(fetch).toHaveBeenCalledTimes(6);
    for (const [url, options] of fetch.mock.calls) {
      expect(new URL(url).pathname).toMatch(/^\/functions\/v1\//);
      expect(options.method).toBe("OPTIONS");
      expect(new Headers(options.headers).has("Authorization")).toBe(false);
    }
  });

  it("reports startup failure as a failed preflight", async () => {
    await expect(
      checkCors(
        "https://example.supabase.co",
        origin,
        setup({ "sb-error-code": "BOOT_ERROR" }, 503),
      ),
    ).rejects.toThrow(/503.*BOOT_ERROR/);
  });

  it.each([
    ["Access-Control-Allow-Origin", "https://untrusted.example"],
    ["Access-Control-Allow-Headers", "authorization,apikey"],
    ["Access-Control-Allow-Methods", "OPTIONS"],
    ["Vary", "Accept-Encoding"],
  ])("rejects an incorrect %s response", async (header, value) => {
    await expect(
      checkCors(
        "https://example.supabase.co",
        origin,
        setup({ [header]: value }),
      ),
    ).rejects.toThrow(header);
  });
});
