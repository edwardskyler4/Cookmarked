import {
  RecipeMetadataError,
  type RecipeMetadata,
} from "../domain/RecipeMetadata.ts";
function validateSourceUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") {
    return null;
  }

  if (url.username || url.password) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();

  // Reject local and internal hostnames.
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid")
  ) {
    return null;
  }

  // Reject IP-address destinations.
  if (
    hostname.startsWith("[") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes(":")
  ) {
    return null;
  }

  return url;
}

function detectPlatform(url: URL): RecipeMetadata["platform"] | null {
  const hostname = url.hostname.toLowerCase();

  const matchesDomain = (domain: string) =>
    hostname === domain || hostname.endsWith(`.${domain}`);

  if (matchesDomain("instagram.com") || matchesDomain("instagr.am")) {
    return "Instagram";
  }

  if (matchesDomain("facebook.com") || matchesDomain("fb.watch")) {
    return "Facebook";
  }

  if (matchesDomain("pinterest.com") || matchesDomain("pin.it")) {
    return "Pinterest";
  }

  return null;
}

export function getRecipeMetadata(value: unknown): RecipeMetadata {
  const sourceUrl = validateSourceUrl(value);
  if (!sourceUrl) throw new RecipeMetadataError("invalid_source_url");
  const platform = detectPlatform(sourceUrl);
  if (!platform) throw new RecipeMetadataError("unsupported_platform");
  return {
    title: null,
    description: null,
    thumbnailUrl: null,
    platform,
    sourceUrl: sourceUrl.href,
  };
}
