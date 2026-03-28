import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import type { AppRole, MembershipStatus, ProfileRecord, RoleRecord } from "@/lib/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Viewer {
  user: User;
  profile: ProfileRecord;
  roles: AppRole[];
  isAdmin: boolean;
}

function getFallbackProfile(user: User): ProfileRecord {
  return {
    id: user.id,
    nickname: user.email?.split("@")[0] ?? "Artsband Member",
    full_name: null,
    phone_number: null,
    avatar_url: null,
    primary_instrument: "other",
    secondary_instrument: null,
    bio: null,
    social_links: null,
    student_id: null,
    membership_status: "pending",
    approved_at: null,
    approved_by: null,
    rejection_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("id,user_id,role").eq("user_id", user.id),
  ]);

  const safeProfile = (profile as ProfileRecord | null) ?? getFallbackProfile(user);
  const safeRoles = ((roles as RoleRecord[] | null) ?? []).map((role) => role.role);

  return {
    user,
    profile: safeProfile,
    roles: safeRoles,
    isAdmin: safeRoles.includes("admin"),
  };
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/auth");
  }
  return viewer;
}

export async function requireApprovedViewer() {
  const viewer = await requireViewer();
  if (viewer.profile.membership_status !== "approved") {
    redirect("/pending");
  }
  return viewer;
}

export async function requireAdminViewer() {
  const viewer = await requireApprovedViewer();
  if (!viewer.isAdmin) {
    redirect("/dashboard");
  }
  return viewer;
}

export function isBlockedMembership(status: MembershipStatus) {
  return status === "pending" || status === "rejected" || status === "suspended";
}

export function getMembershipCopy(status: MembershipStatus) {
  if (status === "rejected") {
    return {
      title: "Membership review needed",
      description: "Your registration was reviewed, but it still needs follow-up from the club admins before you can access the member platform.",
    };
  }

  if (status === "suspended") {
    return {
      title: "Membership temporarily paused",
      description: "Your account is currently suspended. Please contact the club admins if you think this is a mistake.",
    };
  }

  return {
    title: "Waiting for club approval",
    description: "Your Artsband account exists, but a club admin still needs to approve your membership before the full platform opens.",
  };
}
