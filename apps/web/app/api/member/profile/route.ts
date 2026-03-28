import { NextResponse } from "next/server";
import { z } from "zod";

import { instrumentOptions } from "@/lib/domain";
import { buildRedirectUrl } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const instrumentEnum = z.enum(instrumentOptions.map((option) => option.value) as [string, ...string[]]);

const profileSchema = z.object({
  nickname: z.string().trim().min(2).max(50),
  full_name: z.string().trim().max(120).optional(),
  phone_number: z.string().trim().max(30).optional(),
  student_id: z.string().trim().min(5).max(20),
  primary_instrument: instrumentEnum,
  secondary_instrument: z.union([instrumentEnum, z.literal("none")]).optional(),
  bio: z.string().trim().max(500).optional(),
  redirect_to: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = profileSchema.safeParse({
    nickname: formData.get("nickname"),
    full_name: formData.get("full_name"),
    phone_number: formData.get("phone_number"),
    student_id: formData.get("student_id"),
    primary_instrument: formData.get("primary_instrument"),
    secondary_instrument: formData.get("secondary_instrument"),
    bio: formData.get("bio"),
    redirect_to: formData.get("redirect_to"),
  });

  const fallbackPath = typeof formData.get("redirect_to") === "string" ? String(formData.get("redirect_to")) : "/profile";

  if (!parsed.success) {
    return NextResponse.redirect(new URL(buildRedirectUrl(fallbackPath, "Please review the profile form fields and try again.", "error"), request.url));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", "You need to sign in before updating your profile.", "error"), request.url));
  }

  const payload = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      nickname: payload.nickname,
      full_name: payload.full_name || null,
      phone_number: payload.phone_number || null,
      student_id: payload.student_id,
      primary_instrument: payload.primary_instrument,
      secondary_instrument: payload.secondary_instrument && payload.secondary_instrument !== "none" ? payload.secondary_instrument : null,
      bio: payload.bio || null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.redirect(new URL(buildRedirectUrl(fallbackPath, error.message, "error"), request.url));
  }

  return NextResponse.redirect(new URL(buildRedirectUrl(payload.redirect_to || fallbackPath, "Profile updated.", "success"), request.url));
}
