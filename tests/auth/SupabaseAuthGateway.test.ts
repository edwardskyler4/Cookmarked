import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseAuthGateway } from "../../supabase/functions/_shared/data/SupabaseAuthGateway";

function setup(body: unknown, status = 200) {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Supabase-Api-Version": "2024-01-01",
      },
    }),
  );
  const client = createClient("https://example.supabase.co", "public-key", {
    global: { fetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return { gateway: new SupabaseAuthGateway(client), fetch };
}
const response = {
  access_token: "access",
  refresh_token: "refresh",
  token_type: "bearer",
  expires_in: 3600,
  user: { id: "id", email: "kyler@example.com" },
};
describe("SupabaseAuthGateway", () => {
  it("registers with Auth and returns tokens for immediate sign-in", async () => {
    const { gateway, fetch } = setup(response);
    expect(
      await gateway.register("kyler@example.com", "password123", "kyler"),
    ).toEqual({ access_token: "access", refresh_token: "refresh" });
    const [url, init] = fetch.mock.calls[0];
    expect(new URL(url).pathname).toBe("/auth/v1/signup");
    expect(JSON.parse(init.body)).toMatchObject({
      email: "kyler@example.com",
      password: "password123",
      data: { username: "kyler" },
    });
  });
  it("logs in using the password grant", async () => {
    const { gateway, fetch } = setup(response);
    await gateway.login("kyler@example.com", "password123", "kyler");
    expect(String(fetch.mock.calls[0][0])).toContain("grant_type=password");
  });
  it.each([
    ["invalid_credentials", 400, "invalid_credentials"],
    ["user_already_exists", 422, "username_taken"],
    ["over_request_rate_limit", 429, "rate_limited"],
    ["unexpected_failure", 500, "unavailable"],
  ])("maps provider error %s", async (code, status, expected) => {
    const { gateway } = setup(
      { code, message: "Sensitive provider details" },
      status,
    );
    await expect(
      gateway.register("kyler@example.com", "password123", "kyler"),
    ).rejects.toMatchObject({ code: expected });
  });
  it("rejects registration without a session when confirmations are enabled", async () => {
    const { gateway } = setup({ id: "id", email: "kyler@example.com" });
    await expect(
      gateway.register("kyler@example.com", "password123", "kyler"),
    ).rejects.toMatchObject({ code: "unavailable" });
  });
});
