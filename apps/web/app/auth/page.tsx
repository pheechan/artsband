import { redirect } from "next/navigation";
import { Music2 } from "lucide-react";

import { FlashMessage } from "@/components/flash-message";
import { Button, Card, Input, Label } from "@/components/primitives";
import { getViewer } from "@/lib/auth";

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
    <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-primary">
            <Music2 className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Artsband</span>
          </div>
          <h1 className="text-5xl text-primary">Sign in</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Use your club account to access the Artsband workspace.
          </p>
        </div>

        <FlashMessage message={message} tone={tone === "success" || tone === "error" ? tone : "info"} />

        <Card className="p-6 lg:p-8">
          <form action="/auth/sign-in" method="post" className="space-y-4">
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
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Need access? Ask a club admin to create or approve your account.
          </p>
        </Card>
      </div>
    </main>
  );
}
