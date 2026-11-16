import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("recipes Edge Function configuration", () => {
  it("maps the Supabase SDK to a Deno-compatible npm import", async () => {
    const file = await readFile("supabase/functions/recipes/deno.json", "utf8");
    const config = JSON.parse(file);

    expect(config.imports["@supabase/supabase-js"]).toBe(
      "npm:@supabase/supabase-js@2.57.4",
    );
  });
});

describe("handler-owned authentication configuration", () => {
  it.each([
    "auth",
    "recipes",
    "recipes_save",
    "temp_recipes",
    "recipe_metadata",
  ])("lets %s return CORS responses before authentication", async (name) => {
    const config = await readFile("supabase/config.toml", "utf8");
    const section = config.split(`[functions.${name}]`)[1]?.split("[")[0] ?? "";
    expect(section).toMatch(/^verify_jwt\s*=\s*false/m);
  });
});

describe("Edge Runtime dependency compatibility", () => {
  it("keeps a v4 dependency lock readable by older Edge Runtime deployments", async () => {
    const lock = JSON.parse(
      await readFile("supabase/functions/deno.lock", "utf8"),
    );
    expect(lock.version).toBe("4");
  });
});
