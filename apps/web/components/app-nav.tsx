"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Clock, LayoutDashboard, Music2, ShieldCheck, UserRound, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/songs", label: "Song Hub", icon: Music2 },
  { href: "/availability", label: "Availability", icon: Clock },
  { href: "/members", label: "Members", icon: Users },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? "";
  const links = isAdmin
    ? [...baseLinks, { href: "/admin/members", label: "Admin", icon: ShieldCheck }]
    : baseLinks;

  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link href="/dashboard" className="mr-2 flex items-center gap-2 text-primary">
        <span className="rounded-full bg-primary/10 p-2">
          <Calendar className="h-4 w-4" />
        </span>
        <span className="font-script text-3xl">Artsband</span>
      </Link>
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-white text-foreground hover:bg-secondary",
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
