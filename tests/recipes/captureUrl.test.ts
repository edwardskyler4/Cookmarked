import { describe, expect, it } from "vitest";
import {
  CaptureUrlError,
  parseCaptureUrl,
} from "../../supabase/functions/_shared/services/captureUrl";

describe("parseCaptureUrl", () => {
  it("detects Instagram and removes a fragment from the canonical URL", () => {
    expect(
      parseCaptureUrl("https://WWW.Instagram.com/p/ABC123/?view=full#comments"),
    ).toEqual({
      platform: "Instagram",
      canonicalUrl: "https://www.instagram.com/p/ABC123/?view=full",
    });
  });

  it("normalizes a default HTTPS port and detects supported subdomains", () => {
    expect(parseCaptureUrl("https://m.pinterest.com:443/pin/123/")).toEqual({
      platform: "Pinterest",
      canonicalUrl: "https://m.pinterest.com/pin/123/",
    });
  });

  it.each(["not a url", "ftp://instagram.com/p/1", "https://example.com/recipe"])(
    "rejects %s",
    (url) => {
      expect(() => parseCaptureUrl(url)).toThrow(CaptureUrlError);
    },
  );
});
