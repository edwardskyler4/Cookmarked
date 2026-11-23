import { createClient } from "@supabase/supabase-js";
import { SupabaseTempRecipeRepository } from "../_shared/data/SupabaseTempRecipeRepository.ts";
import type {
  CaptureMetadataProvider,
  CaptureRepository,
} from "../_shared/domain/Capture.ts";
import { captureLink } from "../_shared/services/captureLink.ts";
import { createHttpMetadataProvider } from "../_shared/services/metadataProvider.ts";

type TokenVerifier = (token: string) => Promise<string | null>;

type CaptureHandlerConfig = {
  origins: string[];
  repository: CaptureRepository;
  metadataProvider: CaptureMetadataProvider;
  verifyToken: TokenVerifier;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "unavailable";
}

function response(status: number, body: unknown, origin: string | null, origins: string[]) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  if (origin && origins.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

export function createCaptureRequestHandler(config: CaptureHandlerConfig) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    if (origin && !config.origins.includes(origin))
      return response(403, { code: "invalid_input" }, origin, config.origins);
    if (request.method === "OPTIONS") return response(204, null, origin, config.origins);
    if (request.method !== "POST")
      return response(405, { code: "method_not_allowed" }, origin, config.origins);

    const token = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return response(401, { code: "unauthorized" }, origin, config.origins);
    const authUserId = await config.verifyToken(token);
    if (!authUserId) return response(401, { code: "unauthorized" }, origin, config.origins);

    const body = await request.json().catch(() => null) as {
      url?: unknown;
      text?: unknown;
    } | null;
    if (!body || typeof body.url !== "string")
      return response(400, { code: "missing_url" }, origin, config.origins);
    if (body.text !== undefined && typeof body.text !== "string")
      return response(400, { code: "invalid_text" }, origin, config.origins);

    try {
      const result = await captureLink(
        config.repository,
        config.metadataProvider,
        authUserId,
        body.url,
        body.text,
      );
      return response(result.duplicate ? 200 : 201, result, origin, config.origins);
    } catch (error) {
      console.error("Capture failed", error);
      const code = errorMessage(error);
      const status = code === "invalid_url" || code === "unsupported_host" ? 400 : 503;
      return response(status, { code }, origin, config.origins);
    }
  };
}

if (typeof Deno !== "undefined") {
  const origins = (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  Deno.serve((request) => {
    // Database queries must carry the caller's JWT so profile lookup and RLS
    // evaluate as the authenticated user, not as anon.
    const authorization = request.headers.get("Authorization") ?? "";
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authorization } },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    return createCaptureRequestHandler({
      origins,
      repository: new SupabaseTempRecipeRepository(client),
      metadataProvider: createHttpMetadataProvider(),
      verifyToken: async (token) => {
        const { data, error } = await client.auth.getUser(token);
        return error ? null : data.user?.id ?? null;
      },
    })(request);
  });
}
