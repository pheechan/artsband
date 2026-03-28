import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";

import type { Viewer } from "@/lib/auth";
import { Badge, Button } from "@/components/primitives";
import { AppNav } from "@/components/app-nav";

export function SiteShell({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <AppNav isAdmin={viewer.isAdmin} />
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{viewer.profile.nickname}</p>
                <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  <span>{viewer.user.email}</span>
                  {viewer.isAdmin ? (
                    <Badge tone="brand" className="gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Admin
                    </Badge>
                  ) : null}
                </div>
              </div>
              <form action="/auth/sign-out" method="post">
                <Button variant="outline" type="submit">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>

      <footer className="mx-auto flex max-w-7xl items-center justify-between px-4 pb-8 text-sm text-muted-foreground lg:px-8">
        <span>Faculty of Arts, Chulalongkorn University</span>
        <Link href="/pending" className="hover:text-primary">
          Membership status
        </Link>
      </footer>
    </div>
  );
}
