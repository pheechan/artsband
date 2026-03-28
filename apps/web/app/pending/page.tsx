import { redirect } from "next/navigation";

import { FlashMessage } from "@/components/flash-message";
import { Button, Card, Input, Label, Textarea } from "@/components/primitives";
import { getMembershipCopy, requireViewer } from "@/lib/auth";
import { formatInstrumentLabel } from "@/lib/utils";
import { instrumentOptions } from "@/lib/domain";

export default async function PendingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireViewer();
  if (viewer.profile.membership_status === "approved") {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const message = typeof params.message === "string" ? params.message : undefined;
  const tone = typeof params.tone === "string" ? params.tone : "info";
  const copy = getMembershipCopy(viewer.profile.membership_status);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="flex flex-col justify-between p-8 lg:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary/70">Artsband Review Queue</p>
            <h1 className="mt-4 text-5xl text-primary">{copy.title}</h1>
            <p className="mt-4 text-base text-muted-foreground">{copy.description}</p>
          </div>
          <div className="mt-8 space-y-4 rounded-2xl bg-secondary/80 p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Account email</p>
              <p className="text-sm text-muted-foreground">{viewer.user.email}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Student ID on file</p>
              <p className="text-sm text-muted-foreground">{viewer.profile.student_id || "Not provided yet"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Primary instrument</p>
              <p className="text-sm text-muted-foreground">{formatInstrumentLabel(viewer.profile.primary_instrument)}</p>
            </div>
            {viewer.profile.rejection_reason ? (
              <div>
                <p className="text-sm font-semibold text-foreground">Admin note</p>
                <p className="text-sm text-muted-foreground">{viewer.profile.rejection_reason}</p>
              </div>
            ) : null}
            <form action="/auth/sign-out" method="post">
              <Button variant="outline" type="submit" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </Card>

        <div className="space-y-6">
          <FlashMessage message={message} tone={tone === "success" || tone === "error" ? tone : "info"} />
          <Card className="p-6 lg:p-8">
            <h2 className="text-2xl text-foreground">Keep your profile accurate</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Admins review pending accounts manually, so keep your nickname, student ID, and instrument details up to date.
            </p>
            <form action="/api/member/profile" method="post" className="mt-6 grid gap-4">
              <input type="hidden" name="redirect_to" value="/pending" />
              <div className="space-y-2">
                <Label htmlFor="pending-nickname">Nickname</Label>
                <Input id="pending-nickname" name="nickname" defaultValue={viewer.profile.nickname} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending-full-name">Full name</Label>
                <Input id="pending-full-name" name="full_name" defaultValue={viewer.profile.full_name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending-student-id">Student ID</Label>
                <Input id="pending-student-id" name="student_id" defaultValue={viewer.profile.student_id ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending-phone">Phone number</Label>
                <Input id="pending-phone" name="phone_number" defaultValue={viewer.profile.phone_number ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending-primary">Primary instrument</Label>
                <select
                  id="pending-primary"
                  name="primary_instrument"
                  defaultValue={viewer.profile.primary_instrument}
                  className="brand-ring h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground"
                >
                  {instrumentOptions.map((instrument) => (
                    <option key={instrument.value} value={instrument.value}>
                      {instrument.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending-secondary">Secondary instrument</Label>
                <select
                  id="pending-secondary"
                  name="secondary_instrument"
                  defaultValue={viewer.profile.secondary_instrument ?? "none"}
                  className="brand-ring h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground"
                >
                  <option value="none">None</option>
                  {instrumentOptions.map((instrument) => (
                    <option key={instrument.value} value={instrument.value}>
                      {instrument.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending-bio">Bio</Label>
                <Textarea id="pending-bio" name="bio" defaultValue={viewer.profile.bio ?? ""} />
              </div>
              <Button type="submit" className="w-full">
                Save pending profile
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
