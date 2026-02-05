"use client";

import React, { useEffect, useState } from "react";
import { Copy, Play, Sparkles, FileText, RefreshCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type TrustedSqlBlockProps = {
  sql: string;
  explanation?: string;
  onRun: (sql: string) => void;
  onRegenerate?: (sql: string) => Promise<string | null>;
  onExplain?: (sql: string) => Promise<string | null>;
};

export function TrustedSqlBlock({ sql, explanation, onRun, onRegenerate, onExplain }: TrustedSqlBlockProps) {
  const [showExplain, setShowExplain] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(sql);
  const [localExplanation, setLocalExplanation] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(sql);
    }
  }, [sql, isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      // ignore
    }
  };

  const handleRun = () => {
    onRun(draft);
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    const nextSql = await onRegenerate(draft);
    if (nextSql) {
      setDraft(nextSql);
    }
  };

  const handleExplain = async () => {
    if (!onExplain) {
      setShowExplain((prev) => !prev);
      return;
    }
    const nextExplanation = await onExplain(draft);
    if (nextExplanation) {
      setLocalExplanation(nextExplanation);
      setShowExplain(true);
    }
  };

  const explanationText = localExplanation ?? explanation ?? "";

  return (
    <div className="panel-surface">
      <div className="panel-header">
        <span className="panel-title">Trusted SQL</span>
        <div className="flex items-center gap-2">
          <button className="button-secondary" onClick={handleCopy}>
            <Copy className="h-3 w-3" />
            Copy
          </button>
          <button className="button-secondary" onClick={() => setIsEditing((prev) => !prev)}>
            <FileText className="h-3 w-3" />
            {isEditing ? "Lock" : "Edit"}
          </button>
          <button className="button-secondary" onClick={handleRun}>
            <Play className="h-3 w-3" />
            Run
          </button>
          {onRegenerate && (
            <button className="button-secondary" onClick={handleRegenerate}>
              <RefreshCcw className="h-3 w-3" />
              Regenerate
            </button>
          )}
          <button
            className={cn("button-secondary", showExplain && "border-indigo-500/70 text-indigo-300")}
            onClick={handleExplain}
          >
            <Sparkles className="h-3 w-3" />
            Explain
          </button>
        </div>
      </div>
      <div className="panel-body space-y-3">
        <div className="h-48 overflow-hidden rounded-md border border-border">
          <MonacoEditor
            theme="vs-dark"
            defaultLanguage="sql"
            value={draft}
            onChange={(value) => setDraft(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              scrollBeyondLastLine: false,
              padding: { top: 8, bottom: 8 },
              readOnly: !isEditing,
            }}
          />
        </div>
        {showExplain && explanationText && (
          <div className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {explanationText}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
