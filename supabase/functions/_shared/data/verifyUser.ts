import type { SupabaseClient } from "@supabase/supabase-js";

export async function verifyUser(
  client: SupabaseClient,
  token: string,
): Promise<string | null> {
  const { data, error } = await client.auth.getUser(token);
  if (error) {
    if ([400, 401, 403].includes(error.status ?? 0)) return null;
    throw error;
  }
  return data.user?.id ?? null;
}
