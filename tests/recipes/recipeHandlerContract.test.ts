import { describe, expect, it, vi } from "vitest";
import { handleRecipe } from "../../supabase/functions/_shared/ui/recipeHandler";

const origin = "https://cookmarked.example";

describe("recipe handler call contract", () => {
  it.each([
    {
      mode: "already verified user",
      call: (request: Request) =>
        handleRecipe(request, "verified-user", { create: vi.fn() }, [origin]),
    },
    {
      mode: "token verification callback",
      call: (request: Request) =>
        handleRecipe(
          request,
          { findProfileId: vi.fn(), insert: vi.fn() },
          vi.fn(),
          [origin],
        ),
    },
  ])(
    "uses the fourth argument for allowed origins with $mode",
    async ({ call }) => {
      const request = new Request("https://api.example/recipes", {
        method: "OPTIONS",
        headers: { Origin: origin },
      });

      const response = await call(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    },
  );
});
