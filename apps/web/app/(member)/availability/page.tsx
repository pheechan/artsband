import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";

import { AvailabilityGrid } from "@/components/availability-grid";
import { Card } from "@/components/primitives";
import { requireApprovedViewer } from "@/lib/auth";
import type { AvailabilityRecord } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeWeekStart(value?: string) {
  if (value) {
    return new Date(`${value}T00:00:00`);
  }
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireApprovedViewer();
  const params = (await searchParams) ?? {};
  const weekStartParam = typeof params.weekStart === "string" ? params.weekStart : undefined;
  const weekStartDate = normalizeWeekStart(weekStartParam);
  const weekStart = format(weekStartDate, "yyyy-MM-dd");
  const nextWeek = format(addDays(weekStartDate, 7), "yyyy-MM-dd");
  const previousWeek = format(addDays(weekStartDate, -7), "yyyy-MM-dd");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("availability")
    .select("*")
    .eq("member_id", viewer.user.id)
    .gte("start_time", weekStartDate.toISOString())
    .lt("start_time", addDays(weekStartDate, 7).toISOString())
    .order("start_time", { ascending: true });

  const slots = (data as AvailabilityRecord[] | null) ?? [];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-5xl text-primary">Availability Matrix</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Save your rehearsal availability by week. This data is already shaped for a future Python scheduler that can consume song, lineup, and rehearsal constraints.
          </p>
        </div>
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <Link href={`/availability?weekStart=${previousWeek}`} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
            Previous week
          </Link>
          <span className="text-sm font-semibold text-foreground">
            {format(weekStartDate, "d MMM")} - {format(addDays(weekStartDate, 6), "d MMM yyyy")}
          </span>
          <Link href={`/availability?weekStart=${nextWeek}`} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
            Next week
          </Link>
        </Card>
      </section>

      <AvailabilityGrid
        weekStart={weekStart}
        initialSlots={slots.map((slot) => ({
          id: slot.id,
          start_time: slot.start_time,
          status: slot.status,
        }))}
      />
    </div>
  );
}
