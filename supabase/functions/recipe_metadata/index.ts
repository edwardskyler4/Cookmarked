
import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.57.4";

import type { RecipeMetadata } from "../_shared/domain/RecipeMetadata.ts";

type ClientOptions = Parameters<typeof createClient>[2];

type ClientFactory = (
  url: string,
  key: string,
  options?: ClientOptions,
) => SupabaseClient;

type MetadataFunctionConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  origins: string[];
  createClient?: ClientFactory;
};

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  headers?: Headers,
): Response {
  const responseHeaders = new Headers(headers);

  responseHeaders.set("Content-Type", "application/json");
  responseHeaders.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

function unauthorizedResponse(headers?: Headers): Response {
  return jsonResponse(401, { code: "unauthorized" }, headers);
}



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



function detectPlatform(
  url: URL,
): RecipeMetadata["platform"] | null {
  const hostname = url.hostname.toLowerCase();

  const matchesDomain = (domain: string) =>
    hostname === domain || hostname.endsWith(`.${domain}`);

  if (
    matchesDomain("instagram.com") ||
    matchesDomain("instagr.am")
  ) {
    return "Instagram";
  }

  if (
    matchesDomain("facebook.com") ||
    matchesDomain("fb.watch")
  ) {
    return "Facebook";
  }

  if (
    matchesDomain("pinterest.com") ||
    matchesDomain("pin.it")
  ) {
    return "Pinterest";
  }

  return null;
}


export function createMetadataRequestHandler({
  supabaseUrl,
  supabaseAnonKey,
  origins,
  createClient: makeClient = createClient,
}: MetadataFunctionConfig): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const origin = request.headers.get("Origin");

    const headers = new Headers({
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });

    if (origin && !origins.includes(origin)) {
      return new Response(
        JSON.stringify({ code: "invalid_input" }),
        { status: 403, headers },
      );
    }

    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, { code: "method_not_allowed" }, headers);
    }

    const authorization = request.headers.get("Authorization");
    const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token || !authorization) {
      return unauthorizedResponse(headers);
    }

    const client = makeClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: authorization },
      },
    });

    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      return unauthorizedResponse(headers);
    }

    
    let body: unknown;

    try {
    body = await request.json();
    } catch {
    return jsonResponse(400, { code: "invalid_json" }, headers);
    }

    if (
        typeof body !== "object" ||
        body === null ||
        !("url" in body)
    ) {
    return jsonResponse(400, { code: "missing_url" }, headers);
    }

    const sourceUrl = validateSourceUrl(body.url);

    if (!sourceUrl) {
        return jsonResponse(400, { code: "invalid_source_url" }, headers);
    }

    const platform = detectPlatform(sourceUrl);

if (!platform) {
  return jsonResponse(400, {
    code: "unsupported_platform",
  }, headers);
}

const metadata: RecipeMetadata = {
  title: null,
  description: null,
  thumbnailUrl: null,
  platform,
  sourceUrl: sourceUrl.href,
};

return jsonResponse(200, metadata, headers);

  };
}
if (typeof Deno !== "undefined") {
  const origins = (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  Deno.serve(
    createMetadataRequestHandler({
      supabaseUrl: Deno.env.get("SUPABASE_URL")!,
      supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
      origins,
    }),
  );
}

