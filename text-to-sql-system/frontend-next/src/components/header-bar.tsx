"use client";

import React from "react";

type HeaderBarProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export function HeaderBar({ left, right }: HeaderBarProps) {
  return (
    <header className="border-b border-border bg-surfaceSubtle/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">{left}</div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
