import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";

let client: SupabaseClient | undefined;

export function dpAdminClient() {
  if (!client) {
    const env = serverEnv();
    client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          "X-Client-Info": "horizon-dp-server",
          "X-DP-Server-Key": env.databaseAccessKey,
        },
      },
    });
  }
  return client;
}
