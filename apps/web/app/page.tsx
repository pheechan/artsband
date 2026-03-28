import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth";

export default async function HomePage() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/auth");
  }

  if (viewer.profile.membership_status !== "approved") {
    redirect("/pending");
  }

  redirect("/dashboard");
}
