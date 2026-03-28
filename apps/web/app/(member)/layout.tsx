import { requireApprovedViewer } from "@/lib/auth";
import { SiteShell } from "@/components/site-shell";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireApprovedViewer();

  return <SiteShell viewer={viewer}>{children}</SiteShell>;
}
