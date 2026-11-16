import { describe, expect, it, vi } from "vitest";
import { createHttpMetadataProvider } from "../../supabase/functions/_shared/services/metadataProvider";

describe("createHttpMetadataProvider", () => {
  it("extracts Open Graph metadata from an HTML response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        '<meta property="og:title" content="One-pot pasta"><meta property="og:description" content="A quick dinner"><meta property="og:image" content="https://cdn.example.com/pasta.jpg">',
        { status: 200, headers: { "Content-Type": "text/html" } },
      ),
    );

    const provider = createHttpMetadataProvider(fetcher);

    await expect(
      provider.fetch("https://www.instagram.com/p/ABC123/"),
    ).resolves.toEqual({
      title: "One-pot pasta",
      description: "A quick dinner",
      thumbnailUrl: "https://cdn.example.com/pasta.jpg",
    });
  });

  it("follows a safe HTTPS redirect and returns a fallback for unavailable pages", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "https://www.instagram.com/p/ABC123/" },
        }),
      )
      .mockResolvedValueOnce(new Response("not html", { status: 503 }));

    const provider = createHttpMetadataProvider(fetcher);

    await expect(
      provider.fetch("https://instagr.am/p/ABC123/"),
    ).resolves.toBeNull();
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://www.instagram.com/p/ABC123/",
      expect.any(Object),
    );
  });

  it.each(["http://127.0.0.1/admin", "http://169.254.169.254/latest/meta-data"])(
    "does not follow redirects to private or local addresses: %s",
    async (location) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: location },
      }),
    );

    const provider = createHttpMetadataProvider(fetcher);

    await expect(
      provider.fetch("https://www.facebook.com/share/recipe123"),
    ).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
});
