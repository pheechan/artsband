import { NextResponse } from "next/server";

import { buildRedirectUrl } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", "Email and password are required.", "error"), request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", error.message, "error"), request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", "We could not create a session for that account.", "error"), request.url));
  }

  const { data: profile } = await supabase.from("profiles").select("membership_status").eq("id", user.id).maybeSingle();
  const destination = profile?.membership_status === "approved" ? "/dashboard" : "/pending";

  return NextResponse.redirect(new URL(destination, request.url));
}
