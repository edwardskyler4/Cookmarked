import { createClient } from "@supabase/supabase-js";
import { SupabaseAuthGateway } from "../_shared/data/SupabaseAuthGateway.ts";
import { handleAuth } from "../_shared/ui/authHandler.ts";

Deno.serve((request: Request) => {
  // A fresh client per request prevents one user's session leaking into another.
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const origins = (Deno.env.get("AUTH_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return handleAuth(request, new SupabaseAuthGateway(client), origins);
});
