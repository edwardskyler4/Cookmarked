import type {
  CaptureMetadata,
  CaptureMetadataProvider,
} from "../domain/Capture.ts";

type Fetcher = typeof fetch;

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 512_000;
const REQUEST_TIMEOUT_MS = 8_000;

function isSafeHttpUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password) return false;
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") ||
    hostname.includes(":")
  )
    return false;

  const ipv4 = hostname.match(/^(\d{1,3})(?:\.(\d{1,3})){3}$/);
  if (ipv4) {
    const parts = hostname.split(".").map(Number);
    if (
      parts.some((part) => part > 255) ||
      parts[0] === 0 ||
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 198 && parts[1] >= 18 && parts[1] <= 19) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    )
      return false;
  }

  return true;
}

async function readBody(response: Response): Promise<string | null> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES)
    return null;
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  const matcher = /([\w:-]+)\s*=\s*(["'])(.*?)\2/gs;
  for (const match of tag.matchAll(matcher)) result[match[1].toLowerCase()] = decodeHtml(match[3]);
  return result;
}

function extractMetadata(html: string, pageUrl: string): CaptureMetadata {
  const values: Record<string, string> = {};
  for (const tag of html.matchAll(/<meta\b[^>]*>/gis)) {
    const attrs = attributes(tag[0]);
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    const value = attrs.content?.trim();
    if (key && value && !values[key]) values[key] = value;
  }

  const thumbnail = values["og:image"] ?? values["twitter:image"];
  let thumbnailUrl: string | undefined;
  if (thumbnail) {
    try {
      const resolved = new URL(thumbnail, pageUrl).toString();
      if (isSafeHttpUrl(resolved)) thumbnailUrl = resolved;
    } catch {
      thumbnailUrl = undefined;
    }
  }

  const metadata: CaptureMetadata = {};
  const title = values["og:title"] ?? values["twitter:title"];
  const description = values["og:description"] ?? values["description"];
  const mediaType = values["og:type"];
  if (title) metadata.title = title;
  if (description) metadata.description = description;
  if (thumbnailUrl) metadata.thumbnailUrl = thumbnailUrl;
  if (mediaType) metadata.mediaType = mediaType;
  return metadata;
}

export function createHttpMetadataProvider(
  fetcher: Fetcher = fetch,
): CaptureMetadataProvider {
  return {
    async fetch(canonicalUrl) {
      let currentUrl = canonicalUrl;
      for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
        if (!isSafeHttpUrl(currentUrl)) return null;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let response: Response;
        try {
          response = await fetcher(currentUrl, {
            redirect: "manual",
            signal: controller.signal,
            headers: { Accept: "text/html,application/xhtml+xml" },
          });
        } catch {
          return null;
        } finally {
          clearTimeout(timeout);
        }

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location || redirect === MAX_REDIRECTS) return null;
          try {
            currentUrl = new URL(location, currentUrl).toString();
          } catch {
            return null;
          }
          continue;
        }
        if (!response.ok) return null;
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType))
          return null;
        const html = await readBody(response);
        return html === null ? null : extractMetadata(html, currentUrl);
      }
      return null;
    },
  };
}
