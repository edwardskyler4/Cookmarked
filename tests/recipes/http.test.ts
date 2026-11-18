import { describe, expect, it } from "vitest";
import { handleHttpRequest } from "../../supabase/functions/_shared/ui/http";

const origin = "https://app.example";
const request = () =>
  new Request("https://api.example/recipes_save", {
    method: "POST",
    headers: { Origin: origin },
  });

describe("HTTP response CORS boundary", () => {
  it.each([200, 401, 403, 404, 503])(
    "decorates a handler's %s response even if the handler omits CORS",
    async (status) => {
      const response = await handleHttpRequest(
        request(),
        [origin],
        "POST, OPTIONS",
        () =>
          new Response('{"ok":true}', {
            status,
            headers: {
              "Content-Type": "application/json",
              "X-Response": "preserved",
            },
          }),
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("X-Response")).toBe("preserved");
      expect(await response.json()).toEqual({ ok: true });
    },
  );

  it("preserves other Vary values while requiring Origin", async () => {
    const response = await handleHttpRequest(
      request(),
      [origin],
      "POST, OPTIONS",
      () => new Response(null, { headers: { Vary: "Accept-Encoding" } }),
    );
    expect(response.headers.get("Vary")).toContain("Accept-Encoding");
    expect(response.headers.get("Vary")).toContain("Origin");
  });

  it("keeps the configured origin when a handler returns a wildcard", async () => {
    const response = await handleHttpRequest(
      request(),
      [origin],
      "POST, OPTIONS",
      () =>
        new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } }),
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });
});

it("returns the common forbidden code for an unconfigured origin", async () => {
  const action = () => {
    throw new Error("must not run");
  };
  const response = await handleHttpRequest(
    new Request("https://api.example", {
      headers: { Origin: "https://untrusted.example" },
    }),
    [origin],
    "POST, OPTIONS",
    action,
  );
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ code: "forbidden" });
});
