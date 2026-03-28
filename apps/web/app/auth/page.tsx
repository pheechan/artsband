import { redirect } from "next/navigation";
import { Music2 } from "lucide-react";

import { FlashMessage } from "@/components/flash-message";
import { Button, Card, Input, Label } from "@/components/primitives";
import { getViewer } from "@/lib/auth";
import { instrumentOptions } from "@/lib/domain";

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (viewer) {
    redirect(viewer.profile.membership_status === "approved" ? "/dashboard" : "/pending");
  }

  const params = (await searchParams) ?? {};
  const message = typeof params.message === "string" ? params.message : undefined;
  const tone = typeof params.tone === "string" ? params.tone : "info";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card flex flex-col justify-between p-8 lg:p-10">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-primary">
              <Music2 className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">Artsband Platform</span>
            </div>
            <h1 className="mb-4 text-5xl text-primary">Artsband</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              The full-stack song voting, rehearsal, and membership platform for the Faculty of Arts music club.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm font-semibold text-foreground">Song Hub</p>
              <p className="mt-2 text-sm text-muted-foreground">Collect song ideas and let members vote on what the band performs next.</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-semibold text-foreground">Availability</p>
              <p className="mt-2 text-sm text-muted-foreground">Track who is free and prepare clean inputs for your scheduler pipeline.</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-semibold text-foreground">Approvals</p>
              <p className="mt-2 text-sm text-muted-foreground">Keep registration gated with student ID collection and admin review.</p>
            </Card>
          </div>
        </section>

        <div className="space-y-6">
          <FlashMessage message={message} tone={tone === "success" || tone === "error" ? tone : "info"} />

          <Card className="p-6 lg:p-8">
            <h2 className="text-2xl text-foreground">Sign in</h2>
            <p className="mt-2 text-sm text-muted-foreground">Approved members go straight into the club workspace. Pending accounts are routed to review status.</p>
            <form action="/auth/sign-in" method="post" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" name="email" type="email" required placeholder="yourname@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" name="password" type="password" required placeholder="Enter your password" />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </Card>

          <Card className="p-6 lg:p-8">
            <h2 className="text-2xl text-foreground">Register for review</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use your Arts student ID so the club admins can verify your membership request.</p>
            <form action="/auth/sign-up" method="post" className="mt-6 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-nickname">Nickname</Label>
                <Input id="signup-nickname" name="nickname" required placeholder="Your nickname" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" name="email" type="email" required placeholder="yourname@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" name="password" type="password" minLength={8} required placeholder="At least 8 characters" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-id">Student ID</Label>
                <Input id="student-id" name="student_id" required placeholder="e.g. 6638123421" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary-instrument">Primary instrument</Label>
                <select
                  id="primary-instrument"
                  name="primary_instrument"
                  defaultValue="other"
                  className="brand-ring h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground"
                >
                  {instrumentOptions.map((instrument) => (
                    <option key={instrument.value} value={instrument.value}>
                      {instrument.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">
                Create pending account
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
