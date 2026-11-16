import { describe, expect, it, vi } from "vitest";
import {
  captureLink,
  type CaptureMetadataProvider,
  type CaptureRepository,
} from "../../supabase/functions/_shared/services/captureLink";

const metadata = {
  title: "One-pot pasta",
  description: "A quick dinner",
  thumbnailUrl: "https://cdn.example.test/pasta.jpg",
};

function repository() {
  return {
    findByCanonicalUrl: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation(async (capture) => ({
      captureId: 7,
      ...capture,
    })),
  } satisfies CaptureRepository;
}

describe("captureLink", () => {
  it("detects, enriches, and saves a user-owned capture", async () => {
    const repo = repository();
    const provider: CaptureMetadataProvider = {
      fetch: vi.fn().mockResolvedValue(metadata),
    };

    const result = await captureLink(
      repo,
      provider,
      "authenticated-user",
      "https://www.instagram.com/p/ABC123/#comments",
    );

    expect(result).toEqual({
      duplicate: false,
      capture: {
        captureId: 7,
        authUserId: "authenticated-user",
        canonicalUrl: "https://www.instagram.com/p/ABC123/",
        platform: "Instagram",
        title: "One-pot pasta",
        description: "A quick dinner",
        thumbnailUrl: "https://cdn.example.test/pasta.jpg",
      },
    });
    expect(provider.fetch).toHaveBeenCalledWith(
      "https://www.instagram.com/p/ABC123/",
    );
    expect(repo.save).toHaveBeenCalledWith({
      authUserId: "authenticated-user",
      canonicalUrl: "https://www.instagram.com/p/ABC123/",
      platform: "Instagram",
      title: "One-pot pasta",
      description: "A quick dinner",
      thumbnailUrl: "https://cdn.example.test/pasta.jpg",
    });
  });

  it("returns an existing user-owned capture without fetching metadata", async () => {
    const existing = {
      captureId: 12,
      authUserId: "authenticated-user",
      canonicalUrl: "https://www.pinterest.com/pin/123/",
      platform: "Pinterest" as const,
      title: "Saved pin",
    };
    const repo = repository();
    repo.findByCanonicalUrl.mockResolvedValue(existing);
    const provider: CaptureMetadataProvider = {
      fetch: vi.fn(),
    };

    await expect(
      captureLink(repo, provider, "authenticated-user", existing.canonicalUrl),
    ).resolves.toEqual({ duplicate: true, capture: existing });
    expect(provider.fetch).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("saves a deterministic manual-review fallback when metadata is missing", async () => {
    const repo = repository();
    const provider: CaptureMetadataProvider = {
      fetch: vi.fn().mockResolvedValue(null),
    };

    await captureLink(
      repo,
      provider,
      "authenticated-user",
      "https://www.facebook.com/share/recipe123",
    );

    expect(repo.save).toHaveBeenCalledWith({
      authUserId: "authenticated-user",
      canonicalUrl: "https://www.facebook.com/share/recipe123",
      platform: "Facebook",
      title: "Imported recipe",
    });
  });
});
