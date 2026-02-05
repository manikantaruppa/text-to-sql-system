"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, LayoutGrid, MessageSquareText, Settings, User, ChevronLeft } from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Chat History", icon: MessageSquareText, href: "/history" },
  { label: "Saved Dashboards", icon: LayoutGrid, href: "/dashboards" },
  { label: "Data Sources", icon: Database, href: "/sources" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "h-screen border-r border-border bg-surfaceSubtle/60 backdrop-blur",
        "flex flex-col transition-all",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Link href="/" className={cn("flex items-center gap-2", collapsed && "opacity-0")}>
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-sm font-semibold tracking-wide">NaturalSQL</span>
        </Link>
        <button className="button-secondary" onClick={toggle} aria-label="Toggle sidebar">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex w-full items-center gap-3 rounded-md border px-2 py-2 text-sm transition-colors",
              pathname === item.href
                ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-200"
                : "border-transparent text-zinc-300 hover:border-border hover:bg-surface",
              collapsed && "justify-center"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className={cn(collapsed && "hidden")}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <User className="h-4 w-4 text-zinc-400" />
          </div>
          <div className={cn("text-xs", collapsed && "hidden")}>
            <div className="text-zinc-200 font-semibold">Analyst Pro</div>
            <div className="text-zinc-500">85% tokens used</div>
          </div>
        </div>
        {!collapsed && (
          <div className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-xs text-zinc-400">
            Monthly usage: 17.4k / 20k
          </div>
        )}
      </div>
    </aside>
  );
}
