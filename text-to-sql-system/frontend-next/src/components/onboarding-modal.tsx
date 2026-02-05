"use client";

import React, { useRef, useState, useEffect } from "react";
import { UploadCloud, CheckCircle2, PencilLine } from "lucide-react";
import { useDataContext } from "@/components/data-provider";

function sanitizeTableName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^([^a-z_])/, "_$1");
}

export function OnboardingModal() {
  const { uploadDataset, loading, uploadInfo, renameDataset, currentTable } = useDataContext();
  const [tableName, setTableName] = useState("sales_data");
  const [progress, setProgress] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Sync tableName with currentTable when it changes (e.g., after rename or table selection)
  useEffect(() => {
    if (currentTable) {
      setTableName(currentTable);
    }
  }, [currentTable]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const baseName = file.name.split(".")[0] || "dataset";
    const safeName = sanitizeTableName(baseName);
    setTableName(safeName);
    setProgress(20);
    await uploadDataset(file, safeName);
    setProgress(100);
    setTimeout(() => setProgress(0), 1000);
  };

  const handleRename = async () => {
    const safe = sanitizeTableName(tableName);
    setTableName(safe);
    await renameDataset(safe);
    setRenaming(false);
  };

  return (
    <div className="panel-surface">
      <div className="panel-header">
        <span className="panel-title">Smart Onboarding</span>
      </div>
      <div className="panel-body space-y-4">
        <div
          className="rounded-lg border border-dashed border-zinc-700 bg-black/30 px-6 py-8 text-center cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <UploadCloud className="mx-auto h-8 w-8 text-zinc-500" />
          <p className="mt-3 text-sm text-zinc-200">Drag & drop CSV or PDF</p>
          <p className="text-xs text-zinc-500">Pre-flight checks start instantly</p>
          <input
            type="file"
            ref={fileRef}
            onChange={(event) => handleFile(event.target.files?.[0] || null)}
            className="hidden"
          />
        </div>
        <div className="grid gap-2 text-xs text-zinc-400">
          <label className="text-xs text-zinc-500">Target table name</label>
          <input
            value={tableName}
            onChange={(event) => setTableName(sanitizeTableName(event.target.value))}
            className="rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
          />
        </div>
        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex items-center justify-between">
            <span>Parsing progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-md border border-border bg-surfaceSubtle px-3 py-2 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            {uploadInfo
              ? `We detected ${uploadInfo.columnCount} columns. Saved as "${uploadInfo.tableName}".`
              : "Upload a dataset to detect columns and schema."}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button className="button-primary" disabled={loading}>
              {loading ? "Processing" : "Continue"}
            </button>
            <button
              className="button-secondary"
              onClick={() => setRenaming((prev) => !prev)}
            >
              <PencilLine className="h-3 w-3" />
              Rename dataset
            </button>
          </div>
          {renaming && currentTable && (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={tableName}
                onChange={(event) => setTableName(sanitizeTableName(event.target.value))}
                className="flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-xs text-zinc-200"
              />
              <button className="button-primary" onClick={handleRename} disabled={loading}>
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
