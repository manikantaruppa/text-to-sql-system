"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { useDataContext } from "@/components/data-provider";

export function ChatPanel() {
  const {
    tables,
    currentTable,
    setCurrentTable,
    runQuery,
    retryFix,
    loading,
    lastError,
    history,
    queryResult,
    lastQuery,
    clarification,
  } = useDataContext();
  const [input, setInput] = useState("");

  const handleSubmit = async () => {
    if (!input.trim()) return;
    if (clarification) {
      const combined = `${clarification.baseQuery}\nClarification: ${input.trim()}`;
      await runQuery(combined);
      setInput("");
      return;
    }
    await runQuery(input.trim());
    setInput("");
  };

  return (
    <div className="panel-surface h-full flex flex-col">
      <div className="panel-header">
        <span className="panel-title">Chat Thread</span>
        <span className="chip">
          <Zap className="h-3 w-3 text-indigo-300" />
          Focus Mode
        </span>
      </div>
      <div className="panel-body flex-1 space-y-4 overflow-auto">
        <div className="space-y-3">
          {history.map((entry) => (
            <div key={entry.id} className="rounded-md border border-border px-3 py-2 text-sm bg-black/20">
              <div className="text-xs uppercase text-zinc-500 mb-1">User</div>
              <div className="text-zinc-200">{entry.natural_query}</div>
              <div className="mt-2 text-xs text-zinc-500">{entry.status}</div>
            </div>
          ))}
          {clarification && (
            <div className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-sm">
              <div className="text-xs uppercase text-indigo-300 mb-1">Assistant</div>
              <div className="text-zinc-200">I need a bit more detail to answer precisely:</div>
              <ul className="mt-2 list-disc pl-5 text-xs text-indigo-100">
                {clarification.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {queryResult && lastQuery && !clarification && (
            <div className="rounded-md border border-border px-3 py-2 text-sm bg-surfaceSubtle">
              <div className="text-xs uppercase text-zinc-500 mb-1">Assistant</div>
              <div className="text-zinc-200">{queryResult.natural_language_response}</div>
            </div>
          )}
          {!history.length && !queryResult && (
            <div className="text-xs text-zinc-500">No chat history yet. Ask a question to begin.</div>
          )}
        </div>

        {loading && (
          <details className="rounded-md border border-border bg-black/20 px-3 py-2" open>
            <summary className="cursor-pointer text-xs font-semibold uppercase text-zinc-400">
              Generating SQL...
            </summary>
            <div className="mt-2 space-y-2 text-xs text-zinc-300">
              <div>Identifying intent and required columns.</div>
              <div>Generating SQL and validating safety rules.</div>
            </div>
          </details>
        )}

        {lastError && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-3 w-3" />
              Self-Heal Recommendation
            </div>
            <p className="mt-2 text-rose-100">{lastError}</p>
            <div className="mt-3 flex items-center gap-2">
              <button className="button-primary" onClick={retryFix} disabled={loading}>
                <CheckCircle2 className="h-3 w-3" />
                Yes, Fix it
              </button>
              <button className="button-secondary">Let me edit</button>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Dataset</span>
          <select
            value={currentTable}
            onChange={(event) => setCurrentTable(event.target.value)}
            className="rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
          >
            {tables.length === 0 && <option value="">No tables</option>}
            {tables.map((table) => (
              <option key={table} value={table} className="bg-surface text-zinc-200">
                {table}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder={clarification ? "Answer the clarification question..." : "Ask a question about your data..."}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !loading) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            className="flex-1 rounded-md border border-border bg-black/30 px-3 py-2 text-sm text-zinc-200"
          />
          <button className="button-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Running..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
