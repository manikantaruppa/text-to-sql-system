"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Filter,
  Layers,
  Link2,
  ListOrdered,
  Pin,
  Sigma,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

type SmartChartCardProps = {
  data: Array<Record<string, string | number | null>>;
  query: string;
  sql: string;
  title?: string;
  insight?: string;
  onPin?: () => void;
  onExplain?: () => void;
  explanation?: string;
};

function isDateLike(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function inferChartType(data: Array<Record<string, string | number | null>>) {
  if (!data.length) return "table";
  const keys = Object.keys(data[0]);
  if (keys.length <= 1) return "table";
  const firstKey = keys[0];
  if (data.every((row) => isDateLike(row[firstKey]))) {
    return "area";
  }
  return "bar";
}

const normalizePlainText = (input: string) => {
  let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ""));
  text = text.replace(/<\s*br\s*\/?>/gi, "\n");
  text = text.replace(/<\/\s*p\s*>/gi, "\n");
  text = text.replace(/<\s*li\s*>/gi, "\n- ");
  text = text.replace(/<\/\s*li\s*>/gi, "");
  text = text.replace(/<[^>]+>/g, "");
  text = text
    .split("\n")
    .map((line) => line.replace(/^[\u200B\uFEFF]+/, "").trim())
    .filter(Boolean)
    .join("\n");
  text = text.replace(/^#+\s*/gm, "");
  text = text.replace(/\$\\text\{([^}]*)\}\$/g, "$1");
  text = text.replace(/\$/g, "");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  return text.trim();
};

