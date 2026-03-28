import { NextResponse } from "next/server";

import { buildRedirectUrl } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL(buildRedirectUrl("/auth", "You have been signed out.", "success"), request.url),
  );
}
