import { describe, expect, it, vi } from "vitest";
import { SupabaseTempRecipeRepository } from "../../src/data/repositories/SupabaseTempRecipeRepository";

describe("SupabaseTempRecipeRepository", () => {
  it("loads temporary recipes from the authenticated temp recipe function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: [
        {
          recipeId: 3,
          title: "Tomato soup",
          text: "Imported recipe text",
          url: "https://example.com/soup",
          sharedFromPlatform: "Instagram",
          mediaType: "video",
          thumbnailUrl: "https://example.com/soup.jpg",
        },
      ],
      error: null,
    });
    const repository = new SupabaseTempRecipeRepository({
      functions: { invoke },
    } as never);

    await expect(repository.list()).resolves.toEqual([
      {
        recipeId: 3,
        title: "Tomato soup",
        text: "Imported recipe text",
        url: "https://example.com/soup",
        sharedFromPlatform: "Instagram",
        mediaType: "video",
        thumbnailUrl: "https://example.com/soup.jpg",
      },
    ]);
    expect(invoke).toHaveBeenCalledWith("temp_recipes", { method: "GET" });
  });

  it("removes a temporary recipe through the authenticated function", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: null });
    const repository = new SupabaseTempRecipeRepository({
      functions: { invoke },
    } as never);

    await repository.remove(3);

    expect(invoke).toHaveBeenCalledWith("temp_recipes", {
      method: "DELETE",
      body: { recipeId: 3 },
    });
  });

  it("captures a URL through the capture function and maps the inbox item", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        duplicate: false,
        capture: {
          captureId: 8,
          title: "Imported pasta",
          description: "A quick dinner",
          platform: "Instagram",
          canonicalUrl: "https://www.instagram.com/p/ABC123/",
          thumbnailUrl: "https://cdn.example.com/pasta.jpg",
        },
      },
      error: null,
    });
    const repository = new SupabaseTempRecipeRepository({
      functions: { invoke },
    } as never);

    await expect(repository.capture("https://www.instagram.com/p/ABC123/")).resolves.toEqual({
      recipeId: 8,
      title: "Imported pasta",
      text: "A quick dinner",
      sharedFromPlatform: "Instagram",
      url: "https://www.instagram.com/p/ABC123/",
      thumbnailUrl: "https://cdn.example.com/pasta.jpg",
      mediaType: undefined,
    });
    expect(invoke).toHaveBeenCalledWith("capture", {
      body: { url: "https://www.instagram.com/p/ABC123/" },
    });
  });

  it("includes the Edge Function error code when capture fails", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: Object.assign(new Error("Edge Function returned a non-2xx status code"), {
        context: new Response(JSON.stringify({ code: "profile_not_found" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      }),
    });
    const repository = new SupabaseTempRecipeRepository({
      functions: { invoke },
    } as never);

    await expect(repository.capture("https://www.instagram.com/p/ABC123/")).rejects.toThrow(
      "Unable to capture recipe: Edge Function returned a non-2xx status code (profile_not_found)",
    );
  });
});
