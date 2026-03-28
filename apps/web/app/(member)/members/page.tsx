import { Search } from "lucide-react";

import { Badge, Card, Input } from "@/components/primitives";
import { requireApprovedViewer } from "@/lib/auth";
import type { ProfileRecord } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatInstrumentLabel } from "@/lib/utils";

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireApprovedViewer();
  const params = (await searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("membership_status", "approved")
    .order("nickname", { ascending: true });

  const profiles = ((data as ProfileRecord[] | null) ?? []).filter((profile) => {
    if (!query) {
      return true;
    }
    const haystack = `${profile.nickname} ${profile.full_name ?? ""} ${profile.primary_instrument}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const groupedProfiles = profiles.reduce<Record<string, ProfileRecord[]>>((accumulator, profile) => {
    const key = profile.primary_instrument;
    accumulator[key] = [...(accumulator[key] ?? []), profile];
    return accumulator;
  }, {});

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-5xl text-primary">Member Directory</h1>
          <p className="mt-3 text-muted-foreground">{profiles.length} approved members are visible to the club.</p>
        </div>
        <form className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Search by nickname, full name, or instrument" className="pl-10" />
        </form>
      </section>

      {profiles.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedProfiles).map(([instrument, members]) => (
            <section key={instrument} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl text-foreground">{formatInstrumentLabel(instrument)}</h2>
                <Badge tone="brand">{members.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {members.map((profile) => (
                  <Card key={profile.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{profile.nickname}</p>
                        {profile.full_name ? <p className="text-sm text-muted-foreground">{profile.full_name}</p> : null}
                      </div>
                      <Badge tone="brand">{formatInstrumentLabel(profile.primary_instrument)}</Badge>
                    </div>
                    {profile.secondary_instrument ? (
                      <p className="mt-4 text-sm text-muted-foreground">Secondary: {formatInstrumentLabel(profile.secondary_instrument)}</p>
                    ) : null}
                    {profile.bio ? <p className="mt-4 text-sm text-muted-foreground">{profile.bio}</p> : null}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <p className="text-muted-foreground">No approved members match that search yet.</p>
        </Card>
      )}
    </div>
  );
}
