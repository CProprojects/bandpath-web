import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-only operations that must bypass RLS
// (creating users from the Telegram flow, reading/writing login sessions).
// Never import this from client components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
