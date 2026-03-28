import { NextResponse } from "next/server";

import { getSiteUrl } from "@/lib/env";
import { buildRedirectUrl } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const primaryInstrument = String(formData.get("primary_instrument") ?? "other");

  if (!email || !password || !nickname || !studentId) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", "Nickname, email, password, and student ID are required.", "error"), request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: {
        nickname,
        primary_instrument: primaryInstrument,
        student_id: studentId,
      },
    },
  });

  if (error) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", error.message, "error"), request.url));
  }

  if (data.session) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  return NextResponse.redirect(
    new URL(
      buildRedirectUrl(
        "/auth",
        "Registration submitted. If email confirmations are enabled, confirm your email and then sign in to see your approval status.",
        "success",
      ),
      request.url,
    ),
  );
}
