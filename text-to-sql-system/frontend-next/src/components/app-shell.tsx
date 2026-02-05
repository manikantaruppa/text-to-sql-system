"use client";

import React, { useState } from "react";
import { CalendarDays, Focus, PanelsTopLeft } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { ArtifactPanel } from "@/components/artifact-panel";
import { OnboardingModal } from "@/components/onboarding-modal";
import { DashboardBoard } from "@/components/dashboard-board";
import { ShellLayout } from "@/components/shell-layout";
import { LlmStatusBadge } from "@/components/llm-status-badge";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

export function AppShell() {
  const [analysisMode, setAnalysisMode] = useState(true);

  return (
    <ShellLayout
      headerLeft={
        <>
          <div className="rounded-md border border-border px-2 py-1 text-xs text-zinc-400">
            Workspace: Q3 Revenue Audit
          </div>
          <div className="chip">
            <Focus className="h-3 w-3 text-indigo-300" />
            {analysisMode ? "Analysis Mode" : "Focus Mode"}
          </div>
          <LlmStatusBadge />
        </>
      }
      headerRight={
        <>
          <button
            className={cn(
              "button-secondary",
              !analysisMode && "border-indigo-500/70 text-indigo-300"
            )}
            onClick={() => setAnalysisMode(false)}
          >
            <PanelsTopLeft className="h-3 w-3" />
            Focus
          </button>
          <button
            className={cn(
              "button-secondary",
              analysisMode && "border-indigo-500/70 text-indigo-300"
            )}
            onClick={() => setAnalysisMode(true)}
          >
            <PanelsTopLeft className="h-3 w-3" />
            Split
          </button>
          <button className="button-secondary">
            <CalendarDays className="h-3 w-3" />
            Q3 2024
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <OnboardingModal />
        <div className="relative h-[640px]">
          {analysisMode ? (
            <PanelGroup direction="horizontal" className="h-full">
              <Panel defaultSize={45} minSize={30} className="pr-2">
                <ChatPanel />
              </Panel>
              <PanelResizeHandle className="w-2 cursor-col-resize bg-border" />
              <Panel defaultSize={55} minSize={35} className="pl-2">
                <ArtifactPanel />
              </Panel>
            </PanelGroup>
          ) : (
            <div className="max-w-3xl mx-auto">
              <ChatPanel />
            </div>
          )}
        </div>
        <DashboardBoard />
      </div>
    </ShellLayout>
  );
}
