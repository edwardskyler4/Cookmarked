
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createMetadataRequestHandler } from "../../supabase/functions/recipe_metadata/index.ts";

describe("recipe_metadata Edge Function entry point", () => {
  it("answers browser preflight without requiring authentication", async () => {
    const handler = createMetadataRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
    });

    const response = await handler(
      new Request("https://example.test/recipe_metadata", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
  });

  it("rejects requests without an authorization token", async () => {
    const handler = createMetadataRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
    });

    const response = await handler(
      new Request("https://example.test/recipe_metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: "https://www.instagram.com/p/example/",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "unauthorized",
    });
  });

  it.each([
    {
      platform: "Instagram",
      url: "https://www.instagram.com/p/example/",
    },
    {
      platform: "Facebook",
      url: "https://www.facebook.com/watch/?v=123",
    },
    {
      platform: "Pinterest",
      url: "https://www.pinterest.com/pin/123456789/",
    },
  ])("recognizes $platform links", async ({ platform, url }) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "auth-user-id",
            email: "user@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const handler = createMetadataRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
      createClient: (url, key, options) =>
        createClient(url, key, {
          ...options,
          global: { ...options?.global, fetch },
        }),
    });

    const response = await handler(
      new Request("https://example.test/recipe_metadata", {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      title: null,
      description: null,
      thumbnailUrl: null,
      platform,
      sourceUrl: url,
    });
  });

  it("rejects unsupported platforms", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "auth-user-id",
            email: "user@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const handler = createMetadataRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
      createClient: (url, key, options) =>
        createClient(url, key, {
          ...options,
          global: { ...options?.global, fetch },
        }),
    });

    const response = await handler(
      new Request("https://example.test/recipe_metadata", {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: "https://example.com/recipe",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: "unsupported_platform",
    });
  });

  it("rejects HTTP source URLs", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "auth-user-id",
            email: "user@example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const handler = createMetadataRequestHandler({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-key",
      origins: ["http://localhost:5173"],
      createClient: (url, key, options) =>
        createClient(url, key, {
          ...options,
          global: { ...options?.global, fetch },
        }),
    });

    const response = await handler(
      new Request("https://example.test/recipe_metadata", {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: "http://example.com/recipe",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: "invalid_source_url",
    });
  });
});
