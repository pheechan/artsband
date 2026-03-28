import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { buildRedirectUrl } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ songId: string }> },
) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", "Please sign in before voting.", "error"), request.url));
  }

  if (viewer.profile.membership_status !== "approved") {
    return NextResponse.redirect(new URL(buildRedirectUrl("/pending", "Your membership is still pending review.", "error"), request.url));
  }

  const { songId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: existingVote } = await supabase
    .from("song_votes")
    .select("id")
    .eq("song_id", songId)
    .eq("user_id", viewer.user.id)
    .maybeSingle();

  const error = existingVote
    ? (
        await supabase
          .from("song_votes")
          .delete()
          .eq("song_id", songId)
          .eq("user_id", viewer.user.id)
      ).error
    : (
        await supabase.from("song_votes").insert({
          song_id: songId,
          user_id: viewer.user.id,
        })
      ).error;

  if (error) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/songs", error.message, "error"), request.url));
  }

  const message = existingVote ? "Vote removed." : "Vote saved.";
  return NextResponse.redirect(new URL(buildRedirectUrl("/songs", message, "success"), request.url));
}
