import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export { createAdminClient } from "@/lib/supabase/admin";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const session = await auth();
  return createSupabaseClient(url, key, {
    accessToken: () => session.getToken(),
  });
}
