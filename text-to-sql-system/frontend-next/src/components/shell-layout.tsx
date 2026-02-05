"use client";

import React from "react";
import { Sidebar } from "@/components/sidebar";
import { HeaderBar } from "@/components/header-bar";

type ShellLayoutProps = {
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
};

export function ShellLayout({ headerLeft, headerRight, children }: ShellLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <HeaderBar left={headerLeft} right={headerRight} />
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
