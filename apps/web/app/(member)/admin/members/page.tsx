import { FlashMessage } from "@/components/flash-message";
import { Badge, Button, Card, Input, Label } from "@/components/primitives";
import { requireAdminViewer } from "@/lib/auth";
import type { ProfileRecord } from "@/lib/domain";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminViewer();
  const params = (await searchParams) ?? {};
  const message = typeof params.message === "string" ? params.message : undefined;
  const tone = typeof params.tone === "string" ? params.tone : "info";

  const adminClient = getSupabaseAdminClient();
  const { data } = await adminClient
    .from("profiles")
    .select("*")
    .in("membership_status", ["pending", "rejected", "suspended"])
    .order("created_at", { ascending: true });

  const profiles = (data as ProfileRecord[] | null) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-5xl text-primary">Membership Review</h1>
        <p className="mt-3 text-muted-foreground">Approve Artsband members manually and keep a note whenever a request is rejected or suspended.</p>
      </div>

      <FlashMessage message={message} tone={tone === "success" || tone === "error" ? tone : "info"} />

      <div className="grid gap-4">
        {profiles.length > 0 ? profiles.map((profile) => (
          <Card key={profile.id} className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl text-foreground">{profile.nickname}</h2>
                  <Badge tone={profile.membership_status === "pending" ? "warning" : profile.membership_status === "rejected" ? "danger" : "neutral"}>
                    {profile.membership_status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Student ID: {profile.student_id || "Missing"}</p>
                  <p>Instrument: {profile.primary_instrument}</p>
                  <p>Created: {new Date(profile.created_at).toLocaleString()}</p>
                  {profile.rejection_reason ? <p>Admin note: {profile.rejection_reason}</p> : null}
                </div>
              </div>

              <form action={`/api/admin/members/${profile.id}/status`} method="post" className="grid gap-3 rounded-2xl bg-secondary/70 p-4 lg:min-w-96">
                <div className="space-y-2">
                  <Label htmlFor={`status-${profile.id}`}>New status</Label>
                  <select
                    id={`status-${profile.id}`}
                    name="membership_status"
                    defaultValue={profile.membership_status === "pending" ? "approved" : profile.membership_status}
                    className="brand-ring h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground"
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                    <option value="suspended">Suspend</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`reason-${profile.id}`}>Admin note</Label>
                  <Input id={`reason-${profile.id}`} name="rejection_reason" defaultValue={profile.rejection_reason ?? ""} placeholder="Optional reason for rejection or suspension" />
                </div>
                <Button type="submit">Update membership</Button>
              </form>
            </div>
          </Card>
        )) : (
          <Card className="p-8">
            <p className="text-muted-foreground">No pending, rejected, or suspended members are waiting for review right now.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
