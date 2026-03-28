import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, Clock3, Music2, Users } from "lucide-react";

import { Badge, Card, SoftCard } from "@/components/primitives";
import { fetchSchedulerCapabilities } from "@/lib/app-api";
import { requireApprovedViewer } from "@/lib/auth";
import type { EventRecord, RehearsalWithSong } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const viewer = await requireApprovedViewer();
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const [eventsResult, rehearsalsResult, membersCount, confirmedSongsCount, schedulerCapability] = await Promise.all([
    supabase.from("events").select("*").gte("event_date", today).order("event_date", { ascending: true }).limit(5),
    supabase
      .from("rehearsals")
      .select("id,start_time,end_time,location,notes,status,songs(title,artist)")
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .limit(5),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("membership_status", "approved"),
    supabase.from("songs").select("id", { count: "exact", head: true }).eq("is_confirmed", true),
    fetchSchedulerCapabilities(),
  ]);

  const upcomingEvents = (eventsResult.data as EventRecord[] | null) ?? [];
  const upcomingRehearsals = (rehearsalsResult.data as RehearsalWithSong[] | null) ?? [];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary/70">Welcome back</p>
          <h1 className="mt-3 text-5xl text-primary">{viewer.profile.nickname}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Artsband is now structured for a full-stack workflow: approved membership gating, server-side writes, and a Python scheduler boundary that can grow with the club.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/songs" className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Open Song Hub
            </Link>
            <Link href="/availability" className="rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground">
              Update availability
            </Link>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary/70">Scheduler status</p>
              <h2 className="mt-3 text-3xl text-foreground">Python API</h2>
            </div>
            <Badge tone={schedulerCapability ? "success" : "warning"}>
              {schedulerCapability ? schedulerCapability.mode : "offline"}
            </Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {schedulerCapability
              ? `Connected to the scheduler-ready API. Current mode: ${schedulerCapability.mode}.`
              : "The web app is ready to call the scheduler API once you add the Vercel API URL and environment variables."}
          </p>
          {schedulerCapability ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {schedulerCapability.data_sources.map((source) => (
                <Badge key={source} tone="brand">
                  {source}
                </Badge>
              ))}
            </div>
          ) : null}
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SoftCard className="p-5">
          <CalendarDays className="h-8 w-8 text-primary" />
          <p className="mt-4 text-3xl font-semibold text-foreground">{upcomingEvents.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Upcoming gigs</p>
        </SoftCard>
        <SoftCard className="p-5">
          <Clock3 className="h-8 w-8 text-primary" />
          <p className="mt-4 text-3xl font-semibold text-foreground">{upcomingRehearsals.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Upcoming rehearsals</p>
        </SoftCard>
        <SoftCard className="p-5">
          <Users className="h-8 w-8 text-primary" />
          <p className="mt-4 text-3xl font-semibold text-foreground">{membersCount.count ?? 0}</p>
          <p className="mt-1 text-sm text-muted-foreground">Approved members</p>
        </SoftCard>
        <SoftCard className="p-5">
          <Music2 className="h-8 w-8 text-primary" />
          <p className="mt-4 text-3xl font-semibold text-foreground">{confirmedSongsCount.count ?? 0}</p>
          <p className="mt-1 text-sm text-muted-foreground">Confirmed songs</p>
        </SoftCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl text-foreground">Upcoming gigs</h2>
              <p className="mt-2 text-sm text-muted-foreground">Club events that are already in the pipeline.</p>
            </div>
            <Link href="/songs" className="text-sm font-semibold text-primary">
              Song Hub
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <SoftCard key={event.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(event.event_date), "EEEE, d MMMM yyyy")}</p>
                    {event.venue ? <p className="text-sm text-muted-foreground">{event.venue}</p> : null}
                  </div>
                  <Badge tone={event.status === "confirmed" ? "success" : event.status === "voting" ? "warning" : "neutral"}>
                    {event.status}
                  </Badge>
                </div>
              </SoftCard>
            )) : (
              <p className="text-sm text-muted-foreground">No upcoming gigs yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl text-foreground">Upcoming rehearsals</h2>
              <p className="mt-2 text-sm text-muted-foreground">Current rehearsal blocks that members can already see.</p>
            </div>
            <Link href="/availability" className="text-sm font-semibold text-primary">
              Availability
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {upcomingRehearsals.length > 0 ? upcomingRehearsals.map((rehearsal) => (
              <SoftCard key={rehearsal.id} className="p-4">
                <p className="font-semibold text-foreground">{rehearsal.songs?.title ?? "Rehearsal block"}</p>
                <p className="text-sm text-muted-foreground">{rehearsal.songs?.artist ?? "Artsband set list"}</p>
                <p className="mt-3 text-sm text-muted-foreground">{format(new Date(rehearsal.start_time), "EEE, d MMM yyyy - h:mm a")}</p>
                {rehearsal.location ? <p className="text-sm text-muted-foreground">{rehearsal.location}</p> : null}
              </SoftCard>
            )) : (
              <p className="text-sm text-muted-foreground">No rehearsals are scheduled yet.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
