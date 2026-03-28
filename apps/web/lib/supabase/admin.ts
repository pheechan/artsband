import { createClient } from "@supabase/supabase-js";

import { getSupabaseBrowserEnv, getSupabaseServiceRoleKey } from "@/lib/env";

let adminClient: ReturnType<typeof createClient<any>> | undefined;

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const { url } = getSupabaseBrowserEnv();
  adminClient = createClient<any>(url, getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
