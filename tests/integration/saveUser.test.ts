import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseUserRepository } from "../../src/data/repositories/SupabaseUserRepository";
import { saveUser } from "../../src/services/saveUser";

const { fetchResponse } = vi.hoisted(() => ({
  fetchResponse: vi.fn<typeof fetch>(),
}));

// Exercise the real Supabase SDK using local HTTP responses, never a live DB.
vi.mock("../../src/data/supabaseClient", async () => {
  const { createClient } = await import("@supabase/supabase-js");

  return {
    supabase: createClient(
      "https://test-project.supabase.co",
      "test-publishable-key",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: { fetch: fetchResponse },
      },
    ),
  };
});

describe("saveUser with the Supabase SDK", () => {
  beforeEach(() => {
    fetchResponse.mockReset();
  });

  function savedUserResponse() {
    fetchResponse.mockResolvedValue(
      new Response(JSON.stringify({ user_id: 42, username: "Evan" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  it("maps an HTTP response into a domain user", async () => {
    savedUserResponse();
    const repository = new SupabaseUserRepository();

    const user = await saveUser(repository, "Evan");

    expect(user).toEqual({ id: 42, username: "Evan" });
  });

  it("sends the entered username in an insert request", async () => {
    savedUserResponse();
    const repository = new SupabaseUserRepository();

    await saveUser(repository, "Evan");

    expect(fetchResponse).toHaveBeenCalledTimes(1);
    const [input, init] = fetchResponse.mock.calls[0];
    const request = new Request(input, init);
    expect(request.method).toBe("POST");
    expect(new URL(request.url).pathname).toBe("/rest/v1/Users");
    expect(await request.json()).toEqual({ username: "Evan" });
  });

  it("requests the saved user ID and username", async () => {
    savedUserResponse();
    const repository = new SupabaseUserRepository();

    await saveUser(repository, "Evan");

    const [input, init] = fetchResponse.mock.calls[0];
    const request = new Request(input, init);
    expect(new URL(request.url).searchParams.get("select")).toBe(
      "user_id,username",
    );
    expect(request.headers.get("Prefer")).toContain("return=representation");
  });

  it("propagates an HTTP permission failure through the service", async () => {
    fetchResponse.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "42501",
          details: null,
          hint: null,
          message: "Permission denied",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );
    const repository = new SupabaseUserRepository();

    await expect(saveUser(repository, "Evan")).rejects.toThrow(
      "Unable to save user: Permission denied",
    );
  });

  it("reports a response that does not contain a single saved row", async () => {
    fetchResponse.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "PGRST116",
          details: "The result contains 0 rows",
          hint: null,
          message: "Cannot coerce the result to a single JSON object",
        }),
        { status: 406, headers: { "Content-Type": "application/json" } },
      ),
    );
    const repository = new SupabaseUserRepository();

    await expect(saveUser(repository, "Evan")).rejects.toThrow(
      "Unable to save user: Cannot coerce the result to a single JSON object",
    );
  });
});