export function SmartChartCard({ data, query, sql, title, insight, onPin, onExplain, explanation }: SmartChartCardProps) {
  const [showSql, setShowSql] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainExpanded, setExplainExpanded] = useState(true);

  const handleExplain = async () => {
    if (explanation) {
      setShowExplanation((prev) => !prev);
      return;
    }
    if (onExplain) {
      setIsExplaining(true);
      await onExplain();
      setIsExplaining(false);
      setShowExplanation(true);
    }
  };

  const chartType = useMemo(() => inferChartType(data), [data]);
  const keys = data.length ? Object.keys(data[0]) : [];
  const categoryKey = keys[0];
  const valueKeys = keys.slice(1);
  const rowCount = data.length;
  const colCount = keys.length;
  const hasRealData = rowCount > 0 && !(rowCount === 1 && data[0]?.status === "No data yet");
  const isLongQuestion = query.length > 90;

  const shouldTable = data.length > 20 && keys.length > 3;

  const normalizedExplanation = useMemo(() => (explanation ? normalizePlainText(explanation) : ""), [explanation]);
  const normalizedInsight = useMemo(() => (insight ? normalizePlainText(insight) : ""), [insight]);

  const parsedExplanation = useMemo(() => {
    if (!normalizedExplanation) return { steps: [], summary: "" };
    const lines = normalizedExplanation.split("\n").map((line) => line.trim());
    let summary = "";
    const summaryIndex = lines.findIndex((line) => /^summary\b/i.test(line));
    if (summaryIndex >= 0) {
      summary = lines.slice(summaryIndex + 1).join(" ").replace(/^[-*]\s+/, "").trim();
    }
    const stepLines = lines.filter((line) => /^\d+\.\s+/.test(line) || /^[-*]\s+/.test(line));
    let steps = stepLines.map((line) => line.replace(/^\d+\.\s+/, "").replace(/^[-*]\s+/, "").trim());
    if (!steps.length && lines.length) {
      const flat = lines.join(" ");
      steps = flat
        .split(/(?<=\.)\s+/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .slice(0, 6);
    }
    if (!summary && lines.length) {
      summary = lines[lines.length - 1];
    }
    return { steps, summary };
  }, [normalizedExplanation]);

  const renderInline = (text: string) => {
    const parts = text.split(/`([^`]+)`/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <code key={`${part}-${index}`} className="inline-code">
            {part}
          </code>
        );
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  const getStepIcon = (step: string) => {
    const lower = step.toLowerCase();
    if (/(filter|where|null)/.test(lower)) return Filter;
    if (/(group|group by|bucket)/.test(lower)) return Layers;
    if (/(sum|avg|average|count|aggregate|metric)/.test(lower)) return Sigma;
    if (/(join|merge)/.test(lower)) return Link2;
    if (/(order|sort|rank)/.test(lower)) return ArrowDownWideNarrow;
    if (/(limit|top|first|last)/.test(lower)) return ListOrdered;
    return Sparkles;
  };

  const handlePin = () => {
    setPinned(true);
    onPin?.();
  };

  return (
    <div className="panel-surface">
      <div className="panel-header">
        <div className="flex items-center gap-3 min-w-0">
          <span className="panel-title">{title ?? "Active Artifact"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="button-secondary" onClick={handlePin}>
            <Pin className={cn("h-3 w-3", pinned && "text-emerald-400")} />
            {pinned ? "Pinned" : "Pin"}
          </button>
          <button className="button-secondary" onClick={() => setShowSql((prev) => !prev)}>
            <FileText className="h-3 w-3" />
            {showSql ? "Hide SQL" : "View SQL"}
          </button>
        </div>
      </div>
      <div className="panel-body space-y-3">
        <div className={cn("question-card", isLongQuestion && "question-card--long")}>
          <div className="question-label">Question</div>
          <div className="question-text">{query}</div>
          <div className="question-meta">
            {hasRealData ? (
              <>
                <span className="meta-pill">{rowCount} rows</span>
                <span className="meta-pill">{colCount} cols</span>
              </>
            ) : (
              <span className="meta-pill">Awaiting results</span>
            )}
          </div>
        </div>

        {showSql && (
          <pre className="rounded-md border border-border bg-black/40 p-3 text-xs text-zinc-300 overflow-x-auto">
            {sql}
          </pre>
        )}

        {normalizedInsight && (
          <div className="insight-card">
            <div className="insight-header">Result Summary</div>
            <div className="insight-text">{renderInline(normalizedInsight)}</div>
          </div>
        )}

        <div className="h-72">
          {shouldTable || chartType === "table" ? (
            <div className="data-grid overflow-auto max-h-72 border border-border rounded-md">
              <table className="min-w-full text-xs">
                <thead className="bg-surfaceSubtle text-zinc-400">
                  <tr>
                    {keys.map((key) => (
                      <th key={key} className="px-3 py-2 text-left font-semibold">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={index} className="border-t border-border">
                      {keys.map((key) => (
                        <td key={key} className="px-3 py-2 text-zinc-200">
                          {row[key] as string}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : chartType === "area" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey={categoryKey} stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a" }} />
                {valueKeys.map((key) => (
                  <Area key={key} type="monotone" dataKey={key} stroke="#6366f1" fill="url(#colorArea)" />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey={categoryKey} stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip contentStyle={{ background: "#111113", border: "1px solid #27272a" }} />
                {valueKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={["#34d399", "#f59e0b", "#fb7185", "#60a5fa", "#a78bfa"][index % 5]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Auto-rendered {chartType === "area" ? "time series" : chartType} visualization</span>
          <div className="flex items-center gap-2">
            <button className="button-secondary">
              <Download className="h-3 w-3" />
              Export CSV
            </button>
            <button
              className={cn("button-secondary", showExplanation && "border-indigo-500/70 text-indigo-300")}
              onClick={handleExplain}
              disabled={isExplaining}
            >
              <Wand2 className="h-3 w-3" />
              {isExplaining ? "Explaining..." : "Explain"}
            </button>
          </div>
        </div>

        {showExplanation && explanation && (
          <div className="explain-card">
            <div className="explain-header">
              <span>SQL Explanation</span>
              <div className="explain-actions">
                <button
                  className="explain-action"
                  onClick={() => {
                    if (parsedExplanation.summary) {
                      navigator.clipboard.writeText(parsedExplanation.summary).catch(() => undefined);
                    }
                  }}
                  title="Copy summary"
                >
                  <Copy className="h-3 w-3" />
                  Copy summary
                </button>
                <button
                  className="explain-action"
                  onClick={() => setExplainExpanded((prev) => !prev)}
                  title="Toggle details"
                >
                  {explainExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {explainExpanded ? "Hide details" : "Show details"}
                </button>
                <span className="explain-badge">LLM</span>
              </div>
            </div>
            {parsedExplanation.summary && (
              <div className="explain-summary">
                <span className="explain-summary-label">Summary</span>
                <p>{renderInline(parsedExplanation.summary)}</p>
              </div>
            )}
            {parsedExplanation.steps.length > 0 && (
              <div className={cn("explain-steps", !explainExpanded && "explain-steps--collapsed")}>
                {parsedExplanation.steps.map((step, index) => {
                  const Icon = getStepIcon(step);
                  return (
                    <div key={`${step}-${index}`} className="explain-step">
                      <span className="explain-step-index">{index + 1}</span>
                      <span className="explain-step-icon">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="explain-step-text">{renderInline(step)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {!parsedExplanation.steps.length && normalizedExplanation && (
              <div className={cn("explain-plain", !explainExpanded && "explain-steps--collapsed")}>
                {renderInline(normalizedExplanation)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
