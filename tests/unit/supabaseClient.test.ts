import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

describe("Supabase client configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubEnv("VITE_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates the client with the configured URL and publishable key", async () => {
    const client = { name: "test client" };
    createClient.mockReturnValue(client);

    const { supabase } = await import("../../src/data/supabaseClient");

    expect(createClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      "test-publishable-key",
    );
    expect(supabase).toBe(client);
  });

  it.each([
    ["VITE_SUPABASE_URL", undefined],
    ["VITE_SUPABASE_URL", ""],
    ["VITE_SUPABASE_PUBLISHABLE_KEY", undefined],
    ["VITE_SUPABASE_PUBLISHABLE_KEY", ""],
  ])("rejects %s when its value is %s", async (variable, value) => {
    vi.stubEnv(variable, value);

    await expect(import("../../src/data/supabaseClient")).rejects.toThrow(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variable.",
    );
    expect(createClient).not.toHaveBeenCalled();
  });
});
