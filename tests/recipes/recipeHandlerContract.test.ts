import { describe, expect, it, vi } from "vitest";
import { userEndpoint } from "../../supabase/functions/_shared/ui/endpoint";
const origin = "https://cookmarked.example";
describe("protected endpoint contract", () => {
  it.each([
    "recipes",
    "recipes_save",
    "temp_recipes",
    "recipe_metadata",
  ] as const)(
    "handles preflight for %s before verification or service calls",
    async (name) => {
      const verify = vi.fn();
      const action = vi.fn();
      const response = await userEndpoint(
        name,
        new Request("https://example.test", {
          method: "OPTIONS",
          headers: { Origin: origin },
        }),
        [origin],
        verify,
        action,
      );
      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(verify).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
    },
  );
});
