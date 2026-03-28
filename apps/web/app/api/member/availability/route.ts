import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  weekStart: z.string().min(10),
  slots: z.array(
    z.object({
      start_time: z.string().datetime(),
      status: z.enum(["certain", "uncertain"]),
    }),
  ),
});

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "You need to sign in first." }, { status: 401 });
  }

  if (viewer.profile.membership_status !== "approved") {
    return NextResponse.json({ error: "Your membership is not approved yet." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid availability payload." }, { status: 400 });
  }

  const { weekStart, slots } = parsed.data;
  const weekStartDate = new Date(`${weekStart}T00:00:00`);
  const weekEndDate = addDays(weekStartDate, 7);
  const supabase = await createSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("availability")
    .delete()
    .eq("member_id", viewer.user.id)
    .gte("start_time", weekStartDate.toISOString())
    .lt("start_time", weekEndDate.toISOString());

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (slots.length > 0) {
    const payload = slots.map((slot) => ({
      member_id: viewer.user.id,
      start_time: slot.start_time,
      end_time: new Date(new Date(slot.start_time).getTime() + 60 * 60 * 1000).toISOString(),
      status: slot.status,
    }));

    const { error: insertError } = await supabase.from("availability").insert(payload);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, message: "Availability saved." });
}
