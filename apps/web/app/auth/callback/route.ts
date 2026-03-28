import { NextResponse } from "next/server";

import { buildRedirectUrl } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", "Missing auth callback code.", "error"), request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", error.message, "error"), request.url));
  }

  return NextResponse.redirect(new URL("/pending", request.url));
}
