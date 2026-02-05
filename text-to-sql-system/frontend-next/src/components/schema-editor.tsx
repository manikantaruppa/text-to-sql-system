"use client";

import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  fetchAnnotations,
  fetchSchema,
  saveAnnotations,
  SchemaAnnotation,
  SchemaAlias,
  SchemaMetric,
} from "@/lib/api";
import { useDataContext } from "@/components/data-provider";
import { toast } from "sonner";

const typeOptions = ["String", "Number", "Date", "Boolean"] as const;

export function SchemaEditor() {
  const { currentTable } = useDataContext();
  const [schema, setSchema] = useState<SchemaAnnotation[]>([]);
  const [aliases, setAliases] = useState<SchemaAlias[]>([]);
  const [metrics, setMetrics] = useState<SchemaMetric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSchema = async () => {
      if (!currentTable) return;
      setLoading(true);
      try {
        const columns = await fetchSchema(currentTable);
        const annotations = await fetchAnnotations(currentTable);
        const annotationMap = new Map(annotations.columns.map((a) => [a.name, a]));
        const merged = columns.map((col) => {
          const existing = annotationMap.get(col.name);
          return {
            name: col.name,
            type: existing?.type || col.type || "String",
            description: existing?.description || "",
          };
        });
        setSchema(merged);
        setAliases(annotations.aliases || []);
        setMetrics(annotations.metrics || []);
      } catch (err) {
        toast.error("Failed to load schema", { description: (err as Error).message });
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, [currentTable]);

  const updateSchema = (index: number, key: "type" | "description", value: string) => {
    setSchema((prev) => prev.map((field, idx) => (idx === index ? { ...field, [key]: value } : field)));
  };

  const updateAlias = (index: number, key: "alias" | "column", value: string) => {
    setAliases((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
  };

  const updateMetric = (index: number, key: "name" | "sql" | "description", value: string) => {
    setMetrics((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
  };

  const handleSave = async () => {
    if (!currentTable) return;
    setLoading(true);
    try {
      await saveAnnotations(currentTable, { columns: schema, aliases, metrics });
      toast.success("Schema saved.");
    } catch (err) {
      toast.error("Failed to save schema", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-surface">
      <div className="panel-header">
        <span className="panel-title">Data Dictionary</span>
        <button className="button-primary" onClick={handleSave} disabled={loading}>
          <Save className="h-3 w-3" />
          Save Schema
        </button>
      </div>
      <div className="panel-body">
        <div className="data-grid overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-zinc-400">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left">Field Name</th>
                <th className="px-2 py-2 text-left">Data Type</th>
                <th className="px-2 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {schema.map((field, index) => (
                <tr key={field.name} className="border-b border-border">
                  <td className="px-2 py-2 text-zinc-200">{field.name}</td>
                  <td className="px-2 py-2">
                    <select
                      value={field.type}
                      onChange={(event) => updateSchema(index, "type", event.target.value)}
                      className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
                    >
                      {typeOptions.map((type) => (
                        <option key={type} value={type} className="bg-surface text-zinc-200">
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={field.description}
                      onChange={(event) => updateSchema(index, "description", event.target.value)}
                      className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
                    />
                  </td>
                </tr>
              ))}
              {!schema.length && (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-zinc-500">
                    {currentTable ? "No schema found." : "Select a dataset to view schema."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-6 space-y-4">
          <div className="text-xs font-semibold uppercase text-zinc-400">Column Aliases</div>
          <div className="space-y-2">
            {aliases.map((alias, index) => (
              <div key={`${alias.alias}-${index}`} className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Alias (e.g. revenue)"
                  value={alias.alias}
                  onChange={(event) => updateAlias(index, "alias", event.target.value)}
                  className="rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
                />
                <input
                  placeholder="Column (e.g. total_revenue)"
                  value={alias.column}
                  onChange={(event) => updateAlias(index, "column", event.target.value)}
                  className="rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
                />
              </div>
            ))}
            {!aliases.length && (
              <div className="text-xs text-zinc-500">No aliases yet.</div>
            )}
            <button
              className="button-secondary"
              onClick={() => setAliases((prev) => [...prev, { alias: "", column: "" }])}
              disabled={loading}
            >
              Add alias
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="text-xs font-semibold uppercase text-zinc-400">Metrics</div>
          <div className="space-y-2">
            {metrics.map((metric, index) => (
              <div key={`${metric.name}-${index}`} className="space-y-2">
                <input
                  placeholder="Metric name (e.g. active_users)"
                  value={metric.name}
                  onChange={(event) => updateMetric(index, "name", event.target.value)}
                  className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
                />
                <input
                  placeholder="SQL definition (e.g. COUNT(DISTINCT user_id))"
                  value={metric.sql}
                  onChange={(event) => updateMetric(index, "sql", event.target.value)}
                  className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
                />
                <input
                  placeholder="Description (optional)"
                  value={metric.description || ""}
                  onChange={(event) => updateMetric(index, "description", event.target.value)}
                  className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
                />
              </div>
            ))}
            {!metrics.length && (
              <div className="text-xs text-zinc-500">No metrics yet.</div>
            )}
            <button
              className="button-secondary"
              onClick={() => setMetrics((prev) => [...prev, { name: "", sql: "", description: "" }])}
              disabled={loading}
            >
              Add metric
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
