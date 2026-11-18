// Composition root: binds the HTTP boundary to Supabase adapters.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyUser } from "./data/verifyUser.ts";
import {
  credentialEndpoint,
  userEndpoint,
  type VerifiedContext,
} from "./ui/endpoint.ts";
import type { UserEndpoint } from "./ui/endpoints.ts";
export type FunctionConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  origins: string[];
  createClient?: typeof createClient;
};
function client(config: FunctionConfig, token?: string) {
  return (config.createClient ?? createClient)(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      ...(token
        ? { global: { headers: { Authorization: `Bearer ${token}` } } }
        : {}),
    },
  );
}
export function createUserEndpoint(
  name: UserEndpoint,
  config: FunctionConfig,
  action: (
    request: Request,
    context: VerifiedContext<SupabaseClient>,
    headers: Headers,
  ) => Promise<Response>,
) {
  return (request: Request) =>
    userEndpoint(
      name,
      request,
      config.origins,
      async (token) => {
        const resource = client(config, token);
        const userId = await verifyUser(resource, token);
        return userId ? { userId, resource } : null;
      },
      (context, headers) => action(request, context, headers),
    );
}
export function createCredentialEndpoint(
  config: FunctionConfig,
  action: (
    request: Request,
    client: SupabaseClient,
    headers: Headers,
  ) => Promise<Response>,
) {
  return (request: Request) =>
    credentialEndpoint(request, config.origins, (headers) =>
      action(request, client(config), headers),
    );
}
export function environmentConfig(): FunctionConfig {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL")!,
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
    origins: (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
}
