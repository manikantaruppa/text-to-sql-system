"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Shield } from "lucide-react";

type LlmHealth = {
  primary: { status: string; message: string };
  fallback: { status: string; message: string };
};

export function LlmStatusBadge() {
  const [health, setHealth] = useState<LlmHealth | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/llm/health", { cache: "no-store" });
        const data = (await res.json()) as LlmHealth;
        setHealth(data);
      } catch {
        setHealth(null);
      }
    };

    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const primaryOk = health?.primary?.status === "ok";
  const fallbackOk = health?.fallback?.status === "ok";

  return (
    <div className="chip">
      {primaryOk ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
      ) : (
        <AlertTriangle className="h-3 w-3 text-amber-400" />
      )}
      <span>LLM: {primaryOk ? "Primary" : fallbackOk ? "Fallback" : "Offline"}</span>
      {fallbackOk && !primaryOk && <Shield className="h-3 w-3 text-indigo-300" />}
    </div>
  );
}
