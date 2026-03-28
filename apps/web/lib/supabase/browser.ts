"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseBrowserEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  if (client) {
    return client;
  }

  const { url, anonKey } = getSupabaseBrowserEnv();
  client = createBrowserClient(url, anonKey);
  return client;
}
