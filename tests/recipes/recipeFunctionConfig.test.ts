import { endpointPolicies } from "../../supabase/functions/_shared/ui/endpoints";
import { readFile, readdir } from "node:fs/promises";
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

describe("platform and application authentication configuration", () => {
  it.each(Object.keys(endpointPolicies))(
    "declares the correct platform authentication policy for %s",
    async (name) => {
      const config = await readFile("supabase/config.toml", "utf8");
      const section =
        config.split(`[functions.${name}]`)[1]?.split("[")[0] ?? "";
      expect(section).toMatch(
        name === "auth"
          ? /^verify_jwt\s*=\s*false/m
          : /^verify_jwt\s*=\s*true/m,
      );
    },
  );
});

describe("Edge Runtime dependency compatibility", () => {
  it("keeps a v4 dependency lock readable by older Edge Runtime deployments", async () => {
    const lock = JSON.parse(
      await readFile("supabase/functions/deno.lock", "utf8"),
    );
    expect(lock.version).toBe("4");
  });
});

it("requires a policy for every deployed function", async () => {
  const { endpointPolicies } =
    await import("../../supabase/functions/_shared/ui/endpoints");
  const names = (await readdir("supabase/functions", { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
  expect(Object.keys(endpointPolicies).sort()).toEqual(names);
  for (const [name, policy] of Object.entries(endpointPolicies))
    expect(policy.access).toBe(name === "auth" ? "credentials" : "user");
});
