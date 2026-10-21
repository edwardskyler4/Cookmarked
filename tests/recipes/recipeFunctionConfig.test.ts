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
