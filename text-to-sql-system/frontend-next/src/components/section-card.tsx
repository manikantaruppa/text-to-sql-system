import React from "react";

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel-surface">
      <div className="panel-header">
        <span className="panel-title">{title}</span>
      </div>
      <div className="panel-body text-sm text-zinc-300">{children}</div>
    </div>
  );
}
