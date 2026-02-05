"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchDashboardPins,
  fetchHistory,
  fetchTables,
  fixQuery,
  pinDashboard,
  processQuery,
  QueryResponse,
  regenerateSql,
  renameTable,
  runSqlQuery,
  explainSql,
  uploadFile,
  UploadResponse,
} from "@/lib/api";
import { toast } from "sonner";

export type HistoryState = {
  id: number;
  table_name: string;
  natural_query: string;
  sql_query: string;
  status: string;
  error?: string | null;
  created_at: string;
};

export type PinState = {
  id: number;
  table_name: string;
  natural_query: string;
  sql_query: string;
  visualization_type: string;
  created_at: string;
};

type UploadInfo = {
  tableName: string;
  columnCount: number;
};

type DataContextValue = {
  tables: string[];
  currentTable: string;
  setCurrentTable: (table: string) => void;
  loading: boolean;
  error: string | null;
  lastQuery: string;
  lastError: string | null;
  queryResult: QueryResponse | null;
  clarification: { baseQuery: string; questions: string[] } | null;
  history: HistoryState[];
  pins: PinState[];
  uploadInfo: UploadInfo | null;
  refreshTables: () => Promise<void>;
  runQuery: (query: string) => Promise<void>;
  runSql: (sql: string) => Promise<void>;
  regenerateSql: (sql: string) => Promise<string | null>;
  explainSql: (sql: string) => Promise<string | null>;
  retryFix: () => Promise<void>;
  uploadDataset: (file: File, tableName: string) => Promise<void>;
  renameDataset: (newName: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshPins: () => Promise<void>;
  pinCurrentResult: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [tables, setTables] = useState<string[]>([]);
  const [currentTable, setCurrentTable] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSqlError, setLastSqlError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<{ baseQuery: string; questions: string[] } | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [pins, setPins] = useState<PinState[]>([]);
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null);

  const refreshTables = async () => {
    try {
      const data = await fetchTables();
      setTables(data);
      if (!currentTable && data.length) {
        setCurrentTable(data[0]);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const refreshHistory = async () => {
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const refreshPins = async () => {
    try {
      const data = await fetchDashboardPins();
      setPins(data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    refreshTables();
    refreshHistory();
    refreshPins();
  }, []);

  const runQuery = async (query: string) => {
    if (!currentTable) {
      toast.error("Select a dataset first.");
      return;
    }
    setLoading(true);
    setError(null);
    setLastQuery(query);
    setLastError(null);
    try {
      const result = await processQuery(query, currentTable);
      if (result.status === "clarify") {
        setClarification({ baseQuery: query, questions: result.clarification_questions || [] });
        setQueryResult(result);
        toast.message("Need clarification to proceed.");
        refreshHistory();
        return;
      }
      setClarification(null);
      setQueryResult(result);
      toast.success("Query executed.");
      refreshHistory();
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      setLastError(message);
      toast.error("Query failed", { description: message });
      refreshHistory();
    } finally {
      setLoading(false);
    }
  };

  const runSql = async (sql: string) => {
    if (!currentTable) {
      toast.error("Select a dataset first.");
      return;
    }
    setLoading(true);
    setError(null);
    setLastSqlError(null);
    try {
      const result = await runSqlQuery(currentTable, sql);
      setQueryResult(result);
      toast.success("SQL executed.");
      refreshHistory();
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      setLastSqlError(message);
      toast.error("SQL failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const regenerateSqlQuery = async (sql: string) => {
    if (!currentTable) {
      toast.error("Select a dataset first.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const resultSample = lastSqlError ? [] : (queryResult?.data?.slice(0, 5) || []);
      const result = await regenerateSql({
        table_name: currentTable,
        natural_query: lastQuery || undefined,
        current_sql: sql,
        error: lastSqlError,
        result_sample: resultSample,
      });
      const nextSql = result.sql_query;
      setQueryResult((prev) =>
        prev
          ? { ...prev, sql_query: nextSql }
          : {
              natural_language_response: "",
              sql_query: nextSql,
              data: [],
              explanation: "",
              visualization_type: "table",
            }
      );
      toast.success("SQL regenerated.");
      return nextSql;
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error("Regenerate failed", { description: message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const explainSqlQuery = async (sql: string) => {
    if (!currentTable) {
      toast.error("Select a dataset first.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await explainSql({
        table_name: currentTable,
        sql_query: sql,
        natural_query: lastQuery || undefined,
        result_sample: queryResult?.data?.slice(0, 5) || [],
      });
      const explanation = result.explanation;
      setQueryResult((prev) =>
        prev
          ? { ...prev, explanation }
          : {
              natural_language_response: "",
              sql_query: sql,
              data: [],
              explanation,
              visualization_type: "table",
            }
      );
      toast.success("SQL explained.");
      return explanation;
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error("Explain failed", { description: message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const retryFix = async () => {
    if (!lastQuery || !lastError || !currentTable) return;
    setLoading(true);
    try {
      const fix = await fixQuery({ table_name: currentTable, natural_query: lastQuery, error: lastError });
      if (fix.fixed_query) {
        const result = await runSqlQuery(currentTable, fix.fixed_query);
        setQueryResult(result);
        toast.success("Applied fix and reran query.");
        setLastError(null);
        setLastSqlError(null);
        refreshHistory();
      } else {
        toast.error("No fix generated.");
      }
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      setLastError(message);
      toast.error("Fix failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const uploadDataset = async (file: File, tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: UploadResponse = await uploadFile(file, tableName);
      const columnCount = response.schema?.columns?.length || 0;
      setUploadInfo({ tableName: response.table_name || tableName, columnCount });
      toast.success("Dataset uploaded.");
      await refreshTables();
      setCurrentTable(response.table_name || tableName);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error("Upload failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const renameDataset = async (newName: string) => {
    if (!currentTable) return;
    setLoading(true);
    try {
      const result = await renameTable({ old_name: currentTable, new_name: newName });
      setCurrentTable(result.table_name);
      setUploadInfo((prev) => (prev ? { ...prev, tableName: result.table_name } : prev));
      toast.success("Dataset renamed.");
      refreshTables();
    } catch (err) {
      toast.error("Rename failed", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const pinCurrentResult = async () => {
    if (!queryResult || !currentTable) {
      toast.error("No result to pin yet.");
      return;
    }
    await pinDashboard({
      table_name: currentTable,
      natural_query: lastQuery || queryResult.natural_language_response,
      sql_query: queryResult.sql_query,
      visualization_type: queryResult.visualization_type,
    });
    toast.success("Pinned to dashboard.");
    refreshPins();
  };

  const value = useMemo(
    () => ({
      tables,
      currentTable,
      setCurrentTable,
      loading,
      error,
      lastQuery,
      lastError,
      queryResult,
      clarification,
      history,
      pins,
      uploadInfo,
      refreshTables,
      runQuery,
      runSql,
      regenerateSql: regenerateSqlQuery,
      explainSql: explainSqlQuery,
      retryFix,
      uploadDataset,
      renameDataset,
      refreshHistory,
      refreshPins,
      pinCurrentResult,
    }),
    [tables, currentTable, loading, error, lastQuery, lastError, queryResult, history, pins, uploadInfo, lastSqlError, clarification]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useDataContext must be used within DataProvider");
  }
  return ctx;
}
