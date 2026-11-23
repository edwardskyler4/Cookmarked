export type CapturePlatform = "Facebook" | "Instagram" | "Pinterest";

export interface ParsedCaptureUrl {
  platform: CapturePlatform;
  canonicalUrl: string;
}

export class CaptureUrlError extends Error {
  constructor(
    public readonly code: "invalid_url" | "unsupported_host",
  ) {
    super(code);
  }
}

const supportedHosts: Array<[string, CapturePlatform]> = [
  ["facebook.com", "Facebook"],
  ["fb.watch", "Facebook"],
  ["instagram.com", "Instagram"],
  ["instagr.am", "Instagram"],
  ["pinterest.com", "Pinterest"],
  ["pin.it", "Pinterest"],
];

function platformForHost(hostname: string): CapturePlatform | null {
  for (const [domain, platform] of supportedHosts) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) return platform;
  }
  return null;
}

export function parseCaptureUrl(input: string): ParsedCaptureUrl {
  if (typeof input !== "string" || !input.trim())
    throw new CaptureUrlError("invalid_url");

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new CaptureUrlError("invalid_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new CaptureUrlError("invalid_url");
  if (url.username || url.password || !url.hostname)
    throw new CaptureUrlError("invalid_url");

  const platform = platformForHost(url.hostname.toLowerCase());
  if (!platform) throw new CaptureUrlError("unsupported_host");

  url.hash = "";
  return { platform, canonicalUrl: url.toString() };
}
