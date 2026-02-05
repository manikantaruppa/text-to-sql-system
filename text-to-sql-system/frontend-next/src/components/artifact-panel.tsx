"use client";

import React, { useState } from "react";
import { SmartChartCard } from "@/components/smart-chart-card";
import { TrustedSqlBlock } from "@/components/trusted-sql-block";
import { SchemaEditor } from "@/components/schema-editor";
import { Table, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataContext } from "@/components/data-provider";
import { drilldownQuery } from "@/lib/api";
import { toast } from "sonner";

const tabs = ["Artifact", "SQL", "Schema"] as const;

type Tab = (typeof tabs)[number];

export function ArtifactPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("Artifact");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drillData, setDrillData] = useState<Array<Record<string, string | number | null>>>([]);
  const { queryResult, currentTable, pinCurrentResult, runSql, regenerateSql, explainSql, lastQuery } = useDataContext();

  const data = queryResult?.data ?? [];
  const query = lastQuery || "Awaiting query";
  const insight = queryResult?.natural_language_response ?? "";
  const sql = queryResult?.sql_query ?? "-- SQL will appear after a query is run.";
  const explanation = queryResult?.explanation ?? "";

  const handleDrilldown = async () => {
    if (!currentTable || !queryResult?.sql_query) {
      toast.error("Run a query first.");
      return;
    }
    try {
      const response = await drilldownQuery({ table_name: currentTable, sql_query: queryResult.sql_query });
      setDrillData(response.data || []);
      setDrawerOpen(true);
    } catch (err) {
      toast.error("Drilldown failed", { description: (err as Error).message });
    }
  };

  return (
    <div className="panel-surface h-full flex flex-col">
      <div className="panel-header">
        <span className="panel-title">Active Artifact</span>
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                activeTab === tab
                  ? "border-indigo-500/70 text-indigo-200"
                  : "border-border text-zinc-400"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-body flex-1 overflow-auto space-y-4">
        {activeTab === "Artifact" && (
          <div className="space-y-3">
            <SmartChartCard
              data={data.length ? data : [{ status: "No data yet", value: 0 }]}
              query={query}
              sql={sql}
              title="Question"
              insight={insight}
              onPin={pinCurrentResult}
              onExplain={() => explainSql(sql)}
              explanation={explanation}
            />
            <button
              className="button-secondary w-full justify-center"
              onClick={handleDrilldown}
            >
              <Table className="h-3 w-3" />
              Drill-down rows
            </button>
          </div>
        )}

        {activeTab === "SQL" && (
          <TrustedSqlBlock
            sql={sql}
            explanation={explanation}
            onRun={(nextSql) => runSql(nextSql)}
            onRegenerate={(nextSql) => regenerateSql(nextSql)}
            onExplain={(nextSql) => explainSql(nextSql)}
          />
        )}
        {activeTab === "Schema" && <SchemaEditor />}
      </div>

      {drawerOpen && (
        <div className="absolute right-0 top-0 h-full w-full bg-black/40">
          <div className="absolute right-0 top-0 h-full w-[420px] border-l border-border bg-surface p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="text-sm font-semibold text-zinc-200">Drill-down</div>
              <button className="button-secondary" onClick={() => setDrawerOpen(false)}>
                <X className="h-3 w-3" />
                Close
              </button>
            </div>
            <div className="mt-4 data-grid overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="text-zinc-400">
                  <tr className="border-b border-border">
                    {(drillData[0] ? Object.keys(drillData[0]) : ["no data"]).map((key) => (
                      <th key={key} className="px-2 py-2 text-left">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillData.map((row, index) => (
                    <tr key={index} className="border-b border-border">
                      {Object.values(row).map((value, idx) => (
                        <td key={`${index}-${idx}`} className="px-2 py-2 text-zinc-200">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!drillData.length && (
                    <tr>
                      <td className="px-2 py-3 text-zinc-500">No drilldown data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
