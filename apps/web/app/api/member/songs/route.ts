import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth";
import { buildRedirectUrl } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  title: z.string().trim().min(1).max(100),
  artist: z.string().trim().min(1).max(100),
  youtube_link: z.string().trim().url().optional().or(z.literal("")),
  spotify_link: z.string().trim().url().optional().or(z.literal("")),
  event_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/auth", "Please sign in before suggesting songs.", "error"), request.url));
  }

  if (viewer.profile.membership_status !== "approved") {
    return NextResponse.redirect(new URL(buildRedirectUrl("/pending", "Your membership is still pending review.", "error"), request.url));
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    title: formData.get("title"),
    artist: formData.get("artist"),
    youtube_link: formData.get("youtube_link"),
    spotify_link: formData.get("spotify_link"),
    event_id: formData.get("event_id"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/songs", "Please complete the song form with valid details.", "error"), request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("songs").insert({
    title: parsed.data.title,
    artist: parsed.data.artist,
    event_id: parsed.data.event_id,
    youtube_link: parsed.data.youtube_link || null,
    spotify_link: parsed.data.spotify_link || null,
    suggested_by: viewer.user.id,
  });

  if (error) {
    return NextResponse.redirect(new URL(buildRedirectUrl("/songs", error.message, "error"), request.url));
  }

  return NextResponse.redirect(new URL(buildRedirectUrl("/songs", "Song suggestion submitted.", "success"), request.url));
}
