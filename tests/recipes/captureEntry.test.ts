import { describe, expect, it, vi } from "vitest";
import { createCaptureRequestHandler } from "../../supabase/functions/capture/index";
import type {
  CaptureMetadataProvider,
  CaptureRepository,
} from "../../supabase/functions/_shared/domain/Capture";

describe("capture Edge Function entry point", () => {
  it("authenticates, enriches, and persists a capture in the inbox", async () => {
    const repository: CaptureRepository = {
      findByCanonicalUrl: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockImplementation(async (capture) => ({
        captureId: 4,
        ...capture,
      })),
    };
    const metadataProvider: CaptureMetadataProvider = {
      fetch: vi.fn().mockResolvedValue({ title: "Pasta" }),
    };
    const handler = createCaptureRequestHandler({
      origins: ["http://localhost:5173"],
      repository,
      metadataProvider,
      verifyToken: vi.fn().mockResolvedValue("auth-user-id"),
    });

    const response = await handler(
      new Request("https://example.test/capture", {
        method: "POST",
        headers: {
          Origin: "http://localhost:5173",
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: "https://www.instagram.com/p/ABC123/#comments",
          text: "Dinner idea",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      duplicate: false,
      capture: {
        captureId: 4,
        authUserId: "auth-user-id",
        canonicalUrl: "https://www.instagram.com/p/ABC123/",
        platform: "Instagram",
        title: "Pasta",
        description: "Metadata unavailable. Shared text: Dinner idea",
      },
    });
  });

  it("rejects requests without a valid bearer token", async () => {
    const handler = createCaptureRequestHandler({
      origins: [],
      repository: {} as CaptureRepository,
      metadataProvider: {} as CaptureMetadataProvider,
      verifyToken: vi.fn(),
    });

    const response = await handler(
      new Request("https://example.test/capture", { method: "POST" }),
    );

    expect(response.status).toBe(401);
  });

  it("preserves a database error object in the response code", async () => {
    const handler = createCaptureRequestHandler({
      origins: [],
      repository: {
        findByCanonicalUrl: vi.fn().mockRejectedValue({ message: "permission denied" }),
        save: vi.fn(),
      },
      metadataProvider: { fetch: vi.fn() },
      verifyToken: vi.fn().mockResolvedValue("auth-user-id"),
    });

    const response = await handler(
      new Request("https://example.test/capture", {
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: "https://www.facebook.com/share/p/abc/" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "permission denied" });
  });
});
