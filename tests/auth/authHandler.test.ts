import { describe, expect, it, vi } from "vitest";
import { handleAuth } from "../../supabase/functions/_shared/ui/authHandler";
import { AuthError } from "../../supabase/functions/_shared/domain/AuthGateway";
const origin = "https://cookmarked.edw20009.workers.dev";
const gateway = () => ({
  register: vi
    .fn()
    .mockResolvedValue({ access_token: "access", refresh_token: "refresh" }),
  login: vi.fn(),
});
const request = (body: string, method = "POST", site = origin) =>
  new Request("https://api.example/auth", {
    method,
    headers: { Origin: site, "Content-Type": "application/json" },
    ...(method === "POST" ? { body } : {}),
  });
describe("Auth HTTP handler", () => {
  it("returns tokens without caching them", async () => {
    const response = await handleAuth(
      request(
        JSON.stringify({
          action: "register",
          username: "kyler",
          password: "password123",
        }),
      ),
      gateway(),
      [origin],
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      access_token: "access",
      refresh_token: "refresh",
    });
  });
  it("allows preflight from configured origins", async () => {
    const response = await handleAuth(request("", "OPTIONS"), gateway(), [
      origin,
    ]);
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });
  it("rejects an unconfigured origin", async () => {
    expect(
      (
        await handleAuth(
          request("{}", "POST", "https://other.example"),
          gateway(),
          [origin],
        )
      ).status,
    ).toBe(403);
  });
  it.each(["{", "null", '{"action":"delete"}'])(
    "rejects malformed input %s",
    async (body) => {
      expect(
        (await handleAuth(request(body), gateway(), [origin])).status,
      ).toBe(400);
    },
  );
  it("rejects unsupported methods", async () => {
    expect(
      (await handleAuth(request("", "GET"), gateway(), [origin])).status,
    ).toBe(405);
  });
  it("maps invalid credentials to 401", async () => {
    const repo = gateway();
    repo.login.mockRejectedValue(new AuthError("invalid_credentials"));
    const response = await handleAuth(
      request(
        JSON.stringify({
          action: "login",
          username: "kyler",
          password: "password123",
        }),
      ),
      repo,
      [origin],
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "invalid_credentials" });
  });
  it("does not expose unexpected error details", async () => {
    const repo = gateway();
    repo.register.mockRejectedValue(new Error("secret"));
    const response = await handleAuth(
      request(
        JSON.stringify({
          action: "register",
          username: "kyler",
          password: "password123",
        }),
      ),
      repo,
      [origin],
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "unavailable" });
  });
});
