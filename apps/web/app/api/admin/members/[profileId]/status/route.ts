import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth";
import { buildRedirectUrl } from "@/lib/redirects";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  membership_status: z.enum(["approved", "rejected", "suspended"]),
  rejection_reason: z.string().trim().max(300).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const viewer = await getViewer();
  if (!viewer || !viewer.isAdmin || viewer.profile.membership_status !== "approved") {
    return NextResponse.redirect(new URL(buildRedirectUrl("/dashboard", "Admin access is required.", "error"), request.url));
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    membership_status: formData.get("membership_status"),
    rejection_reason: formData.get("rejection_reason"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/admin/members", "Please choose a valid approval status.", "error"), request.url));
  }

  const { profileId } = await params;
  const adminClient = getSupabaseAdminClient();
  const membershipStatus = parsed.data.membership_status;
  const { error } = await adminClient
    .from("profiles")
    .update({
      membership_status: membershipStatus,
      approved_at: membershipStatus === "approved" ? new Date().toISOString() : null,
      approved_by: membershipStatus === "approved" ? viewer.user.id : null,
      rejection_reason: membershipStatus === "approved" ? null : parsed.data.rejection_reason || null,
    })
    .eq("id", profileId);

  if (error) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/admin/members", error.message, "error"), request.url));
  }

  return NextResponse.redirect(new URL(buildRedirectUrl("/admin/members", "Membership status updated.", "success"), request.url));
}
