import { FlashMessage } from "@/components/flash-message";
import { Button, Card, Input, Label, Textarea } from "@/components/primitives";
import { requireApprovedViewer } from "@/lib/auth";
import { instrumentOptions } from "@/lib/domain";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireApprovedViewer();
  const params = (await searchParams) ?? {};
  const message = typeof params.message === "string" ? params.message : undefined;
  const tone = typeof params.tone === "string" ? params.tone : "info";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-5xl text-primary">My Profile</h1>
        <p className="mt-3 text-muted-foreground">Update your member-facing details through a server-owned profile route.</p>
      </div>

      <FlashMessage message={message} tone={tone === "success" || tone === "error" ? tone : "info"} />

      <Card className="p-8">
        <form action="/api/member/profile" method="post" className="grid gap-5">
          <input type="hidden" name="redirect_to" value="/profile" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-nickname">Nickname</Label>
              <Input id="profile-nickname" name="nickname" defaultValue={viewer.profile.nickname} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">Full name</Label>
              <Input id="profile-full-name" name="full_name" defaultValue={viewer.profile.full_name ?? ""} />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone number</Label>
              <Input id="profile-phone" name="phone_number" defaultValue={viewer.profile.phone_number ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-student-id">Student ID</Label>
              <Input id="profile-student-id" name="student_id" defaultValue={viewer.profile.student_id ?? ""} required />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-primary">Primary instrument</Label>
              <select
                id="profile-primary"
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
              <Label htmlFor="profile-secondary">Secondary instrument</Label>
              <select
                id="profile-secondary"
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea id="profile-bio" name="bio" defaultValue={viewer.profile.bio ?? ""} />
          </div>
          <Button type="submit" className="w-full">
            Save profile
          </Button>
        </form>
      </Card>
    </div>
  );
}
