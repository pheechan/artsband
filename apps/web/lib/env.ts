function readEnv(name: string) {
  return process.env[name]?.trim();
}

export function getSupabaseBrowserEnv() {
  return {
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://example.supabase.co",
    anonKey: readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || "example-anon-key",
  };
}

export function getSupabaseServiceRoleKey() {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY") || "example-service-role-key";
}

export function getSiteUrl() {
  return readEnv("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";
}

export function getApiBaseUrl() {
  return readEnv("NEXT_PUBLIC_API_BASE_URL") || "http://localhost:8000";
}
